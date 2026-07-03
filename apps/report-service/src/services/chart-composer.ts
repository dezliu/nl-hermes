import type { ReportChartSpec } from '@hermes/contracts';

export type EChartsOption = Record<string, unknown>;

function pickField(rows: Record<string, unknown>[], field: string): unknown[] {
  return rows.map((row) => row[field]);
}

export function composeEchartsOption(
  spec: ReportChartSpec,
  rows: Record<string, unknown>[],
): EChartsOption {
  const { chartType, chartConfig } = spec;
  const { xField, yField, seriesField, title } = chartConfig;

  if (chartType === 'table' || rows.length === 0) {
    const columns = rows.length > 0 ? Object.keys(rows[0]!) : [xField, yField];
    return {
      title: title ? { text: title } : undefined,
      type: 'table',
      columns,
      rows: rows.map((row) => columns.map((col) => row[col])),
    };
  }

  const xData = pickField(rows, xField);
  const yData = pickField(rows, yField);

  if (chartType === 'pie') {
    return {
      title: title ? { text: title } : undefined,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '60%',
          data: rows.map((row) => ({
            name: String(row[xField] ?? ''),
            value: Number(row[yField] ?? 0),
          })),
        },
      ],
    };
  }

  const base = {
    title: title ? { text: title } : undefined,
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: xData.map(String) },
    yAxis: { type: 'value' },
  };

  if (chartType === 'line') {
    return {
      ...base,
      series: [
        {
          type: 'line',
          name: seriesField ? String(rows[0]?.[seriesField] ?? yField) : yField,
          data: yData.map((v) => Number(v ?? 0)),
          smooth: true,
        },
      ],
    };
  }

  return {
    ...base,
    series: [
      {
        type: 'bar',
        name: yField,
        data: yData.map((v) => Number(v ?? 0)),
      },
    ],
  };
}

export function composeAllEchartsOptions(
  charts: ReportChartSpec[],
  rows: Record<string, unknown>[],
): EChartsOption[] {
  return charts.map((chart) => composeEchartsOption(chart, rows));
}
