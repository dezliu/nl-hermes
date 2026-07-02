import type { MetricPoint, RecordMetricEvent } from '@hermes/contracts';

export type HourlyBucket = {
  queries: number;
  cacheHits: number;
  retrievalScores: number[];
  tokens: number;
};

type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ...args: string[]) => Promise<unknown>;
  hgetall: (key: string) => Promise<Record<string, string>>;
  hincrby: (key: string, field: string, increment: number) => Promise<number>;
  hset: (key: string, field: string, value: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<number>;
};

function hourKey(date = new Date()): string {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 13);
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export class MetricsStore {
  private readonly memory = new Map<string, HourlyBucket>();

  constructor(private readonly redis: RedisLike | null = null) {}

  private bucketKey(hour: string) {
    return `metrics:hour:${hour}`;
  }

  private ensureBucket(hour: string): HourlyBucket {
    const existing = this.memory.get(hour);
    if (existing) return existing;
    const bucket: HourlyBucket = { queries: 0, cacheHits: 0, retrievalScores: [], tokens: 0 };
    this.memory.set(hour, bucket);
    return bucket;
  }

  async record(event: RecordMetricEvent): Promise<void> {
    const ts = event.timestamp ? new Date(event.timestamp) : new Date();
    const hour = hourKey(ts);
    const bucket = this.ensureBucket(hour);

    switch (event.type) {
      case 'query':
        bucket.queries += 1;
        break;
      case 'cache_hit':
        bucket.queries += 1;
        bucket.cacheHits += 1;
        break;
      case 'cache_miss':
        bucket.queries += 1;
        break;
      case 'retrieval_score':
        if (typeof event.value === 'number') bucket.retrievalScores.push(event.value);
        break;
      case 'token_usage':
        bucket.tokens += Number(event.value ?? 0);
        break;
      default:
        break;
    }

    if (this.redis) {
      const key = this.bucketKey(hour);
      if (event.type === 'query' || event.type === 'cache_hit' || event.type === 'cache_miss') {
        await this.redis.hincrby(key, 'queries', 1);
        if (event.type === 'cache_hit') await this.redis.hincrby(key, 'cacheHits', 1);
      }
      if (event.type === 'token_usage') {
        await this.redis.hincrby(key, 'tokens', Number(event.value ?? 0));
      }
      if (event.type === 'retrieval_score' && typeof event.value === 'number') {
        const field = `score:${bucket.retrievalScores.length}`;
        await this.redis.hset(key, field, String(event.value));
      }
      await this.redis.expire(key, 60 * 60 * 48);
    }
  }

  async getCacheHitTrend(hours = 24): Promise<{ points: MetricPoint[]; currentRate: number; previousDayRate: number }> {
    const points: MetricPoint[] = [];
    let currentQueries = 0;
    let currentHits = 0;
    let prevQueries = 0;
    let prevHits = 0;
    const now = Date.now();

    for (let i = hours - 1; i >= 0; i -= 1) {
      const at = new Date(now - i * 60 * 60 * 1000);
      const hour = hourKey(at);
      const bucket = this.ensureBucket(hour);
      if (this.redis) {
        const data = await this.redis.hgetall(this.bucketKey(hour));
        bucket.queries = Number(data.queries ?? bucket.queries);
        bucket.cacheHits = Number(data.cacheHits ?? bucket.cacheHits);
      }
      const rate = bucket.queries > 0 ? bucket.cacheHits / bucket.queries : 0;
      points.push({ timestamp: at.toISOString(), value: Math.round(rate * 1000) / 1000 });
      if (i < 24) {
        currentQueries += bucket.queries;
        currentHits += bucket.cacheHits;
      }
      if (i >= 24 && i < 48) {
        prevQueries += bucket.queries;
        prevHits += bucket.cacheHits;
      }
    }

    const currentRate = currentQueries > 0 ? currentHits / currentQueries : 0;
    const previousDayRate = prevQueries > 0 ? prevHits / prevQueries : currentRate;
    return { points, currentRate, previousDayRate };
  }

  async getRetrievalLowScoreRatio(hours = 6, threshold = 0.35): Promise<{ ratio: number; count: number; total: number }> {
    const now = Date.now();
    const scores: number[] = [];
    for (let i = 0; i < hours; i += 1) {
      const hour = hourKey(new Date(now - i * 60 * 60 * 1000));
      const bucket = this.ensureBucket(hour);
      scores.push(...bucket.retrievalScores);
    }
    const total = scores.length;
    const count = scores.filter((s) => s < threshold).length;
    return { ratio: total > 0 ? count / total : 0, count, total };
  }

  async getTokenTrend(days: 7 | 30): Promise<{ points: MetricPoint[]; total: number }> {
    const points: MetricPoint[] = [];
    let total = 0;
    const now = Date.now();
    for (let i = days - 1; i >= 0; i -= 1) {
      const at = new Date(now - i * 24 * 60 * 60 * 1000);
      let dayTotal = 0;
      for (let h = 0; h < 24; h += 1) {
        const hour = hourKey(new Date(at.getTime() + h * 60 * 60 * 1000));
        const bucket = this.ensureBucket(hour);
        dayTotal += bucket.tokens;
      }
      total += dayTotal;
      points.push({ timestamp: dayKey(at), value: dayTotal });
    }
    return { points, total };
  }

  /** Seed demo metrics for empty environments */
  seedDemoIfEmpty(): void {
    if (this.memory.size > 0) return;
    const now = Date.now();
    for (let i = 23; i >= 0; i -= 1) {
      const hour = hourKey(new Date(now - i * 60 * 60 * 1000));
      const bucket = this.ensureBucket(hour);
      bucket.queries = 40 + (i % 5) * 8;
      bucket.cacheHits = Math.floor(bucket.queries * (0.25 + (i % 7) * 0.05));
      bucket.tokens = 1200 + i * 90;
      for (let s = 0; s < 10; s += 1) {
        bucket.retrievalScores.push(0.2 + (s % 6) * 0.12);
      }
    }
  }
}