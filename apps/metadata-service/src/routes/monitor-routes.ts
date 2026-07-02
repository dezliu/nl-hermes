import type { Express, Request, Response, NextFunction } from 'express';
import { HTTP_HEADERS } from '@hermes/shared';
import type { AlertService } from '../services/alert-service.js';
import type { MonitorService } from '../services/monitor-service.js';

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0]! : value;
}

function actorId(req: Request): string | undefined {
  return (req.headers[HTTP_HEADERS.USER_ID.toLowerCase()] as string) ?? undefined;
}

export function mountMonitorRoutes(
  app: Express,
  ctx: { monitor: MonitorService; alerts: AlertService },
): void {
  app.get('/v1/monitor/dashboard', asyncHandler(async (req, res) => {
    const range = req.query.tokenRange === '30d' ? '30d' : '7d';
    res.json({ dashboard: await ctx.monitor.getDashboard(range) });
  }));

  app.post('/v1/metrics/events', asyncHandler(async (req, res) => {
    await ctx.monitor.recordEvent(req.body);
    res.status(202).json({ ok: true });
  }));

  app.get('/v1/alerts', asyncHandler(async (req, res) => {
    const items = await ctx.alerts.list({
      status: req.query.status as 'open' | 'acknowledged' | 'resolved' | undefined,
      level: req.query.level as 'info' | 'warning' | 'error' | 'critical' | undefined,
      type: req.query.type as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });
    res.json({ items });
  }));

  app.get('/v1/alerts/unread-count', asyncHandler(async (_req, res) => {
    res.json({ count: await ctx.alerts.countUnread() });
  }));

  app.get('/v1/alerts/:id', asyncHandler(async (req, res) => {
    const item = await ctx.alerts.get(param(req.params.id));
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item });
  }));

  app.patch('/v1/alerts/:id', asyncHandler(async (req, res) => {
    const { status, resolutionNote } = req.body as { status?: string; resolutionNote?: string };
    if (!status) {
      res.status(400).json({ error: 'status_required' });
      return;
    }
    const item = await ctx.alerts.updateStatus(
      param(req.params.id),
      status as 'open' | 'acknowledged' | 'resolved',
      actorId(req),
      resolutionNote,
    );
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item });
  }));

  app.post('/v1/alerts/batch-read', asyncHandler(async (req, res) => {
    const ids = (req.body?.ids as string[]) ?? [];
    const updated = await ctx.alerts.batchAcknowledge(ids);
    res.json({ updated });
  }));

  app.post('/v1/alerts', asyncHandler(async (req, res) => {
    const item = await ctx.alerts.create(req.body);
    res.status(201).json({ item });
  }));
}
