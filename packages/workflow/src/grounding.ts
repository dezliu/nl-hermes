import type { RetrieveResult } from '@hermes/contracts';
import { buildStructuredSchema, schemaHasColumn } from '@hermes/shared';

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null', 'as', 'on', 'join',
  'left', 'right', 'inner', 'outer', 'group', 'by', 'order', 'having', 'limit', 'offset',
  'distinct', 'case', 'when', 'then', 'else', 'end', 'between', 'like', 'asc', 'desc',
  'union', 'all', 'exists', 'true', 'false', 'with', 'over', 'partition', 'row', 'rows',
  'range', 'preceding', 'following', 'current', 'unbounded', 'first', 'last', 'nulls',
  'lag', 'lead', 'ntile', 'rank', 'dense_rank', 'row_number',
  'date', 'datetime', 'timestamp', 'interval', 'day', 'week', 'month', 'year', 'hour', 'minute',
  'second', 'quarter', 'microsecond', 'curdate', 'now', 'date_sub', 'date_add', 'count', 'sum', 'avg', 'min', 'max',
  'cast', 'coalesce', 'ifnull', 'if', 'substring', 'trim', 'upper', 'lower',
]);

/** Neutralize OVER (...) so inner ORDER BY / frame specs are not parsed as top-level clauses. */
function stripOverClauses(sql: string): string {
  const lower = sql.toLowerCase();
  let result = '';
  let i = 0;

  while (i < sql.length) {
    const rest = lower.slice(i);
    const overMatch = rest.match(/\bover\s*\(/);
    if (!overMatch || overMatch.index === undefined) {
      result += sql.slice(i);
      break;
    }

    const overStart = i + overMatch.index;
    result += sql.slice(i, overStart);
    const parenStart = overStart + overMatch[0].length - 1;

    let depth = 0;
    let j = parenStart;
    for (; j < sql.length; j++) {
      const ch = sql[j]!;
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }

    result += 'over(__stripped__)';
    i = j;
  }

  return result;
}

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

function extractSqlTablesAndAliases(sql: string): Map<string, string> {
  const aliasMap = new Map<string, string>();
  const pattern = /(?:from|join)\s+[`"']?(\w+)[`"']?(?:\s+(?:as\s+)?[`"']?(\w+)[`"']?)?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const table = match[1]!.toLowerCase();
    aliasMap.set(table, table);
    if (match[2] && !SQL_KEYWORDS.has(match[2].toLowerCase())) {
      aliasMap.set(match[2].toLowerCase(), table);
    }
  }
  return aliasMap;
}

function extractSqlTables(sql: string): string[] {
  return [...extractSqlTablesAndAliases(sql).values()];
}

/** SELECT 子句中 AS 定义的列别名，允许在 ORDER BY / GROUP BY 中使用。 */
function extractSelectAliases(sql: string): Set<string> {
  const aliases = new Set<string>();
  const stripped = sql.replace(/'[^']*'/g, ' ').replace(/"[^"]*"/g, ' ').replace(/`[^`]*`/g, ' ');
  const selectMatch = stripped.match(/\bselect\b([\s\S]*?)\bfrom\b/i);
  if (!selectMatch) return aliases;

  for (const m of selectMatch[1]!.matchAll(/\bas\s+([a-z_][a-z0-9_]*)\b/gi)) {
    aliases.add(m[1]!.toLowerCase());
  }
  return aliases;
}

type QualifiedRef = { tableOrAlias: string | null; column: string };

function extractQualifiedRefs(sql: string): QualifiedRef[] {
  const withoutOver = stripOverClauses(sql);
  const stripped = withoutOver.replace(/'[^']*'/g, ' ').replace(/"[^"]*"/g, ' ').replace(/`[^`]*`/g, ' ');
  const refs: QualifiedRef[] = [];

  const selectMatch = stripped.match(/\bselect\b([\s\S]*?)\bfrom\b/i);
  if (selectMatch) {
    const selectClause = selectMatch[1]!;
    for (const m of selectClause.matchAll(/\b([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)\b/gi)) {
      refs.push({ tableOrAlias: m[1]!.toLowerCase(), column: m[2]!.toLowerCase() });
    }
  }

  const clausePattern = /\b(where|join|on|group by|order by|having)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = clausePattern.exec(stripped)) !== null) {
    const start = match.index + match[0].length;
    const rest = stripped.slice(start);
    const nextClause = rest.search(/\b(select|from|where|join|on|group by|order by|having|limit)\b/i);
    const segment = nextClause >= 0 ? rest.slice(0, nextClause) : rest;

    for (const m of segment.matchAll(/\b([a-z_][a-z0-9_]*)\s*\.\s*([a-z_][a-z0-9_]*)\b/gi)) {
      refs.push({ tableOrAlias: m[1]!.toLowerCase(), column: m[2]!.toLowerCase() });
    }
    for (const m of segment.matchAll(/\b([a-z_][a-z0-9_]*)\b/gi)) {
      const token = m[1]!.toLowerCase();
      if (!SQL_KEYWORDS.has(token)) {
        refs.push({ tableOrAlias: null, column: token });
      }
    }
  }

  return refs;
}

function resolveTable(
  tableOrAlias: string | null,
  aliasMap: Map<string, string>,
): string | null {
  if (!tableOrAlias) return null;
  return aliasMap.get(tableOrAlias) ?? (aliasMap.has(tableOrAlias) ? tableOrAlias : tableOrAlias);
}

export function checkColumnGrounding(input: {
  sql?: string;
  schemaContext: RetrieveResult[];
}): { ok: boolean; unknownColumns?: string[]; misassignedColumns?: string[] } {
  if (!input.sql?.trim()) return { ok: true };

  const schema = buildStructuredSchema(input.schemaContext);
  const schemaTables = Object.keys(schema);
  if (schemaTables.length === 0) {
    return checkColumnGroundingLegacy(input);
  }

  const aliasMap = extractSqlTablesAndAliases(input.sql);
  const selectAliases = extractSelectAliases(input.sql);
  const refs = extractQualifiedRefs(input.sql);
  const unknown: string[] = [];
  const misassigned: string[] = [];

  for (const ref of refs) {
    const { tableOrAlias, column } = ref;
    if (SQL_KEYWORDS.has(column) || /^\d/.test(column) || selectAliases.has(column)) continue;

    const owners = schemaTables.filter((t) => schemaHasColumn(schema, t, column));
    if (owners.length === 0) {
      if (!collectKnownTokens(input.schemaContext).has(column)) {
        unknown.push(column);
      }
      continue;
    }

    if (tableOrAlias) {
      const resolved = resolveTable(tableOrAlias, aliasMap);
      if (resolved && schema[resolved] && !schemaHasColumn(schema, resolved, column)) {
        misassigned.push(`${resolved}.${column}`);
      } else if (resolved && !schema[resolved] && owners.length > 0 && !owners.includes(resolved)) {
        misassigned.push(`${tableOrAlias}.${column}`);
      }
    }
  }

  const uniqueUnknown = [...new Set(unknown)];
  const uniqueMisassigned = [...new Set(misassigned)];

  if (uniqueMisassigned.length > 0) {
    return { ok: false, misassignedColumns: uniqueMisassigned };
  }
  if (uniqueUnknown.length > 0) {
    return { ok: false, unknownColumns: uniqueUnknown };
  }
  return { ok: true };
}

/** Fallback when schema cannot be parsed from context. */
function checkColumnGroundingLegacy(input: {
  sql?: string;
  schemaContext: RetrieveResult[];
}): { ok: boolean; unknownColumns?: string[] } {
  const known = collectKnownTokens(input.schemaContext);
  if (known.size === 0) return { ok: true };

  const knownTables = collectKnownTables(input.schemaContext);
  const selectAliases = extractSelectAliases(input.sql!);
  const refs = extractQualifiedRefs(input.sql!).map((r) => r.column);
  const unknown = [...new Set(
    refs.filter(
      (col) =>
        !known.has(col) &&
        !knownTables.has(col) &&
        !selectAliases.has(col) &&
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
}): { ok: boolean; unknownTokens?: string[]; unknownColumns?: string[]; misassignedColumns?: string[] } {
  const tableCheck = checkGrounding(input);
  if (!tableCheck.ok) return tableCheck;

  const columnCheck = checkColumnGrounding(input);
  if (!columnCheck.ok) {
    return {
      ok: false,
      unknownColumns: columnCheck.unknownColumns,
      misassignedColumns: columnCheck.misassignedColumns,
    };
  }

  return { ok: true };
}
