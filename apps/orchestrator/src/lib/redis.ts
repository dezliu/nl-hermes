export type RedisLike = {
  set: (key: string, value: string, ...args: string[]) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<unknown>;
};

export class GenerationLock {
  constructor(private readonly redis: RedisLike | null, private readonly ttlSec = 300) {}

  private key(userId: string) {
    return `user:${userId}:generating`;
  }

  async acquire(userId: string, runId: string): Promise<boolean> {
    if (!this.redis) return true;
    const result = await this.redis.set(this.key(userId), runId, 'EX', String(this.ttlSec), 'NX');
    return result === 'OK';
  }

  async release(userId: string, runId: string): Promise<void> {
    if (!this.redis) return;
    const current = await this.redis.get(this.key(userId));
    if (current === runId) await this.redis.del(this.key(userId));
  }
}

export class InterruptRegistry {
  private readonly flags = new Map<string, boolean>();

  mark(runId: string) {
    this.flags.set(runId, true);
  }

  isInterrupted(runId: string) {
    return this.flags.get(runId) === true;
  }

  clear(runId: string) {
    this.flags.delete(runId);
  }
}

export function createInMemoryRedis(): RedisLike {
  const store = new Map<string, { value: string; expiresAt?: number }>();
  return {
    async set(key, value, ...args) {
      let expiresAt: number | undefined;
      const nx = args.includes('NX');
      if (nx && store.has(key)) return null;
      const exIdx = args.indexOf('EX');
      if (exIdx >= 0) expiresAt = Date.now() + Number(args[exIdx + 1]) * 1000;
      store.set(key, { value, expiresAt });
      return 'OK';
    },
    async get(key) {
      const item = store.get(key);
      if (!item) return null;
      if (item.expiresAt && item.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    async del(key) {
      store.delete(key);
    },
  };
}

async function connectRedis(url?: string): Promise<RedisLike | null> {
  if (!url) return null;
  try {
    const mod = await import('ioredis');
    const RedisCtor = mod.default as unknown as new (url: string, opts: object) => RedisLike & { connect: () => Promise<void> };
    const client = new RedisCtor(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await client.connect();
    return client;
  } catch {
    return null;
  }
}

export async function createRedisClient(url = process.env.REDIS_URL): Promise<RedisLike | null> {
  return connectRedis(url);
}
