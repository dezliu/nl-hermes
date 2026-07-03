import type { RetrieveResult } from '@hermes/contracts';
import { parseFieldDocument } from '@hermes/shared';

export type QueryLibraryField = {
  id: string;
  physicalName: string;
  businessName?: string;
  description?: string;
  dataType?: string;
  tablePhysicalName: string;
  tableBusinessName?: string;
  synonyms?: { synonym: string }[];
};

const TEMPORAL_QUERY_RE =
  /近\d+天|最近|同比|环比|趋势|时间范围|本周|本月|上月|昨天|today|last\s+\d+\s+days/i;

const DATETIME_TYPES = new Set(['date', 'datetime', 'timestamp', 'time', 'year']);

export function hasTemporalQueryIntent(query: string): boolean {
  return TEMPORAL_QUERY_RE.test(query);
}

function buildFieldContent(f: QueryLibraryField): string {
  const synonymText = (f.synonyms ?? []).map((s) => s.synonym).join(' ');
  return [
    f.tablePhysicalName,
    f.tableBusinessName,
    f.physicalName,
    f.businessName,
    f.description,
    f.dataType,
    synonymText,
  ]
    .filter(Boolean)
    .join(' ');
}

function fieldToRetrieveResult(f: QueryLibraryField, score = 0.5): RetrieveResult {
  return {
    id: f.id,
    content: buildFieldContent(f),
    score,
    source: 'rerank',
    matchReason: 'schema_enrichment',
  };
}

export function collectTablesFromSchemaContext(schemaContext: RetrieveResult[]): Set<string> {
  const tables = new Set<string>();
  for (const item of schemaContext) {
    const parsed = parseFieldDocument(item.content);
    if (parsed) tables.add(parsed.table);
  }
  return tables;
}

function extractSqlTables(sql: string): Set<string> {
  const tables = new Set<string>();
  const pattern = /(?:from|join)\s+[`"']?(\w+)[`"']?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    tables.add(match[1]!.toLowerCase());
  }
  return tables;
}

/** 对已命中表补全 query-library 中的全部启用字段。 */
export function enrichSchemaByTables(
  schemaContext: RetrieveResult[],
  libraryFields: QueryLibraryField[],
): RetrieveResult[] {
  const existingIds = new Set(schemaContext.map((i) => i.id));
  const tables = collectTablesFromSchemaContext(schemaContext);
  if (tables.size === 0) return schemaContext;

  const extras: RetrieveResult[] = [];
  for (const f of libraryFields) {
    const table = f.tablePhysicalName.toLowerCase();
    if (!tables.has(table)) continue;
    if (existingIds.has(f.id)) continue;
    extras.push(fieldToRetrieveResult(f));
    existingIds.add(f.id);
  }

  if (extras.length === 0) return schemaContext;
  return [...schemaContext, ...extras].sort((a, b) => b.score - a.score);
}

/** 时间类问题优先补全 datetime/timestamp 字段（如 gmt_create）。 */
export function enrichSchemaForTemporalIntent(
  schemaContext: RetrieveResult[],
  libraryFields: QueryLibraryField[],
): RetrieveResult[] {
  const existingIds = new Set(schemaContext.map((i) => i.id));
  const tables = collectTablesFromSchemaContext(schemaContext);
  if (tables.size === 0) return schemaContext;

  const extras: RetrieveResult[] = [];
  for (const f of libraryFields) {
    const table = f.tablePhysicalName.toLowerCase();
    if (!tables.has(table)) continue;
    const dtype = (f.dataType ?? '').toLowerCase();
    if (!DATETIME_TYPES.has(dtype)) continue;
    if (existingIds.has(f.id)) continue;
    extras.push(fieldToRetrieveResult(f, 0.85));
    existingIds.add(f.id);
  }

  if (extras.length === 0) return schemaContext;
  return [...schemaContext, ...extras].sort((a, b) => b.score - a.score);
}

/** 校验失败时按未知列名 + SQL 表定向补全 schema。 */
export function enrichSchemaForMissingColumns(
  schemaContext: RetrieveResult[],
  unknownColumns: string[],
  libraryFields: QueryLibraryField[],
  sql?: string,
): RetrieveResult[] {
  if (unknownColumns.length === 0) return schemaContext;

  const existingIds = new Set(schemaContext.map((i) => i.id));
  const unknownSet = new Set(unknownColumns.map((c) => c.toLowerCase()));
  const sqlTables = sql ? extractSqlTables(sql) : new Set<string>();
  const contextTables = collectTablesFromSchemaContext(schemaContext);
  const targetTables = sqlTables.size > 0 ? sqlTables : contextTables;

  const extras: RetrieveResult[] = [];
  for (const f of libraryFields) {
    const col = f.physicalName.toLowerCase();
    if (!unknownSet.has(col)) continue;
    if (targetTables.size > 0 && !targetTables.has(f.tablePhysicalName.toLowerCase())) continue;
    if (existingIds.has(f.id)) continue;
    extras.push(fieldToRetrieveResult(f, 0.9));
    existingIds.add(f.id);
  }

  if (extras.length === 0) return schemaContext;
  return [...schemaContext, ...extras].sort((a, b) => b.score - a.score);
}
