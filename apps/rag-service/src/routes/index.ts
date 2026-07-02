import type { NextFunction, Request, Response } from 'express';
import { getTraceId } from '@hermes/shared';
import type { ScoreRequest } from '@hermes/contracts';
import type { RetrieveService } from '../services/retrieve-service.js';
import type { IndexPipelineService } from '../services/index-pipeline.js';
import { scoreLevel, weightedScore } from '../services/fusion.js';

export type RagContext = {
  retrieve: RetrieveService;
  indexPipeline: IndexPipelineService;
};

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export function mountRagRoutes(app: import('express').Express, ctx: RagContext): void {
  app.post('/v1/retrieve', asyncHandler(async (req, res) => {
    const traceId = getTraceId(req);
    const settings = await ctx.retrieve.fetchSettings(traceId);
    const body = { ...settings, ...req.body };
    const result = await ctx.retrieve.retrieve(body, traceId);
    res.json(result);
  }));

  app.post('/v1/score', asyncHandler(async (req, res) => {
    const traceId = getTraceId(req);
    const input = req.body as ScoreRequest;
    let results = input.results;
    if (!results || results.length === 0) {
      const retrieved = await ctx.retrieve.retrieve(
        { query: input.query, collection: input.collection },
        traceId,
      );
      results = retrieved.results;
    }
    const score = weightedScore(results);
    res.json({
      score,
      level: scoreLevel(score),
      details: results.map((r) => ({ id: r.id, score: r.score })),
    });
  }));

  app.post('/v1/index/rebuild', asyncHandler(async (req, res) => {
    const traceId = getTraceId(req);
    const collection = req.body?.collection as string | undefined;
    if (collection === 'metadata') {
      res.json(await ctx.indexPipeline.rebuildMetadata(traceId));
      return;
    }
    if (collection === 'business') {
      res.json(await ctx.indexPipeline.rebuildBusiness(traceId));
      return;
    }
    if (collection === 'templates') {
      res.json(await ctx.indexPipeline.rebuildTemplates(traceId));
      return;
    }
    res.json(await ctx.indexPipeline.rebuildAll(traceId));
  }));
}
