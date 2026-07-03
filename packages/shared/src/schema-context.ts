import type { RetrieveResult } from '@hermes/contracts';

export type SchemaColumnMeta = { type?: string };
export type StructuredSchema = Record<string, Record<string, SchemaColumnMeta>>;

/** MySQL information_schema.COLUMNS DATA_TYPE values (lowercase). */
const MYSQL_DATA_TYPES = new Set([
  'tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint',
  'decimal', 'numeric', 'float', 'double', 'real', 'bit',
  'char', 'varchar', 'binary', 'varbinary',
  'tinyblob', 'blob', 'mediumblob', 'longblob',
  'tinytext', 'text', 'mediumtext', 'longtext',
  'enum', 'set', 'date', 'time', 'datetime', 'timestamp', 'year', 'json',
]);

function extractDataTypeFromTokens(tokens: string[], startIndex: number): string | undefined {
  const limit = Math.min(tokens.length, startIndex + 5);
  for (let i = startIndex; i < limit; i++) {
    const token = tokens[i]!;
    if (MYSQL_DATA_TYPES.has(token)) return token;
  }
  return undefined;
}

/**
 * Parse one RAG field document. Content order matches index-pipeline:
 * tablePhysicalName, tableBusinessName, physicalName, businessName, description, dataType, synonyms.
 */
export function parseFieldDocument(content: string): { table: string; field: string; type?: string } | null {
  const tokens = content.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
  if (tokens.length < 2) return null;

  const table = tokens[0]!;
  const field = tokens[1]!;
  if (table === field) return null;

  return { table, field, type: extractDataTypeFromTokens(tokens, 2) };
}

/** Parse RAG metadata docs into table → column → { type } map. */
export function buildStructuredSchema(schemaContext: RetrieveResult[]): StructuredSchema {
  const result: StructuredSchema = {};

  for (const item of schemaContext) {
    const parsed = parseFieldDocument(item.content);
    if (!parsed) continue;

    if (!result[parsed.table]) result[parsed.table] = {};
    const existing = result[parsed.table]![parsed.field];
    result[parsed.table]![parsed.field] = {
      type: parsed.type ?? existing?.type,
    };
  }

  return result;
}

export function getTableColumnNames(schema: StructuredSchema, table: string): string[] {
  return Object.keys(schema[table] ?? {}).sort();
}

export function schemaHasColumn(schema: StructuredSchema, table: string, column: string): boolean {
  return column in (schema[table] ?? {});
}

export function formatStructuredSchema(schemaContext: RetrieveResult[]): string {
  const schema = buildStructuredSchema(schemaContext);
  if (Object.keys(schema).length === 0) return '（无）';

  const sorted: StructuredSchema = {};
  for (const table of Object.keys(schema).sort()) {
    sorted[table] = {};
    for (const column of Object.keys(schema[table]!).sort()) {
      const meta = schema[table]![column]!;
      sorted[table]![column] = meta.type ? { type: meta.type } : {};
    }
  }

  return JSON.stringify(sorted, null, 2);
}

/** Find which table(s) own a column according to structured schema. */
export function findColumnOwners(schema: StructuredSchema, column: string): string[] {
  const col = column.toLowerCase();
  return Object.entries(schema)
    .filter(([, cols]) => col in cols)
    .map(([table]) => table);
}

/** Build human-readable retry hint when EXPLAIN reports unknown column. */
export function formatUnknownColumnFeedback(
  errorMessage: string,
  schemaContext: RetrieveResult[],
): string {
  const match = errorMessage.match(/Unknown column '([^']+)'/i);
  if (!match) return errorMessage;

  const ref = match[1]!.toLowerCase();
  const dotIdx = ref.indexOf('.');
  const tableRef = dotIdx >= 0 ? ref.slice(0, dotIdx) : null;
  const column = dotIdx >= 0 ? ref.slice(dotIdx + 1) : ref;

  const schema = buildStructuredSchema(schemaContext);
  const owners = findColumnOwners(schema, column);

  if (tableRef && owners.length > 0 && !owners.includes(tableRef)) {
    return `${column} 属于 ${owners.join('、')}，不属于 ${tableRef}；请修正表引用或改用 JOIN`;
  }
  if (!tableRef && owners.length === 1) {
    return `字段 ${column} 属于表 ${owners[0]}，请使用 ${owners[0]}.${column}`;
  }
  if (!tableRef && owners.length > 1) {
    return `字段 ${column} 存在于多张表（${owners.join('、')}），请加上表前缀`;
  }
  return errorMessage;
}
