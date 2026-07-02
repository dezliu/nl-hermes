import { describe, it, expect } from 'vitest';
import { MetricsStore } from '../lib/metrics-store.js';

describe('MetricsStore', () => {
  it('records cache hit events and computes trend', async () => {
    const store = new MetricsStore();
    await store.record({ type: 'cache_hit' });
    await store.record({ type: 'cache_miss' });
    await store.record({ type: 'cache_hit' });
    const trend = await store.getCacheHitTrend(1);
    expect(trend.currentRate).toBeGreaterThan(0);
    expect(trend.points.length).toBe(1);
  });

  it('detects retrieval low score ratio', async () => {
    const store = new MetricsStore();
    for (let i = 0; i < 8; i += 1) {
      await store.record({ type: 'retrieval_score', value: i % 2 === 0 ? 0.2 : 0.7 });
    }
    const stats = await store.getRetrievalLowScoreRatio(1, 0.35);
    expect(stats.total).toBe(8);
    expect(stats.ratio).toBe(0.5);
  });

  it('seeds demo metrics when empty', () => {
    const store = new MetricsStore();
    store.seedDemoIfEmpty();
    expect(store['memory'].size).toBeGreaterThan(0);
  });
});
