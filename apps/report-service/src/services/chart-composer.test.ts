import { describe, expect, it } from 'vitest';
import { composeEchartsOption } from './chart-composer.js';

describe('chart-composer', () => {
  const rows = [
    { month: '2026-01', amount: 100 },
    { month: '2026-02', amount: 150 },
  ];

  it('composes line chart option', () => {
    const option = composeEchartsOption(
      { chartType: 'line', chartConfig: { xField: 'month', yField: 'amount', title: '趋势' } },
      rows,
    );
    expect(option.series).toBeDefined();
    expect((option.xAxis as { data: string[] }).data).toEqual(['2026-01', '2026-02']);
  });

  it('composes bar chart option', () => {
    const option = composeEchartsOption(
      { chartType: 'bar', chartConfig: { xField: 'month', yField: 'amount' } },
      rows,
    );
    expect((option.series as { type: string }[])[0]?.type).toBe('bar');
  });

  it('composes table fallback', () => {
    const option = composeEchartsOption(
      { chartType: 'table', chartConfig: { xField: 'month', yField: 'amount' } },
      rows,
    );
    expect(option.type).toBe('table');
    expect(option.rows).toHaveLength(2);
  });
});
