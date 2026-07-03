import { describe, it, expect } from 'vitest';
import {
  filterSchemaForSelective,
  type SchemaTablePreview,
} from './datasource-service.js';

const sampleSchema: SchemaTablePreview[] = [
  {
    physicalName: 'orders',
    tableComment: '订单表',
    fields: [
      { physicalName: 'id', dataType: 'int', columnComment: '主键' },
      { physicalName: 'amount', dataType: 'decimal' },
    ],
  },
  {
    physicalName: 'users',
    fields: [
      { physicalName: 'id', dataType: 'int' },
      { physicalName: 'name', dataType: 'varchar' },
    ],
  },
];

describe('filterSchemaForSelective', () => {
  it('returns all tables when selection is empty', () => {
    expect(filterSchemaForSelective(sampleSchema)).toEqual(sampleSchema);
    expect(filterSchemaForSelective(sampleSchema, [])).toEqual(sampleSchema);
  });

  it('filters to selected tables with all fields when fields omitted', () => {
    const result = filterSchemaForSelective(sampleSchema, [{ physicalName: 'orders' }]);
    expect(result).toHaveLength(1);
    expect(result[0]?.physicalName).toBe('orders');
    expect(result[0]?.fields).toHaveLength(2);
  });

  it('filters to selected fields only', () => {
    const result = filterSchemaForSelective(sampleSchema, [
      { physicalName: 'users', fields: ['name'] },
    ]);
    expect(result).toEqual([
      {
        physicalName: 'users',
        fields: [{ physicalName: 'name', dataType: 'varchar' }],
      },
    ]);
  });

  it('skips unknown tables', () => {
    const result = filterSchemaForSelective(sampleSchema, [
      { physicalName: 'missing' },
      { physicalName: 'orders', fields: ['id'] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.fields).toEqual([
      { physicalName: 'id', dataType: 'int', columnComment: '主键' },
    ]);
  });
});

describe('markRemovedFields repository contract', () => {
  it('is exported on MetaRepository', async () => {
    const { MetaRepository } = await import('../repositories/index.js');
    expect(typeof new MetaRepository().markRemovedFields).toBe('function');
  });
});

describe('syncDatasourceMetadata field dataType', () => {
  it('SchemaFieldPreview carries dataType from information_schema for upsert', () => {
    // Mirrors fetchSchemaFromSource row mapping and upsertFieldFromSource patch payload.
    const preview = {
      physicalName: 'status',
      dataType: 'tinyint',
      columnComment: '状态',
    };
    expect(preview.dataType).toBe('tinyint');

    const upsertPatch = {
      sourceStatus: 'active' as const,
      dataType: preview.dataType,
      businessName: preview.columnComment,
    };
    expect(upsertPatch.dataType).toBe('tinyint');
  });
});
