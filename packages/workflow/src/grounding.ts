import type { RetrieveResult } from '@hermes/contracts';

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null', 'as', 'on', 'join',
  'left', 'right', 'inner', 'outer', 'group', 'by', 'order', 'having', 'limit', 'offset',
  'distinct', 'case', 'when', 'then', 'else', 'end', 'between', 'like', 'asc', 'desc',
  'union', 'all', 'exists', 'true', 'false', 'with', 'over', 'partition', 'row', 'rows',
  'date', 'datetime', 'timestamp', 'interval', 'day', 'month', 'year', 'hour', 'minute',
  'second', 'curdate', 'now', 'date_sub', 'date_add', 'count', 'sum', 'avg', 'min', 'max',
  'cast', 'coalesce', 'ifnull', 'if', 'substring', 'trim', 'upper', 'lower',
]);

function collectKnownTokens(schemaContext: RetrieveResult[]): Set<string> {
  const known = new Set<string>();
  for (const item of schemaContext) {
    const tokens = item.content.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
    for (const t of tokens) {
      if (t.length > 1) known.add(t);
    }
  }
  return known;
}

function collectKnownTables(schemaContext: RetrieveResult[]): Set<string> {
  const known = new Set<string>();
  for (const item of schemaContext) {
    const first = item.content.toLowerCase().match(/^[a-z_][a-z0-9_]*/);
    if (first) known.add(first[0]);
  }
  return known;
}

function extractSqlTables(sql: string): string[] {
  const matches = [...sql.matchAll(/(?:from|join)\s+[`"']?(\w+)[`"']?/gi)];
  return matches.map((m) => m[1]!.toLowerCase());
}

function extractSqlColumnRefs(sql: string): string[] {
  const stripped = sql.replace(/'[^']*'/g, ' ').replace(/"[^"]*"/g, ' ').replace(/`[^`]*`/g, ' ');
  const segments: string[] = [];
  const clausePattern = /\b(where|join|group by|order by|having)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = clausePattern.exec(stripped)) !== null) {
    const start = match.index + match[0].length;
    const rest = stripped.slice(start);
    const nextClause = rest.search(/\b(select|from|where|join|group by|order by|having|limit)\b/i);
    segments.push(nextClause >= 0 ? rest.slice(0, nextClause) : rest);
  }

  const refs: string[] = [];
  for (const segment of segments) {
    for (const m of segment.matchAll(/\b([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)\b/gi)) {
      refs.push(m[2]!.toLowerCase());
    }
    for (const m of segment.matchAll(/\b([a-z_][a-z0-9_]*)\b/gi)) {
      refs.push(m[1]!.toLowerCase());
    }
  }
  return refs;
}

export function checkColumnGrounding(input: {
  sql?: string;
  schemaContext: RetrieveResult[];
}): { ok: boolean; unknownColumns?: string[] } {
  if (!input.sql?.trim()) return { ok: true };

  const known = collectKnownTokens(input.schemaContext);
  if (known.size === 0) return { ok: true };

  const knownTables = collectKnownTables(input.schemaContext);
  const refs = extractSqlColumnRefs(input.sql);
  const unknown = [...new Set(
    refs.filter(
      (col) =>
        !known.has(col) &&
        !knownTables.has(col) &&
        !SQL_KEYWORDS.has(col) &&
        !/^\d/.test(col),
    ),
  )];

  if (unknown.length === 0) return { ok: true };
  return { ok: false, unknownColumns: unknown };
}

export function checkGrounding(input: {
  sql?: string;
  schemaContext: RetrieveResult[];
  businessKnowledge: RetrieveResult[];
}): { ok: boolean; unknownTokens?: string[] } {
  if (!input.sql?.trim()) return { ok: true };

  const knownTables = collectKnownTokens(input.schemaContext);
  if (knownTables.size === 0) return { ok: true };

  const sqlTables = extractSqlTables(input.sql);
  const unknown = sqlTables.filter((t) => !knownTables.has(t));
  if (unknown.length === 0) return { ok: true };

  return { ok: false, unknownTokens: unknown };
}

export function checkSqlGrounding(input: {
  sql?: string;
  schemaContext: RetrieveResult[];
  businessKnowledge: RetrieveResult[];
}): { ok: boolean; unknownTokens?: string[]; unknownColumns?: string[] } {
  const tableCheck = checkGrounding(input);
  if (!tableCheck.ok) return tableCheck;

  const columnCheck = checkColumnGrounding(input);
  if (!columnCheck.ok) {
    return { ok: false, unknownColumns: columnCheck.unknownColumns };
  }

  return { ok: true };
}
