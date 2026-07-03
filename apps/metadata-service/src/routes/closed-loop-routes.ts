import type { Express, Request, Response, NextFunction } from 'express';
import { getTraceId, HTTP_HEADERS } from '@hermes/shared';
import type { ClosedLoopService } from '../services/closed-loop-service.js';

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

function mapFeedbackRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    messageId: row.message_id,
    conversationId: row.conversation_id,
    mode: row.mode,
    userQuery: row.user_query,
    assistantContent: row.assistant_content,
    generatedSql: row.generated_sql,
    refuseReason: row.refuse_reason,
    ragScore: row.rag_score,
    feedbackReason: row.feedback_reason,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resultTemplateId: row.result_template_id,
    createdAt: row.created_at,
  };
}

export function mountClosedLoopRoutes(app: Express, closedLoop: ClosedLoopService): void {
  app.post('/internal/template-candidates', asyncHandler(async (req, res) => {
    const item = await closedLoop.createCandidate(req.body, getTraceId(req));
    if (!item) {
      res.status(204).end();
      return;
    }
    res.status(201).json({ item });
  }));

  app.post('/internal/template-candidates/:messageId/upvote', asyncHandler(async (req, res) => {
    const item = await closedLoop.boostCandidateOnUpvote(param(req.params.messageId), getTraceId(req));
    res.json({ ok: Boolean(item), item });
  }));

  app.post('/internal/generation-feedback', asyncHandler(async (req, res) => {
    const item = await closedLoop.createFeedbackItem(req.body, getTraceId(req));
    res.status(201).json({ item });
  }));

  app.get('/v1/template-candidates', asyncHandler(async (req, res) => {
    const items = await closedLoop.listCandidates(req.query.status as string | undefined);
    res.json({ items });
  }));

  app.post('/v1/template-candidates/:id/approve', asyncHandler(async (req, res) => {
    const result = await closedLoop.approveCandidate(
      param(req.params.id),
      { ...req.body, createdBy: actorId(req) },
      getTraceId(req),
    );
    if (!result) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(result);
  }));

  app.post('/v1/template-candidates/:id/reject', asyncHandler(async (req, res) => {
    const item = await closedLoop.rejectCandidate(param(req.params.id), getTraceId(req));
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item });
  }));

  app.get('/v1/generation-feedback', asyncHandler(async (req, res) => {
    const rows = await closedLoop.listFeedback(req.query.status as string | undefined);
    res.json({ items: rows.map((r) => mapFeedbackRow(r as Record<string, unknown>)) });
  }));

  app.patch('/v1/generation-feedback/:id/resolve', asyncHandler(async (req, res) => {
    const item = await closedLoop.resolveFeedback(
      param(req.params.id),
      { resolvedBy: actorId(req), resultTemplateId: req.body?.resultTemplateId },
      getTraceId(req),
    );
    if (!item) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ item: mapFeedbackRow(item as Record<string, unknown>) });
  }));
}
