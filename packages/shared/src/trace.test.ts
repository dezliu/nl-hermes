import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { HTTP_HEADERS } from './constants.js';
import { createLogger } from './logger.js';
import { traceIdMiddleware, generateTraceId } from './trace.js';

describe('traceIdMiddleware', () => {
  it('generates traceId when header is absent', async () => {
    const app = express();
    const logger = createLogger({ service: 'test', sink: vi.fn() });
    app.use(traceIdMiddleware({ logger }));
    app.get('/ping', (req, res) => {
      res.json({ traceId: req.ctx.traceId });
    });

    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body.traceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(res.headers[HTTP_HEADERS.TRACE_ID.toLowerCase()]).toBe(res.body.traceId);
  });

  it('propagates incoming x-trace-id', async () => {
    const app = express();
    const logger = createLogger({ service: 'test', sink: vi.fn() });
    app.use(traceIdMiddleware({ logger }));
    app.get('/ping', (req, res) => {
      res.json({ traceId: req.ctx.traceId, userId: req.ctx.userId });
    });

    const res = await request(app)
      .get('/ping')
      .set(HTTP_HEADERS.TRACE_ID, 'trace-abc')
      .set(HTTP_HEADERS.USER_ID, 'user-1');

    expect(res.body.traceId).toBe('trace-abc');
    expect(res.body.userId).toBe('user-1');
  });
});

describe('generateTraceId', () => {
  it('returns a UUID string', () => {
    expect(generateTraceId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
