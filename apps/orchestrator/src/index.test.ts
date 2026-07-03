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

  it('lists conversations and accepts feedback', async () => {
    const { app } = await createOrchestratorApp({ enableServiceAuth: false, dbEnabled: false, redis: createInMemoryRedis() });

    const start = await request(app)
      .post('/v1/chat/start')
      .send({ userId: 'u3', query: '销售额', mode: 'sql' });
    expect(start.status).toBe(200);

    const list = await request(app).get('/v1/conversations').query({ userId: 'u3' });
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);

    const conversationId = start.body.conversationId as string;
    const msgs = await request(app)
      .get(`/v1/conversations/${conversationId}/messages`)
      .query({ userId: 'u3' });
    expect(msgs.status).toBe(200);
    expect(msgs.body.items.length).toBeGreaterThan(0);
    const messageId = msgs.body.items[0].id as string;

    const feedback = await request(app)
      .post(`/v1/messages/${messageId}/feedback`)
      .send({ userId: 'u3', messageId, rating: 'up' });
    expect(feedback.status).toBe(200);
    expect(feedback.body.ok).toBe(true);
  });

  it('renames and deletes conversation', async () => {
    const { app } = await createOrchestratorApp({ enableServiceAuth: false, dbEnabled: false, redis: createInMemoryRedis() });
    const start = await request(app).post('/v1/chat/start').send({ userId: 'u4', query: 'test', mode: 'report' });
    const conversationId = start.body.conversationId as string;

    const renamed = await request(app)
      .patch(`/v1/conversations/${conversationId}`)
      .send({ userId: 'u4', conversationId, title: '报表会话' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.item.title).toBe('报表会话');

    const deleted = await request(app)
      .delete(`/v1/conversations/${conversationId}`)
      .send({ userId: 'u4', conversationId });
    expect(deleted.status).toBe(200);
    expect(deleted.body.ok).toBe(true);
  });
});
