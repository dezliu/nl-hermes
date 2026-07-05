'use client';

import { useEffect, useState } from 'react';
import { Button, Spin, Typography, message } from 'antd';
import type { ReportArtifact, ReportSpec } from '@hermes/contracts';
import { DashboardViewer } from '../../../components/DashboardViewer';

const GATEWAY_BASE = process.env.NEXT_PUBLIC_GRAPHQL_URL?.replace(/\/graphql$/, '') ?? 'http://localhost:4000';
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? 'demo-user';

export default function DashboardPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [spec, setSpec] = useState<ReportSpec | undefined>();
  const [artifact, setArtifact] = useState<ReportArtifact | undefined>();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${GATEWAY_BASE}/api/reports/${params.id}?userId=${encodeURIComponent(DEMO_USER_ID)}`,
        );
        if (!res.ok) throw new Error('加载失败');
        const data = (await res.json()) as { spec: ReportSpec; artifact: ReportArtifact };
        setSpec(data.spec);
        setArtifact(data.artifact);
      } catch {
        message.error('大屏不存在或尚未就绪');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!spec || spec.outputFormat !== 'dashboard') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220', color: '#e5e7eb' }}>
        <Typography.Text>大屏不存在</Typography.Text>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b1220', padding: 16 }}>
      <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10 }}>
        <Button
          type="primary"
          onClick={() => window.open(`${GATEWAY_BASE}/api/reports/${params.id}/preview`, '_blank')}
        >
          新窗口预览
        </Button>
      </div>
      <DashboardViewer reportSpec={spec} reportArtifact={artifact} />
    </div>
  );
}
