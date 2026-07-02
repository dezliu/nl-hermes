import type { NextFunction, Request, Response } from 'express';
import { createServiceApp, createLogger } from '@hermes/shared';
import { createChatRepository } from './repositories/chat-repository.js';
import { ChatService } from './services/chat-service.js';
import { createInMemoryRedis, createRedisClient, GenerationLock, InterruptRegistry } from './lib/redis.js';
import { mountChatRoutes } from './routes/index.js';

export type OrchestratorAppOptions = {
  enableServiceAuth?: boolean;
  serviceToken?: string;
  dbEnabled?: boolean;
  redis?: ReturnType<typeof createInMemoryRedis>;
};

export async function createOrchestratorApp(options: OrchestratorAppOptions = {}) {
  const logger = createLogger({ service: 'orchestrator' });
  const redis = options.redis ?? (await createRedisClient()) ?? createInMemoryRedis();
  const repo = createChatRepository(options.dbEnabled !== false);
  const chat = new ChatService({
    logger,
    repo,
    lock: new GenerationLock(redis),
    interrupts: new InterruptRegistry(),
    redis,
    dbEnabled: options.dbEnabled !== false,
  });

  const app = createServiceApp('orchestrator', options);
  mountChatRoutes(app, chat);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('request.error', { err: err.message });
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  return { app, chat };
}
