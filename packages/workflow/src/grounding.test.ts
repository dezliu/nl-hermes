import { describe, it, expect } from 'vitest';
import { checkColumnGrounding, checkGrounding, checkSqlGrounding } from './grounding.js';
import {
  buildStructuredSchema,
  formatUnknownColumnFeedback,
} from '@hermes/shared';

const fundFlowSchema = [
  {
    id: '1',
    content: 'fund_flow 跨系统资金流水 business_id 业务编号 varchar',
    score: 0.9,
  },
  {
    id: '2',
    content: 'fund_flow 跨系统资金流水 amount 金额 decimal',
    score: 0.9,
  },
  {
    id: '3',
    content: 'fund_flow 跨系统资金流水 in_ex_type 收支类型 varchar',
    score: 0.9,
  },
  {
    id: '4',
    content: 'fund_flow 跨系统资金流水 settlement_type_code 结算类型 varchar',
    score: 0.9,
  },
  {
    id: '5',
    content: 'fund_flow 跨系统资金流水 gmt_create 创建时间 datetime',
    score: 0.9,
  },
];

const crossTableSchema = [
  {
    id: '1',
    content: 'hst_order 结算主订单 order_type 订单类型 varchar',
    score: 0.9,
  },
  {
    id: '2',
    content: 'hst_order 结算主订单 order_amount 订单金额 decimal',
    score: 0.9,
  },
  {
    id: '3',
    content: 'hwt_trade_info 钱包交易 amount 交易金额 decimal',
    score: 0.8,
  },
  {
    id: '4',
    content: 'hwt_trade_info 钱包交易 trade_type 交易类型 varchar',
    score: 0.8,
  },
];

describe('buildStructuredSchema', () => {
  it('groups fields by table', () => {
    const schema = buildStructuredSchema(crossTableSchema);
    expect(schema.hst_order?.order_type).toBeDefined();
    expect(schema.hwt_trade_info?.amount).toBeDefined();
    expect(schema.hwt_trade_info?.order_type).toBeUndefined();
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

  it('should not treat INTERVAL WEEK unit as unknown column', () => {
    const keeperSchema = [
      {
        id: '1',
        content: 'keeper_task_info 数据核对任务 status 状态 tinyint',
        score: 0.9,
      },
      {
        id: '2',
        content: 'keeper_task_info 数据核对任务 gmt_create 创建时间 datetime',
        score: 0.9,
      },
    ];
    const sql =
      "SELECT COUNT(*) AS total_tasks FROM keeper_task_info WHERE status = '数据核对' AND gmt_create >= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)";
    const result = checkColumnGrounding({ sql, schemaContext: keeperSchema });
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

  it('accepts window functions with mom/yoy analysis on fund_flow', () => {
    const sql =
      'SELECT business_id, amount, gmt_create, COUNT(*) OVER (ORDER BY gmt_create) AS running_total, (SUM(amount) OVER (ORDER BY gmt_create ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) - SUM(amount) OVER (ORDER BY gmt_create ROWS BETWEEN 5 PRECEDING AND 6 PRECEDING)) AS yoy_change, amount - LAG(amount, 1) OVER (ORDER BY gmt_create) AS mom_change FROM fund_flow WHERE gmt_create >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) ORDER BY gmt_create DESC';
    const result = checkColumnGrounding({ sql, schemaContext: fundFlowSchema });
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
