import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { PERF_BUDGETS, assertWithinBudget, startTimer } from '@hermes/observability';
import { createRagApp } from '../../../apps/rag-service/src/app.js';

describe('RAG retrieve SLA acceptance', () => {
  const app = createRagApp({ enableServiceAuth: false });

  it('should_complete_retrieve_within_5s_budget_in_stub_mode', async () => {
    const timer = startTimer('rag.retrieve.acceptance');
    const res = await request(app)
      .post('/v1/retrieve')
      .send({ query: '近7天各区域销售额', collection: 'metadata', mode: 'sql', topK: 8 });
    const { durationMs } = timer.end(res.status === 200);

    expect(res.status).toBe(200);
    assertWithinBudget(durationMs, PERF_BUDGETS.ragRetrieveMaxMs, 'rag.retrieve');
  });

  it('should_complete_score_within_5s_budget_in_stub_mode', async () => {
    const timer = startTimer('rag.score.acceptance');
    const res = await request(app)
      .post('/v1/score')
      .send({ query: '订单量', collection: 'metadata' });
    const { durationMs } = timer.end(res.status === 200);

    expect(res.status).toBe(200);
    assertWithinBudget(durationMs, PERF_BUDGETS.ragRetrieveMaxMs, 'rag.score');
  });
});
