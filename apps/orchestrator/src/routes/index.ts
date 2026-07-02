import type { Express, Request, Response } from 'express';
import type { CancelChatRequest, ContinueChatRequest, StartChatRequest } from '@hermes/contracts';
import { getTraceId } from '@hermes/shared';
import type { ChatService } from '../services/chat-service.js';

function writeSse(res: Response, data: unknown) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function mountChatRoutes(app: Express, chat: ChatService): void {
  app.post('/v1/chat/start', async (req, res) => {
    try {
      const body = req.body as StartChatRequest;
      const result = await chat.start({ ...body, traceId: getTraceId(req) });
      res.json(result);
    } catch (err) {
      const code = (err as { code?: string }).code;
      res.status(code === 'CONCURRENT_GENERATION' ? 409 : 400).json({
        error: code ?? 'start_failed',
        message: err instanceof Error ? err.message : '启动失败',
      });
    }
  });

  app.post('/v1/chat/stream', async (req, res) => {
    const body = req.body as StartChatRequest & { runId: string };
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    await chat.stream(body.runId, body, (event) => writeSse(res, event));
    res.end();
  });

  app.post('/v1/chat/cancel', async (req, res) => {
    const body = req.body as CancelChatRequest;
    const ok = await chat.cancel(body);
    res.json({ ok });
  });

  app.post('/v1/chat/continue', async (req, res) => {
    try {
      const body = req.body as ContinueChatRequest;
      const result = await chat.continue({ ...body, traceId: getTraceId(req) });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: 'continue_failed', message: err instanceof Error ? err.message : '续跑失败' });
    }
  });
}
