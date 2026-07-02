const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractPlaceholders(sqlBody: string): string[] {
  const found = new Set<string>();
  for (const match of sqlBody.matchAll(PLACEHOLDER_RE)) {
    const key = match[1];
    if (key) found.add(key);
  }
  return [...found];
}

export function fillTemplateParameters(sqlBody: string, parameters: Record<string, string>): string {
  return sqlBody.replace(PLACEHOLDER_RE, (_full, key: string) => {
    const value = parameters[key];
    if (value === undefined || value === '') {
      throw Object.assign(new Error(`缺少模板参数: ${key}`), { code: 'MISSING_TEMPLATE_PARAM', field: key });
    }
    return value;
  });
}

export function validateTemplateParameters(
  placeholders: string[],
  parameters: Record<string, string>,
): { ok: true } | { ok: false; missing: string[] } {
  const missing = placeholders.filter((key) => !parameters[key]?.trim());
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}
