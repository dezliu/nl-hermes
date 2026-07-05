'use client';

import { useEffect, useRef } from 'react';
import { Button, Space, Table, Typography, message } from 'antd';
import type { DashboardLayoutSpec, DashboardPanelSpec, ReportArtifact, ReportSpec } from '@hermes/contracts';
import { DASHBOARD_GRID_COLS } from '@hermes/contracts';
import * as echarts from 'echarts';

const { Text } = Typography;

const GATEWAY_BASE = process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql$/, '') ?? 'http://localhost:4000';
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? 'demo-user';

type DashboardViewerProps = {
  reportSpec?: ReportSpec;
  reportArtifact?: ReportArtifact;
  compact?: boolean;
};

function panelStyle(panel: DashboardPanelSpec, rowHeight: number): React.CSSProperties {
  const { x, y, w, h } = panel.grid;
  return {
    position: 'absolute',
    left: `${(x / DASHBOARD_GRID_COLS) * 100}%`,
    width: `${(w / DASHBOARD_GRID_COLS) * 100}%`,
    top: y * rowHeight,
    height: h * rowHeight,
  };
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
  if (panel.kpiField && rows[0][panel.kpiField] != null) {
    return formatKpiValue(rows[0][panel.kpiField], panel.kpiFormat);
  }
  const numericKey = Object.keys(rows[0]).find((k) => typeof rows[0][k] === 'number');
  if (numericKey) return formatKpiValue(rows[0][numericKey], panel.kpiFormat);
  return String(rows.length);
}

function ChartPanel({
  panel,
  option,
}: {
  panel: DashboardPanelSpec;
  option?: Record<string, unknown>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !option || option.type === 'table') return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [option]);

  if (!option) return <Text type="secondary">无图表数据</Text>;
  if (option.type === 'table') {
    const columns = ((option.columns as string[]) ?? []).map((c) => ({ title: c, dataIndex: c, key: c }));
    const data = ((option.rows as unknown[][]) ?? []).map((row, i) => {
      const record: Record<string, unknown> = { key: i };
      columns.forEach((col, idx) => {
        record[col.dataIndex] = row[idx];
      });
      return record;
    });
    return <Table size="small" columns={columns} dataSource={data} pagination={{ pageSize: 5 }} scroll={{ y: 160 }} />;
  }

  return <div ref={ref} style={{ width: '100%', height: '100%', minHeight: 120 }} />;
}

export function DashboardViewer({ reportSpec, reportArtifact, compact = false }: DashboardViewerProps) {
  const layout = (reportSpec?.layout ?? reportArtifact?.inlinePayload?.layout) as DashboardLayoutSpec | undefined;
  const echartsOptions = reportArtifact?.inlinePayload?.echartsOptions as Record<string, unknown>[] | undefined;
  const rows = reportSpec?.data.rows ?? reportArtifact?.inlinePayload?.rows ?? [];

  if (!layout) return null;

  const reportId = reportSpec?.id ?? reportArtifact?.reportId;
  const isDark = layout.theme !== 'light';
  const rowHeight = compact ? 56 : 80;
  const canvasHeight =
    layout.panels.reduce((max, p) => Math.max(max, (p.grid.y + p.grid.h) * rowHeight), rowHeight * 4) + 16;

  const handleFullscreen = () => {
    if (!reportId) return;
    window.open(`/dashboard/${reportId}`, '_blank');
  };

  const handlePreview = () => {
    if (!reportId) return;
    window.open(`${GATEWAY_BASE}/api/reports/${reportId}/preview`, '_blank');
  };

  const handleEdit = () => {
    if (!reportId) return;
    window.open(`/dashboard/${reportId}/edit`, '_blank');
  };

  const handleShare = async () => {
    if (!reportId) return;
    try {
      const res = await fetch(`${GATEWAY_BASE}/api/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, expiresInDays: 7 }),
      });
      const data = (await res.json()) as { shareUrl?: string; message?: string; error?: string };
      if (!res.ok) throw new Error(data.message ?? '分享失败');
      if (!data.shareUrl) throw new Error('分享失败');
      await navigator.clipboard.writeText(data.shareUrl);
      message.success('分享链接已复制');
    } catch {
      message.error('分享失败');
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <Space style={{ marginBottom: 8 }} wrap>
        <Button size="small" onClick={handleFullscreen}>全屏查看</Button>
        <Button size="small" onClick={handlePreview}>预览网页</Button>
        <Button size="small" onClick={handleEdit}>编辑布局</Button>
        <Button size="small" onClick={() => void handleShare()}>分享链接</Button>
      </Space>
      <div
        style={{
          position: 'relative',
          height: canvasHeight,
          borderRadius: 12,
          padding: 12,
          background: isDark
            ? 'linear-gradient(180deg, #0b1220 0%, #111827 100%)'
            : '#f8fafc',
          color: isDark ? '#e5e7eb' : '#0f172a',
          overflow: 'hidden',
        }}
      >
        {layout.header?.title && (
          <div style={{ marginBottom: 8, fontSize: compact ? 16 : 20, fontWeight: 600 }}>
            {layout.header.title}
          </div>
        )}
        <div style={{ position: 'relative', height: canvasHeight - (layout.header?.title ? 36 : 0) }}>
          {layout.panels.map((panel) => (
            <div
              key={panel.id}
              style={{
                ...panelStyle(panel, rowHeight),
                borderRadius: 10,
                padding: '8px 12px',
                background: isDark ? 'rgba(30,41,59,0.85)' : '#fff',
                border: isDark ? '1px solid rgba(148,163,184,0.2)' : '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              {panel.title && (
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>{panel.title}</div>
              )}
              {panel.type === 'text' && (
                <div style={{ fontSize: compact ? 14 : 18, fontWeight: 600 }}>
                  {panel.textContent ?? layout.header?.title}
                </div>
              )}
              {panel.type === 'kpi' && (
                <div style={{ fontSize: compact ? 24 : 32, fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>
                  {resolveKpiValue(rows, panel)}
                </div>
              )}
              {(panel.type === 'chart' || panel.type === 'table') && (
                <ChartPanel
                  panel={panel}
                  option={panel.chartIndex != null ? echartsOptions?.[panel.chartIndex] : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
