import { describe, it, expect } from 'vitest';
import type { RetrieveResult } from '@hermes/contracts';
import {
  computeSemanticScore,
  reciprocalRankFusion,
  rerankByQuery,
  formatRetrieveResults,
  scoreLevel,
  weightedScore,
} from './services/fusion.js';
import { embedText, cosineSimilarity } from './lib/embedding.js';

function computeRagScore(schemaContext: RetrieveResult[], businessKnowledge: RetrieveResult[]): number {
  const metaScore = schemaContext[0]?.score ?? 0;
  const bizScore = businessKnowledge[0]?.score ?? 0;
  return metaScore * 0.7 + bizScore * 0.3;
}

describe('embedding', () => {
  it('produces normalized vectors', () => {
    const v = embedText('销售额');
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('scores similar text higher', () => {
    const a = embedText('华东销售额');
    const b = embedText('华东区域销售');
    const c = embedText('完全无关的内容');
    expect(cosineSimilarity(a, b)).toBeGreaterThan(cosineSimilarity(a, c));
  });
});

describe('fusion', () => {
  it('merges ranked lists with RRF', () => {
    const fused = reciprocalRankFusion([
      { name: 'bm25', hits: [{ id: 'a', content: '订单表', score: 1.2 }] },
      { name: 'vector', hits: [{ id: 'a', content: '订单表', score: 0.9 }, { id: 'b', content: '用户表', score: 0.8 }] },
    ]);
    expect(fused[0]?.id).toBe('a');
    expect(fused[0]?.sources.has('bm25')).toBe(true);
    expect(fused[0]?.sources.has('vector')).toBe(true);
    expect(fused[0]?.rankScore).toBeLessThan(0.1);
    expect(fused[0]?.vectorScore).toBe(0.9);
  });

  it('reranks by query overlap', () => {
    const docs = reciprocalRankFusion([
      { name: 'bm25', hits: [{ id: '1', content: 'orders amount region', score: 1 }] },
      { name: 'vector', hits: [{ id: '2', content: 'users profile', score: 0.9 }] },
    ]);
    const reranked = rerankByQuery('orders region', docs, 2);
    expect(reranked[0]?.id).toBe('1');
  });

  it('returns 0-1 semantic score, not RRF rank score', () => {
    const content = 'orders sales amount region east china';
    const fused = reciprocalRankFusion([
      { name: 'bm25', hits: [{ id: '1', content, score: 1.5 }] },
      { name: 'vector', hits: [{ id: '1', content, score: 0.85 }] },
    ]);
    const results = formatRetrieveResults('orders sales region', fused, 1, 'rrf', 'rrf');
    expect(results[0]?.score).toBeGreaterThanOrEqual(0);
    expect(results[0]?.score).toBeLessThanOrEqual(1);
    expect(results[0]?.score).toBeGreaterThan(0.35);
    expect(results[0]?.score).not.toBeCloseTo(fused[0]!.rankScore, 2);
  });

  it('semantic score blends with vector score when available', () => {
    const content = '华东销售额 orders sales';
    const pure = computeSemanticScore('华东销售额', content);
    const blended = computeSemanticScore('华东销售额', content, 0.9);
    expect(blended).toBeGreaterThan(0);
    expect(blended).toBeLessThanOrEqual(1);
    expect(blended).toBeCloseTo(pure * 0.85 + 0.9 * 0.15, 4);
  });

  it('similar query passes workflow quality gate threshold', () => {
    const query = '华东销售额 orders sales';
    const content = '华东销售额 orders sales amount region';
    const fused = reciprocalRankFusion([
      { name: 'vector', hits: [{ id: 'f1', content, score: 0.88 }] },
    ]);
    const metaResults = formatRetrieveResults(query, fused, 1, 'rrf', 'rrf');
    const bizResults = formatRetrieveResults(query, fused, 1, 'rrf', 'rrf');
    const ragScore = computeRagScore(metaResults, bizResults);
    expect(ragScore).toBeGreaterThanOrEqual(0.35);
    expect(scoreLevel(metaResults[0]!.score)).not.toBe('low');
  });

  it('maps score levels', () => {
    expect(scoreLevel(0.7)).toBe('high');
    expect(scoreLevel(0.4)).toBe('medium');
    expect(scoreLevel(0.1)).toBe('low');
  });

  it('computes weighted score', () => {
    expect(weightedScore([{ id: '1', content: 'a', score: 0.8 }])).toBe(0.8);
    expect(weightedScore([])).toBe(0);
  });
});
