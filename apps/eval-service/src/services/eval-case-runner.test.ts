import { describe, it, expect } from 'vitest';
import {
  extractTableNamesForTest,
  matchExpectedPointsForTest,
} from '../services/eval-case-runner.test-utils.js';

describe('eval-case-runner helpers', () => {
  it('extracts table names from retrieval content', () => {
    const names = extractTableNamesForTest(['table: orders', 'physical_name: users']);
    expect(names).toContain('orders');
    expect(names).toContain('users');
  });

  it('matches expected points by keyword coverage', () => {
    const ok = matchExpectedPointsForTest('销售额,区域', [{ content: '华东区域销售额' }], 0.5);
    expect(ok).toBe(true);
    const fail = matchExpectedPointsForTest('库存', [{ content: '华东区域销售额' }], 0.5);
    expect(fail).toBe(false);
  });
});
