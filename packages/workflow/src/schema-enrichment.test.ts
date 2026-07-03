import { describe, it, expect } from 'vitest';
import type { RetrieveResult } from '@hermes/contracts';
import {
  enrichSchemaByTables,
  enrichSchemaForMissingColumns,
  enrichSchemaForTemporalIntent,
  hasTemporalQueryIntent,
  type QueryLibraryField,
} from './schema-enrichment.js';

const fundFlowFields: QueryLibraryField[] = [
  {
    id: 'f1',
    tablePhysicalName: 'fund_flow',
    physicalName: 'business_id',
    dataType: 'varchar',
  },
  {
    id: 'f2',
    tablePhysicalName: 'fund_flow',
    physicalName: 'amount',
    dataType: 'decimal',
  },
  {
    id: 'f3',
    tablePhysicalName: 'fund_flow',
    physicalName: 'gmt_create',
    dataType: 'datetime',
    synonyms: [{ synonym: '创建时间' }],
  },
];

const partialContext: RetrieveResult[] = [
  {
    id: 'f1',
    content: 'fund_flow 跨系统资金流水 business_id 业务编号 varchar',
    score: 0.9,
  },
  {
    id: 'f2',
    content: 'fund_flow 跨系统资金流水 amount 金额 decimal',
    score: 0.85,
  },
];

describe('hasTemporalQueryIntent', () => {
  it('detects 近7天 and 环比同比', () => {
    expect(hasTemporalQueryIntent('我想查看近7天资金流水，顺带帮我分析环比、同比等数据')).toBe(true);
    expect(hasTemporalQueryIntent('统计订单数量')).toBe(false);
  });
});

describe('enrichSchemaByTables', () => {
  it('adds missing fields for tables already in context', () => {
    const enriched = enrichSchemaByTables(partialContext, fundFlowFields);
    expect(enriched.some((i) => i.id === 'f3')).toBe(true);
    expect(enriched.length).toBe(3);
  });
});

describe('enrichSchemaForTemporalIntent', () => {
  it('adds datetime fields for matched tables', () => {
    const enriched = enrichSchemaForTemporalIntent(partialContext, fundFlowFields);
    expect(enriched.some((i) => i.content.includes('gmt_create'))).toBe(true);
  });
});

describe('enrichSchemaForMissingColumns', () => {
  it('adds gmt_create when SQL uses fund_flow', () => {
    const sql =
      'SELECT DATE(gmt_create) AS dt FROM fund_flow WHERE gmt_create >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    const enriched = enrichSchemaForMissingColumns(partialContext, ['gmt_create'], fundFlowFields, sql);
    expect(enriched.some((i) => i.id === 'f3')).toBe(true);
  });
});
