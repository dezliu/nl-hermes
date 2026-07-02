import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createOrchestratorApp } from '../../../apps/orchestrator/src/app.js';
import { createInMemoryRedis } from '../../../apps/orchestrator/src/lib/redis.js';
import { assertHealthPayload } from './helpers/contract-assertions.js';

describe('orchestrator contract', () => {
  async function createApp() {
    return createOrchestratorApp({
      enableServiceAuth: false,
      dbEnabled: false,
      redis: createInMemoryRedis(),
    });
  }

  it('should_match_health_contract', async () => {
    const { app } = await createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    assertHealthPayload(res.body, 'orchestrator');
  });

  it('should_match_start_chat_response_shape', async () => {
    const { app } = await createApp();
    const res = await request(app)
      .post('/v1/chat/start')
      .send({ userId: 'contract-u1', query: '查询订单', mode: 'sql' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      runId: expect.any(String),
      conversationId: expect.any(String),
      checkpointId: expect.any(String),
    });
  });

  it('should_stream_sse_events_with_done_payload', async () => {
    const { app } = await createApp();
    const start = await request(app)
      .post('/v1/chat/start')
      .send({ userId: 'contract-u2', query: '你好', mode: 'sql' });
    expect(start.status).toBe(200);

    const stream = await request(app)
      .post('/v1/chat/stream')
      .send({
        ...start.body,
        userId: 'contract-u2',
        query: '你好',
        mode: 'sql',
      })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => cb(null, data));
      });

    expect(stream.status).toBe(200);
    const body = String(stream.body);
    expect(body).toContain('"type":"phase"');
    expect(body).toContain('"type":"done"');
    expect(body).toMatch(/"status":"(completed|interrupted|failed)"/);
  });

  it('should_match_conversations_list_shape', async () => {
    const { app } = await createApp();
    await request(app).post('/v1/chat/start').send({ userId: 'contract-u3', query: 'test', mode: 'sql' });
    const res = await request(app).get('/v1/conversations').query({ userId: 'contract-u3' });
    expect(res.status).toBe(200);
    expect(res.body.items).toBeInstanceOf(Array);
    if (res.body.items.length > 0) {
      expect(res.body.items[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        mode: expect.stringMatching(/^(sql|report)$/),
        lastActiveAt: expect.any(String),
      });
    }
  });
});
