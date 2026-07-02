import type { Express, Request, Response, NextFunction } from 'express';
import { getTraceId } from '@hermes/shared';
import type { EvalSetService } from '../services/eval-set-service.js';
import type { EvalRunService } from '../services/eval-run-service.js';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

export function mountEvalRoutes(
  app: Express,
  ctx: { sets: EvalSetService; runs: EvalRunService },
): void {
  app.get('/v1/eval/sets', asyncHandler(async (_req, res) => {
    // #region agent log
    fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd26445' },
      body: JSON.stringify({
        sessionId: 'd26445',
        runId: 'request',
        hypothesisId: 'C',
        location: 'eval-service/routes/index.ts:GET /v1/eval/sets',
        message: 'listSets handler reached',
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    res.json({ items: await ctx.sets.listSets() });
  }));

  app.post('/v1/eval/sets', asyncHandler(async (req, res) => {
    const item = await ctx.sets.createSet(req.body);
    res.status(201).json({ item });
  }));

  app.get('/v1/eval/sets/:id', asyncHandler(async (req, res) => {
    const item = await ctx.sets.getSet(param(req.params.id));
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item });
  }));

  app.patch('/v1/eval/sets/:id', asyncHandler(async (req, res) => {
    const item = await ctx.sets.updateSet(param(req.params.id), req.body);
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item });
  }));

  app.delete('/v1/eval/sets/:id', asyncHandler(async (req, res) => {
    const ok = await ctx.sets.deleteSet(param(req.params.id));
    res.json({ ok });
  }));

  app.post('/v1/eval/sets/:id/cases', asyncHandler(async (req, res) => {
    const item = await ctx.sets.addCase(param(req.params.id), req.body);
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.status(201).json({ item });
  }));

  app.post('/v1/eval/sets/:id/cases/import', asyncHandler(async (req, res) => {
    const items = await ctx.sets.importCases(param(req.params.id), req.body?.cases ?? []);
    res.status(201).json({ items });
  }));

  app.patch('/v1/eval/cases/:id', asyncHandler(async (req, res) => {
    const item = await ctx.sets.updateCase(param(req.params.id), req.body);
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item });
  }));

  app.delete('/v1/eval/cases/:id', asyncHandler(async (req, res) => {
    const ok = await ctx.sets.deleteCase(param(req.params.id));
    res.json({ ok });
  }));

  app.get('/v1/eval/sets/:id/runs', asyncHandler(async (req, res) => {
    res.json({ items: await ctx.runs.listRuns(param(req.params.id)) });
  }));

  app.post('/v1/eval/runs', asyncHandler(async (req, res) => {
    try {
      const item = await ctx.runs.startRun(req.body, getTraceId(req));
      res.status(202).json({ item });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'start_failed';
      res.status(400).json({ error: message });
    }
  }));

  app.get('/v1/eval/runs/:id', asyncHandler(async (req, res) => {
    const item = await ctx.runs.getRun(param(req.params.id));
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item });
  }));

  app.post('/v1/eval/runs/:id/cancel', asyncHandler(async (req, res) => {
    const ok = await ctx.runs.cancelRun(param(req.params.id));
    res.json({ ok });
  }));

  app.get('/v1/eval/runs/:id/export', asyncHandler(async (req, res) => {
    try {
      const markdown = await ctx.runs.exportReport(param(req.params.id));
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="eval-report-${param(req.params.id)}.md"`);
      res.send(markdown);
    } catch {
      res.status(404).json({ error: 'not_found' });
    }
  }));
}
