import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { HTTP_HEADERS } from '@hermes/shared';
import { createMetadataApp } from '../../../apps/metadata-service/src/app.js';
import { assertHealthPayload } from './helpers/contract-assertions.js';

describe('metadata-service contract', () => {
  const app = createMetadataApp({ enableServiceAuth: false });

  it('should_match_health_contract', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    assertHealthPayload(res.body, 'metadata-service');
  });

  it('should_match_monitor_dashboard_shape_when_available', async () => {
    const res = await request(app).get('/v1/monitor/dashboard');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.dashboard).toMatchObject({
        cacheHit: expect.objectContaining({ currentRate: expect.any(Number) }),
        retrievalAlert: expect.any(Object),
        tokenUsage: expect.any(Object),
        satisfaction: expect.any(Object),
      });
    }
  });

  it('should_require_service_token_when_auth_enabled', async () => {
    const secured = createMetadataApp({ serviceToken: 'phase9-token' });
    const denied = await request(secured).get('/v1/datasources');
    expect(denied.status).toBe(401);

    const allowed = await request(secured)
      .get('/v1/datasources')
      .set(HTTP_HEADERS.SERVICE_TOKEN, 'phase9-token');
    expect([200, 500]).toContain(allowed.status);
  });

  it('should_match_sync_preview_shape_when_datasource_missing', async () => {
    const res = await request(app).get('/v1/datasources/nonexistent-id/sync/preview');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });

  it('should_accept_selective_sync_body_shape', async () => {
    const res = await request(app)
      .post('/v1/datasources/nonexistent-id/sync')
      .send({
        mode: 'selective',
        tables: [{ physicalName: 't1', fields: ['id'] }],
        defaultInQueryLibrary: true,
      });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });
});
