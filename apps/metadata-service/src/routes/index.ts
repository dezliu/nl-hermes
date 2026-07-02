import type { Express, Request, Response, NextFunction } from 'express';
import { getTraceId, HTTP_HEADERS } from '@hermes/shared';
import type { DatasourceService } from '../services/datasource-app-service.js';
import type { MetaService } from '../services/meta-service.js';
import type { PromptService } from '../services/prompt-service.js';
import type { SettingsService } from '../services/settings-service.js';
import type { TemplateService } from '../services/template-service.js';
import type { BusinessKnowledgeService } from '../services/business-knowledge-service.js';

export type ServiceContext = {
  datasource: DatasourceService;
  meta: MetaService;
  prompt: PromptService;
  settings: SettingsService;
  template: TemplateService;
  businessKnowledge: BusinessKnowledgeService;
};

function actorId(req: Request): string | undefined {
  return (req.headers[HTTP_HEADERS.USER_ID.toLowerCase()] as string) ?? undefined;
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

export function mountRoutes(app: Express, ctx: ServiceContext): void {
  // Datasources
  app.get('/v1/datasources', asyncHandler(async (_req, res) => {
    res.json({ items: await ctx.datasource.list() });
  }));

  app.post('/v1/datasources', asyncHandler(async (req, res) => {
    const item = await ctx.datasource.create(req.body, getTraceId(req));
    res.status(201).json({ item });
  }));

  app.get('/v1/datasources/:id', asyncHandler(async (req, res) => {
    const item = await ctx.datasource.get(param(req.params.id));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.patch('/v1/datasources/:id', asyncHandler(async (req, res) => {
    const id = param(req.params.id);
    const item = await ctx.datasource.update(id, req.body, actorId(req), getTraceId(req));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.delete('/v1/datasources/:id', asyncHandler(async (req, res) => {
    const ok = await ctx.datasource.remove(param(req.params.id), actorId(req), getTraceId(req));
    res.json({ ok });
  }));

  app.post('/v1/datasources/:id/test', asyncHandler(async (req, res) => {
    const result = await ctx.datasource.testConnection(param(req.params.id), getTraceId(req));
    if (!result) { res.status(404).json({ error: 'not_found' }); return; }
    res.json(result);
  }));

  app.post('/v1/datasources/:id/sync', asyncHandler(async (req, res) => {
    try {
      const result = await ctx.datasource.sync(param(req.params.id), getTraceId(req));
      if (!result) { res.status(404).json({ error: 'not_found' }); return; }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'sync_failed' });
    }
  }));

  // Metadata
  app.get('/v1/datasources/:id/tables', asyncHandler(async (req, res) => {
    const inLib = req.query.inQueryLibrary === 'true' ? true : req.query.inQueryLibrary === 'false' ? false : undefined;
    const items = await ctx.meta.listTables(param(req.params.id), inLib);
    res.json({ items });
  }));

  app.post('/v1/datasources/:id/tables', asyncHandler(async (req, res) => {
    const item = await ctx.meta.createManualTable(param(req.params.id), req.body, actorId(req), getTraceId(req));
    res.status(201).json({ item });
  }));

  app.get('/v1/meta/tables/:id', asyncHandler(async (req, res) => {
    const item = await ctx.meta.getTable(param(req.params.id));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.patch('/v1/meta/tables/:id', asyncHandler(async (req, res) => {
    const item = await ctx.meta.updateTable(param(req.params.id), req.body, actorId(req), getTraceId(req));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.patch('/v1/meta/fields/:id', asyncHandler(async (req, res) => {
    const item = await ctx.meta.updateField(param(req.params.id), req.body, actorId(req), getTraceId(req));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.get('/v1/meta/query-library', asyncHandler(async (_req, res) => {
    res.json({ items: await ctx.meta.listQueryLibraryFields() });
  }));

  // Prompts
  app.get('/v1/prompts/roles', asyncHandler(async (_req, res) => {
    res.json({ items: await ctx.prompt.listRoles() });
  }));

  app.get('/v1/prompts', asyncHandler(async (req, res) => {
    const roleId = req.query.roleId === 'default' ? null : (req.query.roleId as string | undefined);
    res.json({ items: await ctx.prompt.listVersions(roleId) });
  }));

  app.get('/v1/prompts/:roleId/active', asyncHandler(async (req, res) => {
    const roleId = param(req.params.roleId) === 'default' ? null : param(req.params.roleId);
    const item = await ctx.prompt.getActive(roleId);
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.post('/v1/prompts', asyncHandler(async (req, res) => {
    const item = await ctx.prompt.saveVersion(req.body, getTraceId(req));
    res.status(201).json({ item });
  }));

  app.post('/v1/prompts/versions/:id/activate', asyncHandler(async (req, res) => {
    const item = await ctx.prompt.rollback(param(req.params.id), actorId(req), getTraceId(req));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  // Settings
  app.get('/v1/settings', asyncHandler(async (req, res) => {
    res.json({ items: await ctx.settings.list(req.query.category as string | undefined) });
  }));

  app.get('/v1/settings/:category/:key', asyncHandler(async (req, res) => {
    const item = await ctx.settings.get(param(req.params.category), param(req.params.key));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.put('/v1/settings', asyncHandler(async (req, res) => {
    const item = await ctx.settings.upsert(req.body, getTraceId(req));
    res.json({ item });
  }));

  // Templates
  app.get('/v1/templates/sql', asyncHandler(async (req, res) => {
    res.json({ items: await ctx.template.listSql(req.query.status as string | undefined) });
  }));

  app.post('/v1/templates/sql', asyncHandler(async (req, res) => {
    const item = await ctx.template.createSql(req.body, getTraceId(req));
    res.status(201).json({ item });
  }));

  app.patch('/v1/templates/sql/:id', asyncHandler(async (req, res) => {
    const item = await ctx.template.updateSql(param(req.params.id), req.body, getTraceId(req));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.get('/v1/templates/report', asyncHandler(async (req, res) => {
    res.json({ items: await ctx.template.listReport(req.query.status as string | undefined) });
  }));

  app.post('/v1/templates/report', asyncHandler(async (req, res) => {
    const item = await ctx.template.createReport(req.body, getTraceId(req));
    res.status(201).json({ item });
  }));

  app.patch('/v1/templates/report/:id', asyncHandler(async (req, res) => {
    const item = await ctx.template.updateReport(param(req.params.id), req.body, getTraceId(req));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  // Business knowledge
  app.get('/v1/business-knowledge', asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    res.json({ items: await ctx.businessKnowledge.list({ status, category }) });
  }));

  app.get('/v1/business-knowledge/:id', asyncHandler(async (req, res) => {
    const item = await ctx.businessKnowledge.get(param(req.params.id));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));

  app.post('/v1/business-knowledge', asyncHandler(async (req, res) => {
    const item = await ctx.businessKnowledge.create(
      { ...req.body, createdBy: actorId(req) },
      getTraceId(req),
    );
    res.status(201).json({ item });
  }));

  app.patch('/v1/business-knowledge/:id', asyncHandler(async (req, res) => {
    const item = await ctx.businessKnowledge.update(param(req.params.id), req.body, getTraceId(req));
    if (!item) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ item });
  }));
}
