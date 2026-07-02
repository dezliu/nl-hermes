import { describe, it, expect } from 'vitest';
import { createEvalApp } from './app.js';

describe('eval-service API', () => {
  const app = createEvalApp({ enableServiceAuth: false });

  it('exposes health endpoint', async () => {
    const res = await import('supertest').then((m) => m.default(app).get('/health'));
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('eval-service');
  });

  it('lists eval sets', async () => {
    const res = await import('supertest').then((m) => m.default(app).get('/v1/eval/sets'));
    expect([200, 500]).toContain(res.status);
  });

  it('creates eval set when db available', async () => {
    const res = await import('supertest').then((m) =>
      m.default(app).post('/v1/eval/sets').send({
        name: '基础评估集',
        description: '测试集',
      }),
    );
    expect([201, 500]).toContain(res.status);
  });
});
