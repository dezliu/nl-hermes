import { describe, it, expect } from 'vitest';
import {
  validateDashboardLayout,
  createDefaultDashboardLayout,
  DASHBOARD_GRID_COLS,
} from './dashboard-layout.js';
import type { DashboardLayoutSpec } from './index.js';

describe('validateDashboardLayout', () => {
  it('accepts valid layout', () => {
    const layout: DashboardLayoutSpec = {
      canvas: { width: 1920, height: 1080 },
      theme: 'dark',
      panels: [
        { id: 'kpi-1', type: 'kpi', grid: { x: 0, y: 0, w: 3, h: 2 } },
        { id: 'chart-0', type: 'chart', chartIndex: 0, grid: { x: 3, y: 0, w: 9, h: 4 } },
      ],
    };
    const result = validateDashboardLayout(layout, 1);
    expect(result.valid).toBe(true);
    expect(result.normalized?.panels).toHaveLength(2);
  });

  it('rejects invalid chartIndex', () => {
    const layout: DashboardLayoutSpec = {
      canvas: { width: 1920, height: 1080 },
      theme: 'dark',
      panels: [{ id: 'c1', type: 'chart', chartIndex: 5, grid: { x: 0, y: 0, w: 6, h: 4 } }],
    };
    const result = validateDashboardLayout(layout, 1);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_CHART_INDEX')).toBe(true);
  });

  it('rejects grid overflow beyond 12 columns', () => {
    const layout: DashboardLayoutSpec = {
      canvas: { width: 1920, height: 1080 },
      theme: 'dark',
      panels: [{ id: 'wide', type: 'text', grid: { x: 0, y: 0, w: 13, h: 1 } }],
    };
    const result = validateDashboardLayout(layout, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'GRID_OVERFLOW')).toBe(true);
  });

  it('createDefaultDashboardLayout produces chart panels', () => {
    const layout = createDefaultDashboardLayout(2, '测试大屏');
    expect(layout.panels.filter((p) => p.type === 'chart')).toHaveLength(2);
    expect(layout.header?.title).toBe('测试大屏');
    const result = validateDashboardLayout(layout, 2);
    expect(result.valid).toBe(true);
  });

  it('uses 12 column grid constant', () => {
    expect(DASHBOARD_GRID_COLS).toBe(12);
  });
});
