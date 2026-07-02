import type { RetrieveResult } from '@hermes/contracts';

function collectKnownTables(schemaContext: RetrieveResult[]): Set<string> {
  const known = new Set<string>();
  for (const item of schemaContext) {
    const tokens = item.content.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
    for (const t of tokens) {
      if (t.length > 1) known.add(t);
    }
  }
  return known;
}

function extractSqlTables(sql: string): string[] {
  const matches = [...sql.matchAll(/(?:from|join)\s+[`"']?(\w+)[`"']?/gi)];
  return matches.map((m) => m[1]!.toLowerCase());
}

export function checkGrounding(input: {
  sql?: string;
  schemaContext: RetrieveResult[];
  businessKnowledge: RetrieveResult[];
}): { ok: boolean; unknownTokens?: string[] } {
  if (!input.sql?.trim()) return { ok: true };

  const knownTables = collectKnownTables(input.schemaContext);
  if (knownTables.size === 0) return { ok: true };

  const sqlTables = extractSqlTables(input.sql);
  const unknown = sqlTables.filter((t) => !knownTables.has(t));
  if (unknown.length === 0) return { ok: true };

  return { ok: false, unknownTokens: unknown };
}
