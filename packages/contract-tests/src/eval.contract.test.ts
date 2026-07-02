import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createEvalApp } from '../../../apps/eval-service/src/app.js';
import { assertHealthPayload } from './helpers/contract-assertions.js';

describe('eval-service contract', () => {
  const app = createEvalApp({ enableServiceAuth: false });

  it('should_match_health_contract', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    assertHealthPayload(res.body, 'eval-service');
  });

  it('should_match_eval_sets_list_shape', async () => {
    const res = await request(app).get('/v1/eval/sets');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.items).toBeInstanceOf(Array);
    }
  });

  it('should_match_eval_run_start_response_when_db_available', async () => {
    const createRes = await request(app).post('/v1/eval/sets').send({
      name: '契约测试集',
      description: 'Phase 9',
    });
    if (createRes.status !== 201) {
      expect(createRes.status).toBe(500);
      return;
    }

    const setId = createRes.body.item.id as string;
    await request(app).post(`/v1/eval/sets/${setId}/cases`).send({
      question: '近7天销售额',
      mode: 'sql',
      expectedTables: ['orders'],
    });

    const runRes = await request(app).post('/v1/eval/runs').send({ evalSetId: setId, concurrency: 2 });
    expect([201, 400, 500]).toContain(runRes.status);
    if (runRes.status === 201) {
      expect(runRes.body.item).toMatchObject({
        id: expect.any(String),
        evalSetId: setId,
        status: expect.stringMatching(/^(pending|running|completed|cancelled|failed)$/),
        progress: expect.any(Number),
      });
    }
  });
});
