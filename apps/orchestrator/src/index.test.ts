import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createOrchestratorApp } from './app.js';
import { createInMemoryRedis } from './lib/redis.js';

describe('orchestrator API', () => {
  it('exposes health endpoint', async () => {
    const { app } = await createOrchestratorApp({ enableServiceAuth: false, dbEnabled: false, redis: createInMemoryRedis() });
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('orchestrator');
  });

  it('starts chat and streams sse events', async () => {
    const { app } = await createOrchestratorApp({ enableServiceAuth: false, dbEnabled: false, redis: createInMemoryRedis() });

    const start = await request(app)
      .post('/v1/chat/start')
      .send({ userId: 'u1', query: '查询订单趋势', mode: 'sql' });
    expect(start.status).toBe(200);
    expect(start.body.runId).toBeTruthy();

    const stream = await request(app)
      .post('/v1/chat/stream')
      .send({ ...start.body, userId: 'u1', query: '查询订单趋势', mode: 'sql', runId: start.body.runId })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => cb(null, data));
      });

    expect(stream.status).toBe(200);
    expect(String(stream.body)).toContain('"phase"');
    expect(String(stream.body)).toContain('"done"');
  });

  it('rejects concurrent generation for same user', async () => {
    const { app } = await createOrchestratorApp({ enableServiceAuth: false, dbEnabled: false, redis: createInMemoryRedis() });
    const first = await request(app).post('/v1/chat/start').send({ userId: 'u2', query: 'a', mode: 'sql' });
    expect(first.status).toBe(200);
    const second = await request(app).post('/v1/chat/start').send({ userId: 'u2', query: 'b', mode: 'sql' });
    expect(second.status).toBe(409);
  });
});
