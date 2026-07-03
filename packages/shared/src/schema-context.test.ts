import { describe, it, expect } from 'vitest';
import {
  buildStructuredSchema,
  formatStructuredSchema,
  formatUnknownColumnFeedback,
  findColumnOwners,
} from './schema-context.js';

const docs = [
  { id: '1', content: 'hst_order 结算主订单 order_type 订单类型', score: 0.9 },
  { id: '2', content: 'hwt_trade_info 钱包交易 amount trade_type', score: 0.8 },
];

describe('schema-context', () => {
  it('buildStructuredSchema maps table to columns', () => {
    const schema = buildStructuredSchema(docs);
    expect(findColumnOwners(schema, 'order_type')).toEqual(['hst_order']);
    expect(findColumnOwners(schema, 'amount')).toEqual(['hwt_trade_info']);
  });

  it('formatStructuredSchema returns JSON', () => {
    const text = formatStructuredSchema(docs);
    expect(text).toContain('"hst_order"');
    expect(text).toContain('order_type');
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
