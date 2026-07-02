export function extractTableNamesForTest(contents: string[]): string[] {
  const names = new Set<string>();
  for (const content of contents) {
    const physical = content.match(/physical[_\s]?name[:：]\s*([a-z0-9_]+)/i)?.[1];
    const table = content.match(/table[:：]\s*([a-z0-9_]+)/i)?.[1];
    if (physical) names.add(physical.toLowerCase());
    if (table) names.add(table.toLowerCase());
  }
  return [...names];
}

export function matchExpectedPointsForTest(
  expectedPoints: string,
  results: { content: string }[],
  score: number,
): boolean {
  const keywords = expectedPoints.split(/[,，;；\n]/).map((s) => s.trim()).filter(Boolean);
  if (keywords.length === 0) return score >= 0.35;
  const blob = results.map((r) => r.content).join('\n').toLowerCase();
  const hitCount = keywords.filter((k) => blob.includes(k.toLowerCase())).length;
  return hitCount / keywords.length >= 0.5;
}
