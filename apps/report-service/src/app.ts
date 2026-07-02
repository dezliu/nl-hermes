import type { NextFunction, Request, Response } from 'express';
import { createServiceApp, createLogger } from '@hermes/shared';
import { SqlExecutor } from './services/sql-executor.js';
import { ApiDataFetcher } from './services/api-fetcher.js';
import { TemplateMatcher } from './services/template-matcher.js';
import { ReportService } from './services/report-service.js';
import { mountReportRoutes } from './routes/index.js';

export function createReportApp(options: { enableServiceAuth?: boolean; serviceToken?: string } = {}) {
  const logger = createLogger({ service: 'report-service' });

  const ctx = {
    report: new ReportService(new SqlExecutor(), new ApiDataFetcher(), logger),
    templateMatcher: new TemplateMatcher(logger),
  };

  const app = createServiceApp('report-service', options);
  mountReportRoutes(app, ctx);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('request.error', { err: err.message });
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  return app;
}
