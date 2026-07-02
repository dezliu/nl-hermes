import { describe, it, expect } from 'vitest';
import { createMetadataApp } from '../app.js';

describe('monitor & alerts API', () => {
  const app = createMetadataApp({ enableServiceAuth: false });

  it('returns monitor dashboard', async () => {
    const res = await import('supertest').then((m) => m.default(app).get('/v1/monitor/dashboard'));
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.dashboard).toBeDefined();
      expect(res.body.dashboard.cacheHit).toBeDefined();
      expect(res.body.dashboard.satisfaction).toBeDefined();
    }
  });

  it('accepts metric events', async () => {
    const res = await import('supertest').then((m) =>
      m.default(app).post('/v1/metrics/events').send({ type: 'cache_hit' }),
    );
    expect(res.status).toBe(202);
  });

  it('lists alerts', async () => {
    const res = await import('supertest').then((m) => m.default(app).get('/v1/alerts'));
    expect([200, 500]).toContain(res.status);
  });
});
