import type { NextFunction, Request, Response } from 'express';
import { createServiceApp, createLogger } from '@hermes/shared';
import { createChatRepository } from './repositories/chat-repository.js';
import { ChatService } from './services/chat-service.js';
import { createInMemoryRedis, createRedisClient, GenerationLock, InterruptRegistry } from './lib/redis.js';
import { mountChatRoutes } from './routes/index.js';
import { mountUserFeatureRoutes } from './routes/user-features.js';
import { createConversationService } from './services/conversation-service.js';
import { createFeedbackService } from './services/feedback-service.js';
import { createTemplateRecommendationService } from './services/template-recommendation-service.js';
import { createTemplateApplyService } from './services/template-apply-service.js';
import { createMetadataTemplateClient } from './lib/metadata-template-client.js';
import { createMetadataClosedLoopClient } from './lib/metadata-closed-loop-client.js';

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
  const metadataTemplates = createMetadataTemplateClient();
  const closedLoop = createMetadataClosedLoopClient();
  const templateApply = createTemplateApplyService(metadataTemplates);
  const chat = new ChatService({
    logger,
    repo,
    lock: new GenerationLock(redis),
    interrupts: new InterruptRegistry(),
    redis,
    dbEnabled: options.dbEnabled !== false,
    templateApply,
    closedLoop,
  });

  const app = createServiceApp('orchestrator', options);
  mountChatRoutes(app, chat);
  mountUserFeatureRoutes(app, {
    conversations: createConversationService(repo),
    feedback: createFeedbackService(repo, closedLoop),
    templateRecommendations: createTemplateRecommendationService(),
    templateApply,
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('request.error', { err: err.message });
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  return { app, chat };
}
