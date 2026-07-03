import type { RetrieveResult } from '@hermes/contracts';

/** Parse RAG metadata docs (table name first token, field name second significant token) into table→columns map. */
export function buildStructuredSchema(schemaContext: RetrieveResult[]): Record<string, string[]> {
  const tableColumns = new Map<string, Set<string>>();

  for (const item of schemaContext) {
    const tokens = item.content.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
    if (tokens.length < 2) continue;

    const table = tokens[0]!;
    const field = tokens[1]!;
    if (table === field) continue;

    if (!tableColumns.has(table)) tableColumns.set(table, new Set());
    tableColumns.get(table)!.add(field);
  }

  const result: Record<string, string[]> = {};
  for (const [table, cols] of tableColumns) {
    result[table] = [...cols].sort();
  }
  return result;
}

export function formatStructuredSchema(schemaContext: RetrieveResult[]): string {
  const schema = buildStructuredSchema(schemaContext);
  if (Object.keys(schema).length === 0) return '（无）';
  return JSON.stringify(schema, null, 2);
}

/** Find which table(s) own a column according to structured schema. */
export function findColumnOwners(
  schema: Record<string, string[]>,
  column: string,
): string[] {
  const col = column.toLowerCase();
  return Object.entries(schema)
    .filter(([, cols]) => cols.includes(col))
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
