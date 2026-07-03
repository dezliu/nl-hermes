'use client';

import { useCallback, useEffect, useState } from 'react';
import { Spin } from 'antd';
import { formatPercent, monitorApi, adminAlertUrl, trendDirection, type Dashboard } from './lib/api';

function Sparkline({
  points,
  color,
  width = 280,
  height = 64,
}: {
  points: { timestamp: string; value: number }[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.value), 0.001);
  const min = Math.min(...points.map((p) => p.value));
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / Math.max(points.length - 1, 1)) * width;
    const y = height - ((p.value - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="2" points={coords.join(' ')} />
    </svg>
  );
}

function formatToken(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function MonitorPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [tokenRange, setTokenRange] = useState<'7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (range: '7d' | '30d') => {
    setLoading(true);
    setError(null);
    try {
      const data = await monitorApi.getDashboard(range);
      setDashboard(data.dashboard);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tokenRange);
  }, [load, tokenRange]);

  const cache = dashboard?.cacheHit;
  const alert = dashboard?.retrievalAlert;
  const token = dashboard?.tokenUsage;
  const sat = dashboard?.satisfaction;
  const cacheDir = cache ? trendDirection(cache.currentRate, cache.previousDayRate) : 'flat';

  if (loading && !dashboard) {
    return (
      <div className="monitor-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {alert?.active && (
        <div className="monitor-alert-banner">
          <div className="monitor-alert-icon">⚠</div>
          <div className="monitor-alert-text">
            <strong>检索质量预警</strong> — 低相似度评分占比{' '}
            <span className="mono">{formatPercent(alert.lowScoreRatio ?? 0)}</span>。{' '}
            <span>{alert.suggestion}</span>
          </div>
          {alert.alertId && (
            <a className="monitor-alert-action" href={adminAlertUrl(alert.alertId)} target="_blank" rel="noreferrer">
              查看告警详情 →
            </a>
          )}
        </div>
      )}

      <header className="monitor-header">
        <div className="monitor-header-brand">
          <div className="monitor-header-mark">灵</div>
          <div>
            <div className="monitor-header-title">灵析 · 监控看板</div>
            <div className="monitor-header-sub">NL Hermes Operations Center</div>
          </div>
        </div>
        <div className="monitor-header-meta">
          <span className="live-dot">实时</span>
          <span className="mono">
            更新于 {lastUpdated ? lastUpdated.toLocaleString('zh-CN') : '-'}
          </span>
          <button type="button" className="monitor-refresh-btn" onClick={() => void load(tokenRange)} disabled={loading}>
            ↻ 刷新
          </button>
        </div>
      </header>

      <main className="monitor-dashboard">
        {error && (
          <div className="monitor-alert-banner" style={{ marginBottom: 16, borderRadius: 8 }}>
            <div className="monitor-alert-icon">✕</div>
            <div className="monitor-alert-text">
              <strong>加载失败</strong> — <span>{error}</span>
            </div>
          </div>
        )}

        <div className="kpi-row">
          <div className="kpi-card cyan">
            <div className="kpi-label">查询重复率 · 24h</div>
            <div className="kpi-value">{formatPercent(cache?.currentRate ?? 0)}</div>
            <div className={`kpi-delta ${cacheDir === 'up' ? 'up' : cacheDir === 'down' ? 'down' : ''}`}>
              {cacheDir === 'up' ? '▲ 较昨日升' : cacheDir === 'down' ? '▼ 较昨日降' : '— 持平'}
            </div>
          </div>
          <div className="kpi-card purple">
            <div className="kpi-label">Token 消耗 · {tokenRange === '7d' ? '近7天' : '近30天'}</div>
            <div className="kpi-value">{formatToken(token?.total ?? 0)}</div>
            <div className="kpi-delta">日均 {formatToken(token?.dailyAverage ?? 0)}</div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-label">用户满意度 · 30d</div>
            <div className="kpi-value">{formatPercent(sat?.satisfactionRate ?? 0)}</div>
            <div className="kpi-delta">
              👍 {sat?.upCount ?? 0} · 👎 {sat?.downCount ?? 0}
            </div>
          </div>
          <div className="kpi-card yellow">
            <div className="kpi-label">缓存解读</div>
            <div className="kpi-value" style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
              {cache?.interpretation ?? '—'}
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-panel span-2">
            <div className="chart-header">
              <div>
                <div className="chart-title">查询重复率趋势</div>
                <div className="chart-subtitle">近 24 小时 · 相同或高度相似问题占比</div>
              </div>
              <span className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>
                24H
              </span>
            </div>
            <div className="chart-body">
              <Sparkline points={cache?.trend ?? []} color="#06B6D4" width={800} height={120} />
            </div>
          </div>

          <div className="chart-panel">
            <div className="chart-header">
              <div>
                <div className="chart-title">Token 消耗统计</div>
                <div className="chart-subtitle">
                  日均 {formatToken(token?.dailyAverage ?? 0)} · 区间总计 {formatToken(token?.total ?? 0)}
                </div>
              </div>
              <div className="time-tabs">
                <button
                  type="button"
                  className={`time-tab${tokenRange === '7d' ? ' active' : ''}`}
                  onClick={() => setTokenRange('7d')}
                >
                  近 7 天
                </button>
                <button
                  type="button"
                  className={`time-tab${tokenRange === '30d' ? ' active' : ''}`}
                  onClick={() => setTokenRange('30d')}
                >
                  近 30 天
                </button>
              </div>
            </div>
            <div className="chart-body">
              <Sparkline points={token?.trend ?? []} color="#8B5CF6" width={360} height={120} />
            </div>
          </div>
        </div>

        <div className="chart-panel sat-panel">
          <div className="chart-header">
            <div>
              <div className="chart-title">用户满意度 · 近 30 天</div>
              <div className="chart-subtitle">
                最近更新：{sat?.updatedAt ? new Date(sat.updatedAt).toLocaleString('zh-CN') : '-'}
              </div>
            </div>
          </div>
          <div className="chart-body">
            <div className="sat-stats">
              <div>
                <div className="sat-stat-label">满意度</div>
                <div className="sat-stat-value">{formatPercent(sat?.satisfactionRate ?? 0)}</div>
              </div>
              <div>
                <div className="sat-stat-label">点赞</div>
                <div className="sat-stat-value up">{sat?.upCount ?? 0}</div>
              </div>
              <div>
                <div className="sat-stat-label">点踩</div>
                <div className="sat-stat-value down">{sat?.downCount ?? 0}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
              {(sat?.byMode ?? []).map((m) => (
                <div key={m.mode}>
                  <span className="tag-pill">{m.mode === 'sql' ? 'SQL 模式' : '报表模式'}</span>
                  <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>
                    {formatPercent(m.rate)}（{m.up}/{m.up + m.down}）
                  </span>
                </div>
              ))}
            </div>
            {(sat?.topDownReasons?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>点踩 Top 原因</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sat!.topDownReasons.map((r) => (
                    <span key={r.reason} className="tag-pill">
                      {r.reason} ({r.count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
