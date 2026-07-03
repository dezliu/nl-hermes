import { describe, it, expect } from 'vitest';
import { checkColumnGrounding, checkGrounding, checkSqlGrounding } from './grounding.js';
import {
  buildStructuredSchema,
  formatUnknownColumnFeedback,
} from '@hermes/shared';

const fundFlowSchema = [
  {
    id: '1',
    content: 'fund_flow 跨系统资金流水 business_id amount gmt_create datetime 创建时间',
    score: 0.9,
  },
];

const crossTableSchema = [
  {
    id: '1',
    content: 'hst_order 结算主订单 order_type 订单类型 order_amount',
    score: 0.9,
  },
  {
    id: '2',
    content: 'hwt_trade_info 钱包交易 amount trade_type finish_time',
    score: 0.8,
  },
];

describe('buildStructuredSchema', () => {
  it('groups fields by table', () => {
    const schema = buildStructuredSchema(crossTableSchema);
    expect(schema.hst_order).toContain('order_type');
    expect(schema.hwt_trade_info).toContain('amount');
    expect(schema.hwt_trade_info).not.toContain('order_type');
  });
});

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

  it('flags cross-table column misuse hwt_trade_info.order_type', () => {
    const result = checkColumnGrounding({
      sql: "SELECT amount FROM hwt_trade_info WHERE hwt_trade_info.order_type = 'COURIER_DELIVERY_FEE'",
      schemaContext: crossTableSchema,
    });
    expect(result.ok).toBe(false);
    expect(result.misassignedColumns?.some((c) => c.includes('order_type'))).toBe(true);
  });

  it('accepts order_type on hst_order', () => {
    const result = checkColumnGrounding({
      sql: "SELECT order_amount FROM hst_order WHERE hst_order.order_type = 'COURIER_DELIVERY_FEE'",
      schemaContext: crossTableSchema,
    });
    expect(result.ok).toBe(true);
  });
});

describe('formatUnknownColumnFeedback', () => {
  it('suggests correct table for misassigned column', () => {
    const msg = formatUnknownColumnFeedback(
      "Unknown column 'hwt_trade_info.order_type' in 'where clause'",
      crossTableSchema,
    );
    expect(msg).toContain('hst_order');
    expect(msg).toContain('hwt_trade_info');
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
