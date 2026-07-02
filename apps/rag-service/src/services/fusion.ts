import type { RetrieveResult } from '@hermes/contracts';
import { cosineSimilarity, embedText } from '../lib/embedding.js';

export type RankedDoc = {
  id: string;
  content: string;
  /** RRF rank score — used only for ordering, not exposed as similarity */
  rankScore: number;
  /** Best Qdrant cosine similarity (0–1) when doc appeared in vector hits */
  vectorScore?: number;
  sources: Set<string>;
  metadata?: Record<string, unknown>;
};

export function computeSemanticScore(query: string, content: string, vectorScore?: number): number {
  const semanticScore = cosineSimilarity(embedText(query), embedText(content));
  if (vectorScore !== undefined && vectorScore > 0) {
    return Number((semanticScore * 0.85 + Math.min(vectorScore, 1) * 0.15).toFixed(4));
  }
  return Number(semanticScore.toFixed(4));
}

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
        existing.rankScore += rrfScore;
        existing.sources.add(list.name);
        if (list.name === 'vector') {
          existing.vectorScore = Math.max(existing.vectorScore ?? 0, hit.score);
        }
      } else {
        map.set(hit.id, {
          id: hit.id,
          content: hit.content,
          rankScore: rrfScore,
          vectorScore: list.name === 'vector' ? hit.score : undefined,
          sources: new Set([list.name]),
          metadata: hit.metadata,
        });
      }
    });
  }

  return [...map.values()].sort((a, b) => b.rankScore - a.rankScore);
}

function lexicalOverlap(query: string, content: string): number {
  const qTokens = new Set(query.toLowerCase().split(/\s+/).filter(Boolean));
  if (qTokens.size === 0) return 0;
  const contentTokens = content.toLowerCase().split(/\s+/);
  let overlap = 0;
  for (const t of contentTokens) {
    if (qTokens.has(t)) overlap += 1;
  }
  return overlap / qTokens.size;
}

function toRetrieveResult(
  query: string,
  doc: RankedDoc,
  matchReasonSuffix: string,
  source: RetrieveResult['source'],
): RetrieveResult {
  return {
    id: doc.id,
    content: doc.content,
    score: computeSemanticScore(query, doc.content, doc.vectorScore),
    matchReason: [...doc.sources, matchReasonSuffix].join('+'),
    source,
  };
}

export function rerankByQuery(query: string, docs: RankedDoc[], topK: number): RetrieveResult[] {
  const scored = docs.map((doc) => {
    const lexical = lexicalOverlap(query, doc.content);
    const orderScore = doc.rankScore * 0.7 + lexical * 0.3;
    return { doc, orderScore };
  });
  return scored
    .sort((a, b) => b.orderScore - a.orderScore)
    .slice(0, topK)
    .map(({ doc }) => toRetrieveResult(query, doc, 'rerank', 'rerank'));
}

export function formatRetrieveResults(
  query: string,
  docs: RankedDoc[],
  topK: number,
  matchReasonSuffix: string,
  source: RetrieveResult['source'],
): RetrieveResult[] {
  return docs.slice(0, topK).map((doc) => toRetrieveResult(query, doc, matchReasonSuffix, source));
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
