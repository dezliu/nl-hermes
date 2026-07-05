'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Space, Spin, Typography, message } from 'antd';
import GridLayout, { type Layout } from 'react-grid-layout';
import type {
  DashboardLayoutSpec,
  DashboardPanelSpec,
  ReportArtifact,
  ReportChartSpec,
  ReportSpec,
} from '@hermes/contracts';
import { DashboardViewer } from '../../../../components/DashboardViewer';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GATEWAY_BASE = process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql$/, '') ?? 'http://localhost:4000';
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? 'demo-user';

function panelsToLayout(panels: DashboardPanelSpec[]): Layout[] {
  return panels.map((p) => ({
    i: p.id,
    x: p.grid.x,
    y: p.grid.y,
    w: p.grid.w,
    h: p.grid.h,
    minW: 2,
    minH: 1,
  }));
}

function layoutToPanels(layout: Layout[], panels: DashboardPanelSpec[]): DashboardPanelSpec[] {
  const byId = new Map(panels.map((p) => [p.id, p]));
  return layout.map((item) => {
    const existing = byId.get(item.i);
    return {
      ...(existing ?? { id: item.i, type: 'chart' as const }),
      grid: { x: item.x, y: item.y, w: item.w, h: item.h },
    };
  });
}

export default function DashboardEditPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [spec, setSpec] = useState<ReportSpec | undefined>();
  const [artifact, setArtifact] = useState<ReportArtifact | undefined>();
  const [layout, setLayout] = useState<Layout[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [charts, setCharts] = useState<ReportChartSpec[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${GATEWAY_BASE}/api/reports/${params.id}?userId=${encodeURIComponent(DEMO_USER_ID)}`,
        );
        if (!res.ok) throw new Error('加载失败');
        const data = (await res.json()) as { spec: ReportSpec; artifact: ReportArtifact };
        if (data.spec.outputFormat !== 'dashboard' || !data.spec.layout) {
          throw new Error('非大屏类型');
        }
        setSpec(data.spec);
        setArtifact(data.artifact);
        setCharts(data.spec.charts);
        setLayout(panelsToLayout(data.spec.layout.panels));
        setSelectedPanelId(data.spec.layout.panels[0]?.id ?? null);
      } catch {
        message.error('无法加载大屏');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  const selectedPanel = useMemo(
    () => spec?.layout?.panels.find((p) => p.id === selectedPanelId),
    [spec, selectedPanelId],
  );

  const handleLayoutChange = useCallback((next: Layout[]) => {
    setLayout(next);
    if (!spec?.layout) return;
    const panels = layoutToPanels(next, spec.layout.panels);
    setSpec({ ...spec, layout: { ...spec.layout, panels } });
  }, [spec]);

  const handleSave = async () => {
    if (!spec?.layout) return;
    setSaving(true);
    try {
      const res = await fetch(`${GATEWAY_BASE}/api/dashboards/${params.id}/layout`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          layout: spec.layout,
          charts,
        }),
      });
      if (!res.ok) throw new Error('保存失败');
      const data = (await res.json()) as { spec: ReportSpec; artifact: ReportArtifact };
      setSpec(data.spec);
      setArtifact(data.artifact);
      setCharts(data.spec.charts);
      message.success('布局已保存');
    } catch {
      message.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updatePanel = (patch: Partial<DashboardPanelSpec>) => {
    if (!spec?.layout || !selectedPanelId) return;
    const panels = spec.layout.panels.map((p) =>
      p.id === selectedPanelId ? { ...p, ...patch } : p,
    );
    setSpec({ ...spec, layout: { ...spec.layout, panels } });
  };

  const updateChartType = (chartType: ReportChartSpec['chartType']) => {
    if (!selectedPanel || selectedPanel.chartIndex == null) return;
    const next = [...charts];
    const current = next[selectedPanel.chartIndex];
    if (!current) return;
    next[selectedPanel.chartIndex] = { ...current, chartType };
    setCharts(next);
  };

  if (loading) {
    return <div style={{ padding: 48, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  if (!spec?.layout) {
    return <Typography.Text>大屏不存在</Typography.Text>;
  }

  const dashboardLayout: DashboardLayoutSpec = spec.layout;

  return (
    <div style={{ padding: 16, minHeight: '100vh', background: '#fff7ed' }}>
      <Space style={{ marginBottom: 16 }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>编辑大屏布局</Typography.Title>
        <Button type="primary" loading={saving} onClick={() => void handleSave()}>保存</Button>
        <Button onClick={() => window.open(`/dashboard/${params.id}`, '_blank')}>全屏预览</Button>
      </Space>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div style={{ background: '#0b1220', borderRadius: 12, padding: 12, minHeight: 480 }}>
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={56}
            width={900}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".panel-drag-handle"
          >
            {dashboardLayout.panels.map((panel) => (
              <div
                key={panel.id}
                onClick={() => setSelectedPanelId(panel.id)}
                style={{
                  border: selectedPanelId === panel.id ? '2px solid #f97316' : '1px solid rgba(148,163,184,0.3)',
                  borderRadius: 8,
                  background: 'rgba(30,41,59,0.9)',
                  color: '#e5e7eb',
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <div className="panel-drag-handle" style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                  {panel.title ?? panel.id} · {panel.type}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  拖拽移动/缩放
                </div>
              </div>
            ))}
          </GridLayout>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #ffedd5' }}>
          <Typography.Text strong>Panel 属性</Typography.Text>
          {selectedPanel ? (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Typography.Text type="secondary">标题</Typography.Text>
                <Input
                  value={selectedPanel.title ?? ''}
                  onChange={(e) => updatePanel({ title: e.target.value })}
                />
              </div>
              {selectedPanel.type === 'chart' && selectedPanel.chartIndex != null && (
                <div>
                  <Typography.Text type="secondary">图表类型</Typography.Text>
                  <Select
                    style={{ width: '100%' }}
                    value={charts[selectedPanel.chartIndex]?.chartType ?? 'line'}
                    onChange={updateChartType}
                    options={[
                      { value: 'line', label: '折线图' },
                      { value: 'bar', label: '柱状图' },
                      { value: 'pie', label: '饼图' },
                      { value: 'table', label: '表格' },
                    ]}
                  />
                </div>
              )}
            </div>
          ) : (
            <Typography.Paragraph type="secondary">点击左侧 panel 进行编辑</Typography.Paragraph>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <Typography.Title level={5}>实时预览</Typography.Title>
        <DashboardViewer reportSpec={{ ...spec, charts }} reportArtifact={artifact} compact />
      </div>
    </div>
  );
}
