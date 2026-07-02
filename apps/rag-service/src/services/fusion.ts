import type { RetrieveResult } from '@hermes/contracts';

export type RankedDoc = {
  id: string;
  content: string;
  score: number;
  sources: Set<string>;
  metadata?: Record<string, unknown>;
};

export function reciprocalRankFusion(
  lists: { name: string; hits: { id: string; content: string; score: number; metadata?: Record<string, unknown> }[] }[],
  k = 60,
): RankedDoc[] {
  const map = new Map<string, RankedDoc>();

  for (const list of lists) {
    list.hits.forEach((hit, rank) => {
      const rrfScore = 1 / (k + rank + 1);
      const existing = map.get(hit.id);
      if (existing) {
        existing.score += rrfScore;
        existing.sources.add(list.name);
      } else {
        map.set(hit.id, {
          id: hit.id,
          content: hit.content,
          score: rrfScore,
          sources: new Set([list.name]),
          metadata: hit.metadata,
        });
      }
    });
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

export function rerankByQuery(query: string, docs: RankedDoc[], topK: number): RetrieveResult[] {
  const qTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
  const scored = docs.map((doc) => {
    const contentTokens = doc.content.toLowerCase().split(/\s+/);
    let overlap = 0;
    for (const t of contentTokens) {
      if (qTokens.has(t)) overlap += 1;
    }
    const lexical = overlap / Math.max(qTokens.size, 1);
    const finalScore = doc.score * 0.7 + lexical * 0.3;
    return { ...doc, score: finalScore };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((d) => ({
      id: d.id,
      content: d.content,
      score: Number(d.score.toFixed(4)),
      matchReason: [...d.sources, 'rerank'].join('+'),
      source: 'rerank' as const,
    }));
}

export function scoreLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.6) return 'high';
  if (score >= 0.35) return 'medium';
  return 'low';
}

export function weightedScore(results: RetrieveResult[]): number {
  if (results.length === 0) return 0;
  const top = results.slice(0, 5);
  const sum = top.reduce((s, r) => s + r.score, 0);
  return Number((sum / top.length).toFixed(4));
}
