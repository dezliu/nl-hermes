import { describe, it, expect } from 'vitest';
import { reciprocalRankFusion, rerankByQuery, scoreLevel, weightedScore } from './services/fusion.js';
import { embedText, cosineSimilarity } from './lib/embedding.js';

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
  });

  it('reranks by query overlap', () => {
    const docs = reciprocalRankFusion([
      { name: 'bm25', hits: [{ id: '1', content: 'orders amount region', score: 1 }] },
      { name: 'vector', hits: [{ id: '2', content: 'users profile', score: 0.9 }] },
    ]);
    const reranked = rerankByQuery('orders region', docs, 2);
    expect(reranked[0]?.id).toBe('1');
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
