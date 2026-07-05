import type { DashboardGridPosition, DashboardLayoutSpec, DashboardPanelSpec } from './index.js';

export const DASHBOARD_GRID_COLS = 12;

export type DashboardLayoutValidationError = {
  code: string;
  message: string;
  panelId?: string;
};

export type DashboardLayoutValidationResult = {
  valid: boolean;
  errors: DashboardLayoutValidationError[];
  normalized?: DashboardLayoutSpec;
};

function panelsOverlap(a: DashboardGridPosition, b: DashboardGridPosition): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clampGrid(grid: DashboardGridPosition): DashboardGridPosition {
  const w = Math.max(1, Math.min(grid.w, DASHBOARD_GRID_COLS));
  const x = Math.max(0, Math.min(grid.x, DASHBOARD_GRID_COLS - w));
  const h = Math.max(1, grid.h);
  const y = Math.max(0, grid.y);
  return { x, y, w, h };
}

function compactPanels(panels: DashboardPanelSpec[]): DashboardPanelSpec[] {
  const sorted = [...panels].sort((a, b) => a.grid.y - b.grid.y || a.grid.x - b.grid.x);
  const placed: DashboardPanelSpec[] = [];

  for (const panel of sorted) {
    let grid = clampGrid(panel.grid);
    let attempts = 0;
    while (attempts < 200) {
      const conflict = placed.some((p) => panelsOverlap(grid, p.grid));
      if (!conflict) break;
      grid = { ...grid, y: grid.y + 1 };
      attempts += 1;
    }
    placed.push({ ...panel, grid });
  }
  return placed;
}

export function validateDashboardLayout(
  layout: DashboardLayoutSpec,
  chartCount: number,
): DashboardLayoutValidationResult {
  const errors: DashboardLayoutValidationError[] = [];

  if (!layout.panels?.length) {
    errors.push({ code: 'EMPTY_LAYOUT', message: '大屏至少需要一个 panel' });
  }

  const seenIds = new Set<string>();
  for (const panel of layout.panels ?? []) {
    if (!panel.id) {
      errors.push({ code: 'MISSING_PANEL_ID', message: 'panel 缺少 id' });
      continue;
    }
    if (seenIds.has(panel.id)) {
      errors.push({ code: 'DUPLICATE_PANEL_ID', message: `panel id 重复: ${panel.id}`, panelId: panel.id });
    }
    seenIds.add(panel.id);

    const grid = panel.grid;
    if (!grid) {
      errors.push({ code: 'MISSING_GRID', message: 'panel 缺少 grid', panelId: panel.id });
      continue;
    }
    if (grid.x < 0 || grid.y < 0 || grid.w < 1 || grid.h < 1) {
      errors.push({ code: 'INVALID_GRID', message: 'grid 坐标或尺寸无效', panelId: panel.id });
    }
    if (grid.x + grid.w > DASHBOARD_GRID_COLS) {
      errors.push({
        code: 'GRID_OVERFLOW',
        message: `panel 超出 ${DASHBOARD_GRID_COLS} 列栅格`,
        panelId: panel.id,
      });
    }
    if (panel.type === 'chart' && panel.chartIndex != null) {
      if (panel.chartIndex < 0 || panel.chartIndex >= chartCount) {
        errors.push({
          code: 'INVALID_CHART_INDEX',
          message: `chartIndex ${panel.chartIndex} 越界（共 ${chartCount} 个图表）`,
          panelId: panel.id,
        });
      }
    }
  }

  const normalizedPanels = compactPanels(
    (layout.panels ?? []).map((p) => ({ ...p, grid: clampGrid(p.grid) })),
  );

  for (let i = 0; i < normalizedPanels.length; i += 1) {
    for (let j = i + 1; j < normalizedPanels.length; j += 1) {
      if (panelsOverlap(normalizedPanels[i].grid, normalizedPanels[j].grid)) {
        errors.push({
          code: 'PANELS_OVERLAP',
          message: `panel ${normalizedPanels[i].id} 与 ${normalizedPanels[j].id} 重叠`,
          panelId: normalizedPanels[i].id,
        });
      }
    }
  }

  const normalized: DashboardLayoutSpec = {
    ...layout,
    canvas: layout.canvas ?? { width: 1920, height: 1080 },
    theme: layout.theme ?? 'dark',
    panels: normalizedPanels,
  };

  return { valid: errors.length === 0, errors, normalized };
}

export function createDefaultDashboardLayout(
  chartCount: number,
  title?: string,
): DashboardLayoutSpec {
  const panels: DashboardPanelSpec[] = [
    {
      id: 'header-text',
      type: 'text',
      title: title ?? '数据大屏',
      textContent: title ?? '数据大屏',
      grid: { x: 0, y: 0, w: 12, h: 1 },
    },
    {
      id: 'kpi-main',
      type: 'kpi',
      title: '数据总量',
      grid: { x: 0, y: 1, w: 3, h: 2 },
    },
  ];

  for (let i = 0; i < chartCount; i += 1) {
    panels.push({
      id: `chart-${i}`,
      type: 'chart',
      chartIndex: i,
      grid: {
        x: (i % 2) * 6,
        y: 3 + Math.floor(i / 2) * 4,
        w: 6,
        h: 4,
      },
    });
  }

  return {
    canvas: { width: 1920, height: 1080 },
    theme: 'dark',
    header: title ? { title, showClock: true } : undefined,
    panels,
  };
}
