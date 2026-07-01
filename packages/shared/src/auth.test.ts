import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { HTTP_HEADERS } from './constants.js';
import { createLogger } from './logger.js';
import { traceIdMiddleware } from './trace.js';
import { serviceAuthMiddleware, getServiceAuthHeaders, withServiceAuth } from './auth.js';

function buildApp(serviceToken: string) {
  const app = express();
  const logger = createLogger({ service: 'test', sink: vi.fn() });
  app.use(express.json());
  app.use(traceIdMiddleware({ logger }));
  app.use(serviceAuthMiddleware({ serviceToken }));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/internal', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('serviceAuthMiddleware', () => {
  const originalToken = process.env.SERVICE_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.SERVICE_TOKEN;
    } else {
      process.env.SERVICE_TOKEN = originalToken;
    }
  });

  it('allows public health paths without token', async () => {
    const app = buildApp('secret-token');
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('allows unprotected paths without token when only /v1 is protected', async () => {
    const app = buildApp('secret-token');
    app.get('/graphql', (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/graphql');
    expect(res.status).toBe(200);
  });

  it('rejects protected /v1 routes without valid token', async () => {
    const app = buildApp('secret-token');
    app.get('/v1/internal', (_req, res) => res.json({ ok: true }));
    const res = await request(app).get('/v1/internal');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED_SERVICE');
  });

  it('allows protected /v1 routes with valid token', async () => {
    const app = buildApp('secret-token');
    app.get('/v1/internal', (_req, res) => res.json({ ok: true }));
    const res = await request(app)
      .get('/v1/internal')
      .set(HTTP_HEADERS.SERVICE_TOKEN, 'secret-token');
    expect(res.status).toBe(200);
  });

  it('skips auth when service token is empty', async () => {
    const app = buildApp('');
    const res = await request(app).get('/internal');
    expect(res.status).toBe(200);
  });
});

describe('getServiceAuthHeaders', () => {
  const originalToken = process.env.SERVICE_TOKEN;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.SERVICE_TOKEN;
    } else {
      process.env.SERVICE_TOKEN = originalToken;
    }
  });

  it('includes service token and name when configured', () => {
    process.env.SERVICE_TOKEN = 'tok-123';
    expect(getServiceAuthHeaders('orchestrator')).toEqual({
      [HTTP_HEADERS.SERVICE_TOKEN]: 'tok-123',
      [HTTP_HEADERS.SERVICE_NAME]: 'orchestrator',
    });
  });

  it('withServiceAuth merges headers', () => {
    process.env.SERVICE_TOKEN = 'tok-123';
    expect(withServiceAuth({ 'x-custom': '1' }, 'rag-service')).toEqual({
      'x-custom': '1',
      [HTTP_HEADERS.SERVICE_TOKEN]: 'tok-123',
      [HTTP_HEADERS.SERVICE_NAME]: 'rag-service',
    });
  });
});
