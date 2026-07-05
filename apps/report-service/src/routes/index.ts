import type { NextFunction, Request, Response } from 'express';
import { getTraceId } from '@hermes/shared';
import type { ReportService } from '../services/report-service.js';
import type { PublishedQueryService } from '../services/published-query.js';
import type { TemplateMatcher } from '../services/template-matcher.js';

export type ReportContext = {
  report: ReportService;
  templateMatcher: TemplateMatcher;
  publishedQueries: PublishedQueryService;
};

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? '' : value;
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export function mountReportRoutes(app: import('express').Express, ctx: ReportContext): void {
  app.post('/v1/templates/match', asyncHandler(async (req, res) => {
    const results = await ctx.templateMatcher.match(req.body, getTraceId(req));
    res.json({ results });
  }));

  app.post('/v1/reports/generate', asyncHandler(async (req, res) => {
    const result = await ctx.report.generateReport(req.body, getTraceId(req));
    res.json(result);
  }));

  app.post('/v1/reports/render', asyncHandler(async (req, res) => {
    const result = await ctx.report.renderReport(req.body, getTraceId(req));
    res.json(result);
  }));

  app.post('/v1/reports/share', asyncHandler(async (req, res) => {
    const result = await ctx.report.createShare(req.body);
    const spec = ctx.report.getArtifactRenderer()?.getSpec(req.body.reportId);
    if (spec) {
      const mainQuery = ctx.publishedQueries.register({
        reportId: spec.id,
        sqlTemplate: spec.sql,
        datasourceId: spec.datasourceId,
        authMode: 'token',
        shareToken: result.shareToken,
      });

      if (spec.outputFormat === 'dashboard' && spec.layout) {
        const updatedLayout = {
          ...spec.layout,
          panels: spec.layout.panels.map((panel) => {
            if (panel.type === 'chart' || panel.type === 'kpi' || panel.type === 'table') {
              const panelQuery = ctx.publishedQueries.register({
                reportId: spec.id,
                sqlTemplate: spec.sql,
                datasourceId: spec.datasourceId,
                authMode: 'token',
                shareToken: result.shareToken,
              });
              return {
                ...panel,
                publishedQueryId: panelQuery.id,
                refreshIntervalSec: panel.refreshIntervalSec ?? 60,
              };
            }
            return panel;
          }),
        };
        spec.layout = updatedLayout;
        ctx.report.getArtifactRenderer()?.saveSpec(spec);
      }

      void mainQuery;
    }
    res.json(result);
  }));

  app.patch('/v1/reports/:id/layout', asyncHandler(async (req, res) => {
    const renderer = ctx.report.getArtifactRenderer();
    if (!renderer) {
      res.status(503).json({ error: 'renderer_unavailable' });
      return;
    }
    const id = param(req.params.id);
    const spec = renderer.getSpec(id);
    const artifact = renderer.getArtifact(id);
    if (!spec || !artifact || spec.outputFormat !== 'dashboard') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (spec.userId && spec.userId !== String(req.body.userId ?? '')) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const layout = req.body.layout as typeof spec.layout;
    const charts = req.body.charts as typeof spec.charts | undefined;
    if (!layout) {
      res.status(400).json({ error: 'missing_layout' });
      return;
    }

    const updatedSpec = {
      ...spec,
      layout,
      charts: charts ?? spec.charts,
    };
    renderer.saveSpec(updatedSpec);

    const gatewayBase = process.env.GATEWAY_PUBLIC_URL ?? 'http://localhost:4000';
    const renderResult = await ctx.report.renderReport({ spec: updatedSpec, gatewayBaseUrl: gatewayBase });
    res.json({ spec: updatedSpec, artifact: renderResult.artifact });
  }));

  app.get('/v1/reports/:id', asyncHandler(async (req, res) => {
    const renderer = ctx.report.getArtifactRenderer();
    if (!renderer) {
      res.status(503).json({ error: 'renderer_unavailable' });
      return;
    }
    const id = param(req.params.id);
    const spec = renderer.getSpec(id);
    const artifact = renderer.getArtifact(id);
    if (!spec || !artifact) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ spec, artifact });
  }));

  app.get('/v1/reports/:id/preview', asyncHandler(async (req, res) => {
    const renderer = ctx.report.getArtifactRenderer();
    if (!renderer) {
      res.status(503).json({ error: 'renderer_unavailable' });
      return;
    }
    const preview = await renderer.getPreviewContent(param(req.params.id));
    if (!preview) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.setHeader('Content-Type', preview.contentType);
    res.send(preview.body);
  }));

  app.get('/v1/reports/:id/download', asyncHandler(async (req, res) => {
    const renderer = ctx.report.getArtifactRenderer();
    if (!renderer) {
      res.status(503).json({ error: 'renderer_unavailable' });
      return;
    }
    const download = await renderer.getDownloadContent(param(req.params.id));
    if (!download) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.setHeader('Content-Type', download.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(download.filename)}"`);
    res.send(download.body);
  }));

  app.get('/v1/public/reports/:shareToken', asyncHandler(async (req, res) => {
    const renderer = ctx.report.getArtifactRenderer();
    if (!renderer) {
      res.status(503).json({ error: 'renderer_unavailable' });
      return;
    }
    const resolved = renderer.resolveShareToken(param(req.params.shareToken));
    if (!resolved) {
      res.status(404).json({ error: 'share_expired_or_invalid' });
      return;
    }
    const preview = await renderer.getPreviewContent(resolved.reportId);
    if (!preview) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.setHeader('Content-Type', preview.contentType);
    res.send(preview.body);
  }));

  app.post('/v1/published-queries', asyncHandler(async (req, res) => {
    const record = ctx.publishedQueries.register(req.body);
    res.json({ item: record });
  }));

  app.get('/v1/published-queries/:id/data', asyncHandler(async (req, res) => {
    const parameters = Object.fromEntries(
      Object.entries(req.query).map(([k, v]) => [k, String(v ?? '')]),
    );
    const shareToken = req.headers['x-share-token'] as string | undefined;
    const result = await ctx.publishedQueries.fetchData(param(req.params.id), parameters, { shareToken });
    res.status(result.ok ? 200 : 422).json(result);
  }));

  app.post('/v1/query/execute', asyncHandler(async (req, res) => {
    const result = await ctx.report.executeQuery(req.body, getTraceId(req));
    res.status(result.ok ? 200 : 422).json(result);
  }));

  app.post('/v1/query/validate', asyncHandler(async (req, res) => {
    const result = await ctx.report.validateSql(req.body, getTraceId(req));
    res.json(result);
  }));

  app.post('/v1/query/fetch-api', asyncHandler(async (req, res) => {
    const { config, parameters } = req.body as {
      config: { url: string; method?: 'GET' | 'POST'; headers?: Record<string, string>; dataPath?: string };
      parameters?: Record<string, string>;
    };
    const result = await ctx.report.getApiFetcher().fetch(config, parameters);
    res.status(result.ok ? 200 : 422).json(result);
  }));
}
