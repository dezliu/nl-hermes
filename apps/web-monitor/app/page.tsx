'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Segmented, Spin, Statistic, Tag } from 'antd';
import { formatPercent, monitorApi, adminAlertUrl, trendDirection, type Dashboard } from './lib/api';

function Sparkline({ points, color }: { points: { timestamp: string; value: number }[]; color: string }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.value), 0.001);
  const min = Math.min(...points.map((p) => p.value));
  const range = max - min || 1;
  const width = 280;
  const height = 64;
  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * width;
    const y = height - ((p.value - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="2" points={coords.join(' ')} />
    </svg>
  );
}

export default function MonitorPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tokenRange, setTokenRange] = useState<'7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (range: '7d' | '30d') => {
    setLoading(true);
    setError(null);
    try {
      const data = await monitorApi.getDashboard(range);
      setDashboard(data.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(tokenRange);
  }, [tokenRange]);

  if (loading && !dashboard) {
    return (
      <main style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </main>
    );
  }

  const cache = dashboard?.cacheHit;
  const alert = dashboard?.retrievalAlert;
  const token = dashboard?.tokenUsage;
  const sat = dashboard?.satisfaction;
  const cacheDir = cache ? trendDirection(cache.currentRate, cache.previousDayRate) : 'flat';

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>监控看板</h1>
        <p style={{ color: '#64748B', margin: '6px 0 0' }}>近 24 小时运行质量、成本与用户满意度一览</p>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      {alert?.active && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="检索质量预警"
          description={
            <div>
              低分占比 {formatPercent(alert.lowScoreRatio ?? 0)} · {alert.suggestion}
              {alert.alertId && (
                <div style={{ marginTop: 8 }}>
                  <a href={adminAlertUrl(alert.alertId)} target="_blank" rel="noreferrer">
                    查看管理端告警详情
                  </a>
                </div>
              )}
            </div>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="缓存命中 · 近 24 小时">
            <Statistic
              title="当前查询重复率"
              value={formatPercent(cache?.currentRate ?? 0)}
              suffix={
                <Tag color={cacheDir === 'up' ? 'green' : cacheDir === 'down' ? 'red' : 'default'}>
                  {cacheDir === 'up' ? '较昨日升' : cacheDir === 'down' ? '较昨日降' : '持平'}
                </Tag>
              }
            />
            <p style={{ color: '#64748B', fontSize: 13 }}>{cache?.interpretation}</p>
            <Sparkline points={cache?.trend ?? []} color="#3B82F6" />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Token 消耗"
            extra={
              <Segmented
                size="small"
                value={tokenRange}
                options={[
                  { label: '近 7 天', value: '7d' },
                  { label: '近 30 天', value: '30d' },
                ]}
                onChange={(v) => setTokenRange(v as '7d' | '30d')}
              />
            }
          >
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="区间总消耗" value={token?.total ?? 0} />
              </Col>
              <Col span={12}>
                <Statistic title="日均消耗" value={token?.dailyAverage ?? 0} />
              </Col>
            </Row>
            <Sparkline points={token?.trend ?? []} color="#8B5CF6" />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="用户满意度 · 近 30 天">
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Statistic title="满意度" value={formatPercent(sat?.satisfactionRate ?? 0)} />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic title="点赞" value={sat?.upCount ?? 0} valueStyle={{ color: '#16A34A' }} />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic title="点踩" value={sat?.downCount ?? 0} valueStyle={{ color: '#DC2626' }} />
              </Col>
            </Row>
            <div style={{ marginTop: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {(sat?.byMode ?? []).map((m) => (
                <div key={m.mode}>
                  <Tag>{m.mode === 'sql' ? 'SQL 模式' : '报表模式'}</Tag>
                  <span style={{ marginLeft: 8 }}>{formatPercent(m.rate)}（{m.up}/{m.up + m.down}）</span>
                </div>
              ))}
            </div>
            {(sat?.topDownReasons?.length ?? 0) > 0 && (
              <div style={{ marginTop: 12 }}>
                <strong>点踩 Top 原因：</strong>
                {sat!.topDownReasons.map((r) => (
                  <Tag key={r.reason} style={{ marginTop: 8 }}>
                    {r.reason} ({r.count})
                  </Tag>
                ))}
              </div>
            )}
            <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 12 }}>
              最近更新：{sat?.updatedAt ? new Date(sat.updatedAt).toLocaleString('zh-CN') : '-'}
            </p>
          </Card>
        </Col>
      </Row>
    </main>
  );
}
