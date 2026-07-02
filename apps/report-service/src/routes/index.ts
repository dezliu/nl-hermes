import type { NextFunction, Request, Response } from 'express';
import { getTraceId } from '@hermes/shared';
import type { ReportService } from '../services/report-service.js';
import type { TemplateMatcher } from '../services/template-matcher.js';

export type ReportContext = {
  report: ReportService;
  templateMatcher: TemplateMatcher;
};

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
