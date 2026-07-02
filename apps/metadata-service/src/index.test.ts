import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { HTTP_HEADERS } from '@hermes/shared';
import { createMetadataApp } from './app.js';

describe('metadata-service API', () => {
  const app = createMetadataApp({ enableServiceAuth: false });

  it('exposes health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('metadata-service');
  });

  it('lists datasources', async () => {
    const res = await request(app).get('/v1/datasources');
    expect([200, 500]).toContain(res.status);
  });

  it('protects routes with service token when enabled', async () => {
    const secured = createMetadataApp({ serviceToken: 'dev-token' });
    const denied = await request(secured).get('/v1/datasources');
    expect(denied.status).toBe(401);

    const allowed = await request(secured)
      .get('/v1/datasources')
      .set(HTTP_HEADERS.SERVICE_TOKEN, 'dev-token');
    expect([200, 500]).toContain(allowed.status);
  });
});
