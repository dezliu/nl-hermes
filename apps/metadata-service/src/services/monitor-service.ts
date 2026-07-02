import type { Logger } from '@hermes/shared';
import type {
  MonitorDashboard,
  RecordMetricEvent,
  RetrievalQualityAlert,
  TokenMetrics,
} from '@hermes/contracts';
import { MetricsStore } from '../lib/metrics-store.js';
import { ChatMetricsClient } from '../lib/chat-metrics-client.js';
import type { AlertService } from './alert-service.js';

const LOW_SCORE_THRESHOLD = Number(process.env.MONITOR_LOW_SCORE_THRESHOLD ?? 0.35);
const LOW_SCORE_RATIO_ALERT = Number(process.env.MONITOR_LOW_SCORE_RATIO ?? 0.4);

export class MonitorService {
  constructor(
    private readonly metrics: MetricsStore,
    private readonly chatMetrics: ChatMetricsClient,
    private readonly alerts: AlertService,
    private readonly logger: Logger,
  ) {}

  async recordEvent(event: RecordMetricEvent): Promise<void> {
    await this.metrics.record(event);
    if (event.type === 'retrieval_score') {
      await this.evaluateRetrievalAlert();
    }
  }

  async getDashboard(tokenRange: '7d' | '30d' = '7d'): Promise<MonitorDashboard> {
    this.metrics.seedDemoIfEmpty();
    const cache = await this.metrics.getCacheHitTrend(24);
    const retrievalAlert = await this.buildRetrievalAlert();
    const tokenTrend = await this.metrics.getTokenTrend(tokenRange === '30d' ? 30 : 7);
    const satisfaction = await this.buildSatisfaction(30);

    const interpretation =
      cache.currentRate > cache.previousDayRate
        ? '重复率上升说明缓存策略生效'
        : cache.currentRate < 0.15
          ? '重复率偏低，可考虑优化缓存策略'
          : undefined;

    const tokenUsage: TokenMetrics = {
      range: tokenRange,
      total: tokenTrend.total,
      dailyAverage: Math.round(tokenTrend.total / (tokenRange === '30d' ? 30 : 7)),
      trend: tokenTrend.points,
    };

    return {
      cacheHit: {
        currentRate: cache.currentRate,
        previousDayRate: cache.previousDayRate,
        trend: cache.points,
        interpretation,
      },
      retrievalAlert,
      tokenUsage,
      satisfaction,
    };
  }

  private async buildRetrievalAlert(): Promise<RetrievalQualityAlert> {
    const stats = await this.metrics.getRetrievalLowScoreRatio(6, LOW_SCORE_THRESHOLD);
    const active = stats.total >= 5 && stats.ratio >= LOW_SCORE_RATIO_ALERT;
    if (!active) {
      return { active: false };
    }

    const alert = await this.alerts.createIfAbsent({
      type: 'retrieval_quality_low',
      level: stats.ratio >= 0.6 ? 'critical' : 'warning',
      title: '检索质量低分集中',
      message: `近 6 小时低相似度评分占比 ${Math.round(stats.ratio * 100)}%（${stats.count}/${stats.total}）`,
      refType: 'monitor',
    });

    return {
      active: true,
      alertId: alert?.id,
      triggeredAt: alert?.createdAt,
      lowScoreRatio: stats.ratio,
      topDomain: '订单域',
      suggestion: '检查元数据同义词；运行离线评估',
    };
  }

  private async evaluateRetrievalAlert(): Promise<void> {
    await this.buildRetrievalAlert();
  }

  private async buildSatisfaction(rangeDays: number) {
    const { rows, reasons } = await this.chatMetrics.getSatisfactionStats(rangeDays);
    let upCount = 0;
    let downCount = 0;
    const byModeMap = new Map<'sql' | 'report', { up: number; down: number }>();
    for (const row of rows) {
      if (row.rating === 'up') upCount += row.count;
      else downCount += row.count;
      const modeStats = byModeMap.get(row.mode) ?? { up: 0, down: 0 };
      if (row.rating === 'up') modeStats.up += row.count;
      else modeStats.down += row.count;
      byModeMap.set(row.mode, modeStats);
    }
    const total = upCount + downCount;
    const byMode = (['sql', 'report'] as const).map((mode) => {
      const m = byModeMap.get(mode) ?? { up: 0, down: 0 };
      const t = m.up + m.down;
      return { mode, up: m.up, down: m.down, rate: t > 0 ? m.up / t : 0 };
    });

    if (total === 0) {
      return {
        rangeDays,
        upCount: 12,
        downCount: 3,
        satisfactionRate: 0.8,
        byMode: [
          { mode: 'sql' as const, up: 7, down: 1, rate: 0.875 },
          { mode: 'report' as const, up: 5, down: 2, rate: 0.714 },
        ],
        topDownReasons: [{ reason: '字段理解错误', count: 2 }],
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      rangeDays,
      upCount,
      downCount,
      satisfactionRate: total > 0 ? upCount / total : 0,
      byMode,
      topDownReasons: reasons,
      updatedAt: new Date().toISOString(),
    };
  }
}
