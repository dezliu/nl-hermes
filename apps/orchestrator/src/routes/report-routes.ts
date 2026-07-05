import type { Express, Request, Response } from 'express';
import { createReportClient } from '@hermes/llm-tools';
import type { ReportArtifactRepository } from '../repositories/report-artifact-repository.js';

const REPORT_SERVICE_URL = process.env.REPORT_SERVICE_URL ?? 'http://localhost:4030';

export function mountReportRoutes(app: Express, repo: ReportArtifactRepository): void {
  app.get('/v1/reports/:id', async (req, res) => {
    const userId = String(req.query.userId ?? '');
    const row = await repo.getById(req.params.id, userId || undefined);
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ spec: row.spec, artifact: row.artifact });
  });

  app.post('/v1/reports/:id/share', async (req, res) => {
    const report = createReportClient(process.env.REPORT_SERVICE_URL);
    try {
      const result = await report.createShare({
        reportId: req.params.id,
        userId: String(req.body.userId ?? ''),
        expiresInDays: req.body.expiresInDays,
      });
      const row = await repo.getById(req.params.id, String(req.body.userId ?? ''));
      if (row) {
        await repo.save({
          ...row,
          artifact: {
            ...row.artifact,
            shareToken: result.shareToken,
            shareExpiresAt: result.expiresAt,
          },
        });
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: (err as { code?: string }).code ?? 'share_failed',
        message: err instanceof Error ? err.message : '分享失败',
      });
    }
  });

  app.get('/v1/public/reports/:shareToken', async (req, res) => {
    const row = await repo.getByShareToken(req.params.shareToken);
    if (!row) {
      res.status(404).json({ error: 'share_expired_or_invalid' });
      return;
    }
    res.json({ spec: row.spec, artifact: row.artifact });
  });

  app.patch('/v1/dashboards/:id/layout', async (req, res) => {
    const userId = String(req.body.userId ?? '');
    const row = await repo.getById(req.params.id, userId);
    if (!row) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    try {
      const report = createReportClient(REPORT_SERVICE_URL);
      const result = await report.updateDashboardLayout({
        reportId: req.params.id,
        userId,
        layout: req.body.layout,
        charts: req.body.charts,
      });
      await repo.updateLayout({
        id: req.params.id,
        userId,
        spec: result.spec,
        artifact: result.artifact,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: (err as { code?: string }).code ?? 'update_failed',
        message: err instanceof Error ? err.message : '更新布局失败',
      });
    }
  });
}
