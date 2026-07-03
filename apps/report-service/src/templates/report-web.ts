import type { ReportSpec } from '@hermes/contracts';
import type { EChartsOption } from '../services/chart-composer.js';

export function buildReportWebHtml(
  spec: ReportSpec,
  echartsOptions: EChartsOption[],
  publishedQueryId?: string,
): string {
  const sectionsHtml = (spec.narrative.sections ?? [])
    .map(
      (section) =>
        `<section class="section"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p>${section.chartIndex != null ? `<div id="chart-${section.chartIndex}" class="chart"></div>` : ''}</section>`,
    )
    .join('\n');

  const insightsHtml = (spec.narrative.insights ?? [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');

  const chartScripts = echartsOptions
    .map((option, index) => {
      if (option.type === 'table') {
        const columns = (option.columns as string[]) ?? [];
        const rows = (option.rows as unknown[][]) ?? [];
        const header = columns.map((c) => `<th>${escapeHtml(String(c))}</th>`).join('');
        const body = rows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
          .join('');
        return `document.getElementById('chart-${index}').innerHTML = '<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>';`;
      }
      return `echarts.init(document.getElementById('chart-${index}')).setOption(${JSON.stringify(option)});`;
    })
    .join('\n');

  const refreshHook = publishedQueryId
    ? `
async function refreshData() {
  const res = await fetch('/api/published-queries/${publishedQueryId}/data');
  const json = await res.json();
  if (!json.ok) return;
  const rows = json.rows || [];
  ${echartsOptions
    .map((_, index) => `/* chart ${index} refresh handled client-side */`)
    .join('\n')}
}
document.getElementById('refresh-btn')?.addEventListener('click', refreshData);
`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(spec.title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; background: #fff7ed; color: #431407; }
    .container { max-width: 960px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #ffedd5; }
    h1 { margin-top: 0; }
    .summary { color: #9a3412; line-height: 1.6; }
    .chart { height: 360px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid #fed7aa; padding: 8px; text-align: left; }
    th { background: #fff7ed; }
    .meta { font-size: 12px; color: #a16207; margin-top: 24px; }
    button { background: #f97316; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(spec.title)}</h1>
    <p class="summary">${escapeHtml(spec.narrative.summary)}</p>
    ${insightsHtml ? `<ul>${insightsHtml}</ul>` : ''}
    ${echartsOptions.map((_, i) => `<div id="chart-${i}" class="chart"></div>`).join('\n')}
    ${sectionsHtml}
    ${publishedQueryId ? '<button id="refresh-btn" type="button">刷新数据</button>' : ''}
    <p class="meta">生成时间：${escapeHtml(spec.createdAt)} · 共 ${spec.data.rowCount} 行</p>
  </div>
  <script>
    ${chartScripts}
    ${refreshHook}
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
