import { describe, it, expect } from 'vitest';
import {
  buildStructuredSchema,
  formatStructuredSchema,
  formatUnknownColumnFeedback,
  findColumnOwners,
  parseFieldDocument,
} from './schema-context.js';

const docs = [
  { id: '1', content: 'hst_order 结算主订单 order_type 订单类型 varchar', score: 0.9 },
  { id: '2', content: 'hwt_trade_info 钱包交易 amount 交易金额 decimal trade_type', score: 0.8 },
];

describe('schema-context', () => {
  it('parseFieldDocument extracts table, field and dataType', () => {
    expect(parseFieldDocument('keeper_task_info 任务 status 状态 tinyint')).toEqual({
      table: 'keeper_task_info',
      field: 'status',
      type: 'tinyint',
    });
    expect(parseFieldDocument('fund_flow 流水 gmt_create 创建时间 datetime')).toEqual({
      table: 'fund_flow',
      field: 'gmt_create',
      type: 'datetime',
    });
  });

  it('parses RAG index doc shape from query-library sync (index-pipeline field order)', () => {
    const content = [
      'keeper_task_info',
      '数据核对任务',
      'status',
      '状态',
      '任务状态',
      'tinyint',
    ].join(' ');
    expect(parseFieldDocument(content)).toEqual({
      table: 'keeper_task_info',
      field: 'status',
      type: 'tinyint',
    });
  });

  it('buildStructuredSchema maps table to typed columns', () => {
    const schema = buildStructuredSchema(docs);
    expect(findColumnOwners(schema, 'order_type')).toEqual(['hst_order']);
    expect(findColumnOwners(schema, 'amount')).toEqual(['hwt_trade_info']);
    expect(schema.hst_order?.order_type).toEqual({ type: 'varchar' });
    expect(schema.hwt_trade_info?.amount).toEqual({ type: 'decimal' });
  });

  it('formatStructuredSchema returns typed JSON', () => {
    const text = formatStructuredSchema(docs);
    expect(text).toContain('"hst_order"');
    expect(text).toContain('"order_type"');
    expect(text).toContain('"type": "varchar"');
    expect(text).toContain('"type": "decimal"');
  });

  it('formatUnknownColumnFeedback explains table mismatch', () => {
    const hint = formatUnknownColumnFeedback(
      "Unknown column 'hwt_trade_info.order_type' in 'where clause'",
      docs,
    );
    expect(hint).toContain('order_type');
    expect(hint).toContain('hst_order');
  });
});
