import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createRagApp } from './app.js';

describe('rag-service API', () => {
  const app = createRagApp({ enableServiceAuth: false });

  it('exposes health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('rag-service');
  });

  it('accepts retrieve requests', async () => {
    const res = await request(app)
      .post('/v1/retrieve')
      .send({ query: '销售额', collection: 'metadata' });
    expect(res.status).toBe(200);
    expect(res.body.results).toBeInstanceOf(Array);
    if (res.body.results.length > 0) {
      const topScore = res.body.results[0].score as number;
      expect(topScore).toBeGreaterThanOrEqual(0);
      expect(topScore).toBeLessThanOrEqual(1);
      expect(topScore).toBeGreaterThan(0.05);
    }
  });

  it('scores retrieval results', async () => {
    const res = await request(app)
      .post('/v1/score')
      .send({ query: 'test', collection: 'metadata' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
    expect(res.body).toHaveProperty('level');
  });
});
