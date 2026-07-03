'use client';

import { useEffect, useRef } from 'react';
import { Button, Space, Table, Typography, message } from 'antd';
import type { ReportArtifact, ReportSpec } from '@hermes/contracts';
import * as echarts from 'echarts';

const { Text } = Typography;

const GATEWAY_BASE = process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql$/, '') ?? 'http://localhost:4000';
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? 'demo-user';

type ReportViewerProps = {
  reportSpec?: ReportSpec;
  reportArtifact?: ReportArtifact;
};

export function ReportViewer({ reportSpec, reportArtifact }: ReportViewerProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const echartsOptions = reportArtifact?.inlinePayload?.echartsOptions as Record<string, unknown>[] | undefined;
  const rows = reportSpec?.data.rows ?? reportArtifact?.inlinePayload?.rows ?? [];
  const primaryOption = echartsOptions?.[0];
  const isTable = primaryOption?.type === 'table';

  useEffect(() => {
    if (!chartRef.current || isTable || !primaryOption) return;
    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(primaryOption);
    const onResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartInstance.current?.dispose();
    };
  }, [isTable, primaryOption]);

  if (!reportSpec && !reportArtifact) return null;

  const reportId = reportSpec?.id ?? reportArtifact?.reportId;
  const format = reportSpec?.outputFormat ?? reportArtifact?.format;
  const artifactReady = reportArtifact?.status !== 'failed';

  const handlePreview = () => {
    if (!reportId) return;
    window.open(`${GATEWAY_BASE}/api/reports/${reportId}/preview`, '_blank');
  };

  const handleDownload = () => {
    if (!reportId || !artifactReady) {
      message.error(reportArtifact?.errorMessage ?? 'Word 文档尚未就绪');
      return;
    }
    window.open(`${GATEWAY_BASE}/api/reports/${reportId}/download`, '_blank');
  };

  const handleShare = async () => {
    if (!reportId) return;
    try {
      const res = await fetch(`${GATEWAY_BASE}/api/reports/${reportId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: DEMO_USER_ID, expiresInDays: 7 }),
      });
      const json = (await res.json()) as { shareUrl?: string; message?: string };
      if (!res.ok) throw new Error(json.message ?? '分享失败');
      if (json.shareUrl) {
        await navigator.clipboard.writeText(json.shareUrl);
        message.success('分享链接已复制');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const tableColumns =
    isTable && primaryOption
      ? ((primaryOption.columns as string[]) ?? []).map((col) => ({
          title: col,
          dataIndex: col,
          key: col,
        }))
      : rows.length > 0
        ? Object.keys(rows[0]!).map((col) => ({ title: col, dataIndex: col, key: col }))
        : [];

  return (
    <div style={{ marginTop: 12, textAlign: 'left' }}>
      {reportSpec?.narrative?.insights && reportSpec.narrative.insights.length > 0 && (
        <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
          {reportSpec.narrative.insights.map((item) => (
            <li key={item}><Text>{item}</Text></li>
          ))}
        </ul>
      )}

      {isTable ? (
        <Table
          size="small"
          pagination={{ pageSize: 10 }}
          columns={tableColumns}
          dataSource={rows.map((row, index) => ({ ...row, key: index }))}
          scroll={{ x: true }}
        />
      ) : (
        <div ref={chartRef} style={{ width: '100%', height: 320, marginBottom: 12 }} />
      )}

      {reportArtifact?.status === 'failed' && reportArtifact.errorMessage && (
        <Text type="danger" style={{ display: 'block', marginBottom: 8 }}>
          {reportArtifact.errorMessage}
        </Text>
      )}

      <Space wrap style={{ marginTop: 8 }}>
        {(format === 'web' || format === 'inline') && (
          <Button size="small" onClick={handlePreview}>
            预览网页
          </Button>
        )}
        {format === 'word' && (
          <Button size="small" type="primary" onClick={handleDownload} disabled={!artifactReady}>
            下载 Word
          </Button>
        )}
        {format === 'web' && (
          <Button size="small" onClick={handleDownload}>
            下载 HTML
          </Button>
        )}
        {reportId && (
          <Button size="small" onClick={() => void handleShare()}>
            复制分享链接
          </Button>
        )}
      </Space>
    </div>
  );
}
