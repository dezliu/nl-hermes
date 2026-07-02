import type { NextFunction, Request, Response } from 'express';
import { createServiceApp, createLogger } from '@hermes/shared';
import { OpenSearchClient } from './lib/opensearch.js';
import { QdrantClient } from './lib/qdrant.js';
import { RetrieveService } from './services/retrieve-service.js';
import { IndexPipelineService } from './services/index-pipeline.js';
import { mountRagRoutes } from './routes/index.js';

export function createRagApp(options: { enableServiceAuth?: boolean; serviceToken?: string } = {}) {
  const logger = createLogger({ service: 'rag-service' });
  const os = new OpenSearchClient();
  const qdrant = new QdrantClient();

  const ctx = {
    retrieve: new RetrieveService(os, qdrant, logger),
    indexPipeline: new IndexPipelineService(os, qdrant, logger),
  };

  const app = createServiceApp('rag-service', options);
  mountRagRoutes(app, ctx);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('request.error', { err: err.message });
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  return app;
}
