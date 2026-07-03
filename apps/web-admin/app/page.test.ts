import { describe, it, expect } from 'vitest';
import { scoreLabel } from '../lib/api';
import { decodePrefill, encodePrefill } from '../lib/prefill';

describe('web-admin api helpers', () => {
  it('maps score labels', () => {
    expect(scoreLabel(0.8)).toBe('高');
    expect(scoreLabel(0.4)).toBe('中');
    expect(scoreLabel(0.1)).toBe('低');
  });
});

describe('template prefill codec', () => {
  it('round-trips candidate prefill payload', () => {
    const payload = {
      name: '销售趋势',
      scenarioDescription: '按月份统计销售额',
      sqlBody: 'SELECT month, sum(amount) FROM sales GROUP BY month',
      sourceCandidateId: 'cand-1',
      chartType: 'line' as const,
      chartConfig: { xField: 'month', yField: 'amount' },
    };
    const encoded = encodePrefill(payload);
    expect(decodePrefill(encoded)).toEqual(payload);
  });
});
