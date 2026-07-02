import type { RetrieveResult } from '@hermes/contracts';

export function mergeRetrieveResults(...sets: RetrieveResult[][]): RetrieveResult[] {
  const map = new Map<string, RetrieveResult>();
  for (const set of sets) {
    for (const item of set) {
      const prev = map.get(item.id);
      if (!prev || item.score > prev.score) map.set(item.id, item);
    }
  }
  return [...map.values()].sort((a, b) => b.score - a.score);
}

export function computeRagScore(schemaContext: RetrieveResult[], businessKnowledge: RetrieveResult[]): number {
  const metaScore = schemaContext[0]?.score ?? 0;
  const bizScore = businessKnowledge[0]?.score ?? 0;
  return metaScore * 0.7 + bizScore * 0.3;
}
