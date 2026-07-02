import type { NextFunction, Request, Response } from 'express';
import { createServiceApp, createLogger } from '@hermes/shared';
import { bindMetaDb } from '@hermes/orm-schemas';
import { createRepositories } from './repositories/index.js';
import { DatasourceService } from './services/datasource-app-service.js';
import { MetaService } from './services/meta-service.js';
import { PromptService } from './services/prompt-service.js';
import { SettingsService } from './services/settings-service.js';
import { TemplateService } from './services/template-service.js';
import { BusinessKnowledgeService } from './services/business-knowledge-service.js';
import { mountRoutes } from './routes/index.js';
import { mountMonitorRoutes } from './routes/monitor-routes.js';
import { AlertRepository } from './repositories/alert-repository.js';
import { AlertService } from './services/alert-service.js';
import { MonitorService } from './services/monitor-service.js';
import { MetricsStore } from './lib/metrics-store.js';
import { ChatMetricsClient } from './lib/chat-metrics-client.js';

export function createMetadataApp(options: { enableServiceAuth?: boolean; serviceToken?: string } = {}) {
  const logger = createLogger({ service: 'metadata-service' });
  bindMetaDb();

  const repos = createRepositories(logger);
  const ctx = {
    datasource: new DatasourceService(repos, logger),
    meta: new MetaService(repos, logger),
    prompt: new PromptService(repos, logger),
    settings: new SettingsService(repos, logger),
    template: new TemplateService(repos, logger),
    businessKnowledge: new BusinessKnowledgeService(repos, logger),
  };

  const alertRepo = new AlertRepository();
  const alertService = new AlertService(alertRepo, logger);
  const metricsStore = new MetricsStore();
  const monitorService = new MonitorService(metricsStore, new ChatMetricsClient(), alertService, logger);

  const app = createServiceApp('metadata-service', options);
  mountRoutes(app, ctx);
  mountMonitorRoutes(app, { monitor: monitorService, alerts: alertService });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('request.error', { err: err.message });
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  return app;
}
