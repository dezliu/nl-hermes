import { describe, it, expect } from 'vitest';
import { computeRagScore, isRagScoreAcceptable } from './rag-utils.js';

describe('isRagScoreAcceptable', () => {
  it('accepts score above min threshold', () => {
    expect(isRagScoreAcceptable(0.4, 0.35, [])).toBe(true);
  });

  it('accepts lower score when schema context exists', () => {
    expect(isRagScoreAcceptable(0.3, 0.35, [{ id: '1', content: 'fund_flow', score: 0.3 }])).toBe(true);
  });

  it('rejects low score without schema context', () => {
    expect(isRagScoreAcceptable(0.3, 0.35, [])).toBe(false);
  });
});

describe('computeRagScore', () => {
  it('weights metadata higher than business knowledge', () => {
    const score = computeRagScore(
      [{ id: 'm', content: 'meta', score: 1 }],
      [{ id: 'b', content: 'biz', score: 0 }],
    );
    expect(score).toBeCloseTo(0.7);
  });
});
