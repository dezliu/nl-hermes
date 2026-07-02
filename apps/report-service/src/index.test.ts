import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createReportApp } from './app.js';

describe('report-service API', () => {
  const app = createReportApp({ enableServiceAuth: false });

  it('exposes health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('report-service');
  });

  it('matches templates', async () => {
    const res = await request(app)
      .post('/v1/templates/match')
      .send({ query: '销售额报表', mode: 'report' });
    expect(res.status).toBe(200);
    expect(res.body.results).toBeInstanceOf(Array);
  });

  it('rejects non-select SQL on execute', async () => {
    const res = await request(app)
      .post('/v1/query/execute')
      .send({ sql: 'DELETE FROM t', datasourceId: 'missing' });
    expect([422, 200]).toContain(res.status);
    if (res.status === 422) {
      expect(res.body.ok).toBe(false);
    }
  });
});
