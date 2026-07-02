import { describe, it, expect } from 'vitest';
import { checkColumnGrounding, checkGrounding, checkSqlGrounding } from './grounding.js';

const fundFlowSchema = [
  {
    id: '1',
    content: 'fund_flow 跨系统资金流水 business_id amount gmt_create datetime 创建时间',
    score: 0.9,
  },
];

describe('checkColumnGrounding', () => {
  it('flags unknown columns like trade_date', () => {
    const result = checkColumnGrounding({
      sql: 'SELECT * FROM fund_flow WHERE trade_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
      schemaContext: fundFlowSchema,
    });
    expect(result.ok).toBe(false);
    expect(result.unknownColumns).toContain('trade_date');
  });

  it('accepts gmt_create from schema context', () => {
    const result = checkColumnGrounding({
      sql: 'SELECT business_id, gmt_create FROM fund_flow WHERE gmt_create >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)',
      schemaContext: fundFlowSchema,
    });
    expect(result.ok).toBe(true);
  });
});

describe('checkGrounding', () => {
  it('flags unknown tables', () => {
    const result = checkGrounding({
      sql: 'SELECT * FROM unknown_table',
      schemaContext: fundFlowSchema,
      businessKnowledge: [],
    });
    expect(result.ok).toBe(false);
    expect(result.unknownTokens).toContain('unknown_table');
  });
});

describe('checkSqlGrounding', () => {
  it('combines table and column checks for filter clauses', () => {
    const result = checkSqlGrounding({
      sql: 'SELECT business_id FROM fund_flow WHERE trade_date >= CURDATE()',
      schemaContext: fundFlowSchema,
      businessKnowledge: [],
    });
    expect(result.ok).toBe(false);
    expect(result.unknownColumns).toContain('trade_date');
  });
});
