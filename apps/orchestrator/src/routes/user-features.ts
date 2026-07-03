import type { Express } from 'express';
import type { DeleteConversationRequest, RenameConversationRequest, SubmitFeedbackRequest, TemplateMatchRequest } from '@hermes/contracts';
import { getTraceId } from '@hermes/shared';
import type { ConversationService } from '../services/conversation-service.js';
import type { FeedbackService } from '../services/feedback-service.js';
import type { TemplateRecommendationService } from '../services/template-recommendation-service.js';
import type { TemplateApplyService } from '../services/template-apply-service.js';

export type UserFeatureRoutesContext = {
  conversations: ConversationService;
  feedback: FeedbackService;
  templateRecommendations: TemplateRecommendationService;
  templateApply: TemplateApplyService;
};

export function mountUserFeatureRoutes(app: Express, ctx: UserFeatureRoutesContext): void {
  app.post('/v1/templates/match', async (req, res) => {
    try {
      const body = req.body as TemplateMatchRequest;
      const results = await ctx.templateRecommendations.match(body, getTraceId(req));
      res.json({ results });
    } catch (err) {
      res.status(400).json({
        error: 'match_failed',
        message: err instanceof Error ? err.message : '模板匹配失败',
      });
    }
  });

  app.get('/v1/templates/:type/:id', async (req, res) => {
    const type = req.params.type === 'report' ? 'report' : 'sql';
    const detail = await ctx.templateApply.loadTemplate(type, req.params.id);
    if (!detail) {
      res.status(404).json({ error: 'not_found', message: '模板不存在' });
      return;
    }
    res.json({ item: detail });
  });

  app.get('/v1/conversations', async (req, res) => {
    const userId = String(req.query.userId ?? '');
    if (!userId) {
      res.status(400).json({ error: 'invalid_request', message: '缺少 userId' });
      return;
    }
    const items = await ctx.conversations.list(userId);
    res.json({ items });
  });

  app.get('/v1/conversations/:id/messages', async (req, res) => {
    const userId = String(req.query.userId ?? '');
    if (!userId) {
      res.status(400).json({ error: 'invalid_request', message: '缺少 userId' });
      return;
    }
    const items = await ctx.conversations.messages(userId, req.params.id);
    res.json({ items });
  });

  app.patch('/v1/conversations/:id', async (req, res) => {
    const body = req.body as RenameConversationRequest;
    const item = await ctx.conversations.rename({
      userId: body.userId,
      conversationId: req.params.id,
      title: body.title,
    });
    if (!item) {
      res.status(404).json({ error: 'not_found', message: '会话不存在' });
      return;
    }
    res.json({ item });
  });

  app.delete('/v1/conversations/:id', async (req, res) => {
    const body = req.body as DeleteConversationRequest;
    const ok = await ctx.conversations.delete(body.userId, req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'not_found', message: '会话不存在' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/v1/messages/:id/feedback', async (req, res) => {
    const body = req.body as SubmitFeedbackRequest;
    if (body.messageId !== req.params.id) {
      res.status(400).json({ error: 'invalid_request', message: 'messageId 不一致' });
      return;
    }
    try {
      await ctx.feedback.submit(body);
      res.json({ ok: true });
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : 'feedback_failed';
      const message = err instanceof Error ? err.message : '反馈提交失败';
      res.status(code === 'REASON_REQUIRED' ? 400 : 404).json({ error: code, message });
    }
  });
}
