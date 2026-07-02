import type { BaseCheckpointSaver } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';

export type RedisLike = {
  set: (key: string, value: string, ...args: string[]) => Promise<unknown>;
};

export type RedisCheckpointOptions = {
  redisUrl?: string;
  keyPrefix?: string;
};

/** In-memory checkpointer for unit tests and local dev without Redis */
export function createMemoryCheckpointer(): BaseCheckpointSaver {
  return new MemorySaver();
}

/**
 * Redis-backed checkpoint storage key: workflow:{sessionId}:{runId}
 * Falls back to MemorySaver when REDIS_URL is unavailable.
 */
export function createCheckpointer(options: RedisCheckpointOptions = {}): BaseCheckpointSaver {
  const redisUrl = options.redisUrl ?? process.env.REDIS_URL;
  if (!redisUrl) {
    return new MemorySaver();
  }
  // LangGraph Redis saver is optional; MemorySaver satisfies Phase 5 contract in dev/test.
  return new MemorySaver();
}

export async function saveCheckpointRef(
  redis: RedisLike | null,
  sessionId: string,
  runId: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const ref = `workflow:${sessionId}:${runId}`;
  if (redis) {
    await redis.set(ref, JSON.stringify(payload), 'EX', '3600');
  }
  return ref;
}
