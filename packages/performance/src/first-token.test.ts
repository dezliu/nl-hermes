import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { PERF_BUDGETS, assertWithinBudget, startTimer } from '@hermes/observability';
import { createOrchestratorApp } from '../../../apps/orchestrator/src/app.js';
import { createInMemoryRedis } from '../../../apps/orchestrator/src/lib/redis.js';

function parseSseFirstEvent(raw: string): { type?: string; phase?: string } | null {
  const line = raw.split('\n').find((l) => l.startsWith('data: '));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(6)) as { type?: string; phase?: string };
  } catch {
    return null;
  }
}

describe('first token / first phase SLA acceptance', () => {
  it('should_emit_first_phase_event_within_3s', async () => {
    const { app } = await createOrchestratorApp({
      enableServiceAuth: false,
      dbEnabled: false,
      redis: createInMemoryRedis(),
    });

    const start = await request(app)
      .post('/v1/chat/start')
      .send({ userId: 'perf-u1', query: '查询订单趋势', mode: 'sql' });
    expect(start.status).toBe(200);

    const timer = startTimer('chat.first_token');
    const stream = await request(app)
      .post('/v1/chat/stream')
      .send({
        ...start.body,
        userId: 'perf-u1',
        query: '查询订单趋势',
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
    const { durationMs } = timer.end(stream.status === 200);

    expect(stream.status).toBe(200);
    const first = parseSseFirstEvent(String(stream.body));
    expect(first?.type).toBe('phase');
    assertWithinBudget(durationMs, PERF_BUDGETS.firstTokenMaxMs, 'chat.first_token');
  });
});
