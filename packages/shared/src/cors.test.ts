import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { HTTP_HEADERS } from './constants.js';
import { browserCorsMiddleware } from './cors.js';

describe('browserCorsMiddleware', () => {
  const app = express();
  app.use(browserCorsMiddleware());
  app.get('/v1/datasources', (_req, res) => {
    res.json({ items: [] });
  });

  it('allows browser preflight with x-service-token header', async () => {
    const res = await request(app)
      .options('/v1/datasources')
      .set('Origin', 'http://localhost:3002')
      .set('Access-Control-Request-Method', 'GET')
      .set(
        'Access-Control-Request-Headers',
        `content-type,${HTTP_HEADERS.SERVICE_TOKEN}`,
      );

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3002');
    expect(res.headers['access-control-allow-headers']).toContain(HTTP_HEADERS.SERVICE_TOKEN);
  });

  it('allows actual GET with service token from admin origin', async () => {
    const res = await request(app)
      .get('/v1/datasources')
      .set('Origin', 'http://localhost:3002')
      .set(HTTP_HEADERS.SERVICE_TOKEN, 'dev-token');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3002');
  });
});
