import type { DashboardLayoutSpec, DashboardPanelSpec, ReportSpec } from '@hermes/contracts';
import { DASHBOARD_GRID_COLS } from '@hermes/contracts';
import type { EChartsOption } from '../services/chart-composer.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatKpiValue(value: unknown, format?: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value ?? '-');
  if (format === 'currency') return `¥${num.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`;
  if (format === 'percent') return `${(num * 100).toFixed(1)}%`;
  return num.toLocaleString('zh-CN');
}

function resolveKpiValue(rows: Record<string, unknown>[], panel: DashboardPanelSpec): string {
  if (!rows.length) return '-';
  const field = panel.kpiField;
  if (field && rows[0][field] != null) {
    return formatKpiValue(rows[0][field], panel.kpiFormat);
  }
  const numericKey = Object.keys(rows[0]).find((k) => typeof rows[0][k] === 'number');
  if (numericKey) return formatKpiValue(rows[0][numericKey], panel.kpiFormat);
  return String(rows.length);
}

function panelStyle(panel: DashboardPanelSpec): string {
  const { x, y, w, h } = panel.grid;
  const left = (x / DASHBOARD_GRID_COLS) * 100;
  const width = (w / DASHBOARD_GRID_COLS) * 100;
  const rowHeight = 80;
  return `left:${left}%;width:${width}%;top:${y * rowHeight}px;height:${h * rowHeight}px;`;
}

export function buildDashboardWebHtml(
  spec: ReportSpec,
  echartsOptions: EChartsOption[],
  panelQueryIds?: Record<string, string>,
): string {
  const layout = spec.layout!;
  const isDark = layout.theme !== 'light';
  const rows = spec.data.rows;
  const panelsHtml = layout.panels
    .map((panel) => {
      const style = panelStyle(panel);
      const title = panel.title ? `<div class="panel-title">${escapeHtml(panel.title)}</div>` : '';

      if (panel.type === 'text') {
        return `<div class="panel panel-text" style="${style}">${title}<div class="panel-text-body">${escapeHtml(panel.textContent ?? spec.title)}</div></div>`;
      }

      if (panel.type === 'kpi') {
        const value = resolveKpiValue(rows, panel);
        return `<div class="panel panel-kpi" style="${style}">${title}<div class="kpi-value" data-panel-id="${escapeHtml(panel.id)}">${escapeHtml(value)}</div></div>`;
      }

      if (panel.type === 'table' || (panel.type === 'chart' && panel.chartIndex != null && echartsOptions[panel.chartIndex]?.type === 'table')) {
        const idx = panel.chartIndex ?? 0;
        return `<div class="panel panel-chart" style="${style}">${title}<div id="panel-${escapeHtml(panel.id)}" class="chart-host" data-chart-index="${idx}"></div></div>`;
      }

      if (panel.type === 'chart' && panel.chartIndex != null) {
        return `<div class="panel panel-chart" style="${style}">${title}<div id="panel-${escapeHtml(panel.id)}" class="chart-host" data-chart-index="${panel.chartIndex}"></div></div>`;
      }

      return `<div class="panel" style="${style}">${title}</div>`;
    })
    .join('\n');

  const chartInitScripts = layout.panels
    .filter((p) => p.type === 'chart' || p.type === 'table')
    .map((panel) => {
      const idx = panel.chartIndex ?? 0;
      const option = echartsOptions[idx];
      if (!option) return '';
      const hostId = `panel-${panel.id}`;
      if (option.type === 'table') {
        const columns = (option.columns as string[]) ?? [];
        const tableRows = (option.rows as unknown[][]) ?? [];
        const header = columns.map((c) => `<th>${escapeHtml(String(c))}</th>`).join('');
        const body = tableRows
          .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
          .join('');
        return `document.getElementById('${hostId}').innerHTML = '<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>';`;
      }
      return `(function(){const el=document.getElementById('${hostId}');if(!el)return;const chart=echarts.init(el);chart.setOption(${JSON.stringify(option)});window.addEventListener('resize',()=>chart.resize());})();`;
    })
    .join('\n');

  const refreshPanels = layout.panels.filter((p) => p.publishedQueryId || panelQueryIds?.[p.id]);
  const refreshScript = refreshPanels.length
    ? `
const PANEL_QUERIES = ${JSON.stringify(
        Object.fromEntries(
          refreshPanels.map((p) => [p.id, p.publishedQueryId ?? panelQueryIds?.[p.id] ?? '']),
        ),
      )};
const SHARE_TOKEN = new URLSearchParams(location.search).get('token') || '';
async function refreshPanel(panelId, queryId) {
  if (!queryId) return;
  const res = await fetch('/api/published-queries/' + queryId + '/data', {
    headers: SHARE_TOKEN ? { 'x-share-token': SHARE_TOKEN } : {}
  });
  const json = await res.json();
  if (!json.ok || !json.rows?.length) return;
  const row = json.rows[0];
  const kpiEl = document.querySelector('[data-panel-id="' + panelId + '"]');
  if (kpiEl) {
    const val = Object.values(row).find(v => typeof v === 'number');
    kpiEl.textContent = val != null ? Number(val).toLocaleString('zh-CN') : String(json.rowCount ?? '-');
  }
}
function refreshAll() {
  Object.entries(PANEL_QUERIES).forEach(([panelId, queryId]) => refreshPanel(panelId, queryId));
}
const intervalSec = ${Math.min(...refreshPanels.map((p) => p.refreshIntervalSec ?? 60))};
setInterval(refreshAll, intervalSec * 1000);
refreshAll();
`
    : '';

  const headerTitle = layout.header?.title ?? spec.title;
  const clockScript = layout.header?.showClock
    ? `function tickClock(){const el=document.getElementById('dash-clock');if(el)el.textContent=new Date().toLocaleString('zh-CN');}tickClock();setInterval(tickClock,1000);`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(headerTitle)}</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; overflow: hidden; }
    .dashboard { position: relative; min-height: 100vh; padding: 16px; }
    .dashboard.dark { background: linear-gradient(180deg, #0b1220 0%, #111827 100%); color: #e5e7eb; }
    .dashboard.light { background: #f8fafc; color: #0f172a; }
    .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 8px; }
    .dash-header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .dash-header .subtitle { opacity: 0.75; font-size: 14px; margin-top: 4px; }
    .dash-clock { font-size: 14px; opacity: 0.8; }
    .canvas { position: relative; min-height: calc(100vh - 72px); }
    .panel { position: absolute; border-radius: 12px; padding: 12px 16px; overflow: hidden; }
    .dashboard.dark .panel { background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(148, 163, 184, 0.2); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
    .dashboard.light .panel { background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15,23,42,0.06); }
    .panel-title { font-size: 13px; opacity: 0.85; margin-bottom: 8px; }
    .panel-text-body { font-size: 22px; font-weight: 600; }
    .kpi-value { font-size: 36px; font-weight: 700; line-height: 1.2; color: ${isDark ? '#38bdf8' : '#0284c7'}; }
    .chart-host { width: 100%; height: calc(100% - 28px); min-height: 120px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid ${isDark ? 'rgba(148,163,184,0.2)' : '#e2e8f0'}; }
    th { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="dashboard ${isDark ? 'dark' : 'light'}">
    <div class="dash-header">
      <div>
        <h1>${escapeHtml(headerTitle)}</h1>
        ${layout.header?.subtitle ? `<div class="subtitle">${escapeHtml(layout.header.subtitle)}</div>` : ''}
      </div>
      ${layout.header?.showClock ? '<div class="dash-clock" id="dash-clock"></div>' : ''}
    </div>
    <div class="canvas">
      ${panelsHtml}
    </div>
  </div>
  <script>
    ${chartInitScripts}
    ${clockScript}
    ${refreshScript}
  </script>
</body>
</html>`;
}
