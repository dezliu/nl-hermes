import type { NextFunction, Request, Response } from 'express';
import { createServiceApp, createLogger } from '@hermes/shared';
import { bindEvalDb } from '@hermes/orm-schemas';
import {
  EvalCaseRepository,
  EvalResultRepository,
  EvalRunRepository,
  EvalSetRepository,
} from './repositories/eval-repository.js';
import { EvalSetService } from './services/eval-set-service.js';
import { EvalRunService } from './services/eval-run-service.js';
import { EvalCaseRunner } from './services/eval-case-runner.js';
import { mountEvalRoutes } from './routes/index.js';

export function createEvalApp(options: { enableServiceAuth?: boolean; serviceToken?: string } = {}) {
  const logger = createLogger({ service: 'eval-service' });
  bindEvalDb();

  const repos = {
    sets: new EvalSetRepository(),
    cases: new EvalCaseRepository(),
    runs: new EvalRunRepository(),
    results: new EvalResultRepository(),
  };

  const ctx = {
    sets: new EvalSetService(repos.sets, repos.cases, logger),
    runs: new EvalRunService(repos.sets, repos.cases, repos.runs, repos.results, new EvalCaseRunner(), logger),
  };

  const app = createServiceApp('eval-service', options);
  mountEvalRoutes(app, ctx);

  app.get('/v1/eval/meta', (_req, res) => {
    res.json({ service: 'eval-service', evalApi: true, routes: ['sets', 'cases', 'runs'] });
  });

  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd26445' },
    body: JSON.stringify({
      sessionId: 'd26445',
      runId: 'startup',
      hypothesisId: 'A',
      location: 'eval-service/app.ts:createEvalApp',
      message: 'eval API routes mounted',
      data: { evalApi: true, routeCount: 14 },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('request.error', { err: err.message });
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  return app;
}
