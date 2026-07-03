import { describe, it, expect } from 'vitest';
import { DEFAULT_WORKFLOW_LIMITS } from '@hermes/workflow';
import { shouldCreateTemplateCandidate } from './candidate-eligibility.js';

describe('shouldCreateTemplateCandidate', () => {
  const base = {
    ragScore: 0.4,
    minRagScore: DEFAULT_WORKFLOW_LIMITS.minRagScore,
    schemaContext: [] as { id: string; content: string; score: number }[],
    templateMatches: [] as { id: string; name: string; scenarioDescription: string; score: number; type: 'sql' | 'report' }[],
  };

  it('accepts when rag score meets workflow threshold and no template match', () => {
    expect(shouldCreateTemplateCandidate(base)).toBe(true);
  });

  it('accepts lower rag score when schema context exists', () => {
    expect(
      shouldCreateTemplateCandidate({
        ...base,
        ragScore: 0.3,
        schemaContext: [{ id: 't1', content: 'fund_flow', score: 0.3 }],
      }),
    ).toBe(true);
  });

  it('rejects when rag score is below workflow threshold', () => {
    expect(shouldCreateTemplateCandidate({ ...base, ragScore: 0.2 })).toBe(false);
  });

  it('rejects when a similar in-library template was already matched', () => {
    expect(
      shouldCreateTemplateCandidate({
        ...base,
        templateMatches: [
          {
            id: 'tpl-1',
            name: '销售趋势',
            scenarioDescription: '按月统计',
            score: 0.8,
            type: 'sql',
          },
        ],
      }),
    ).toBe(false);
  });
});
