import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createRagApp } from '../../../apps/rag-service/src/app.js';
import { assertHealthPayload, assertRetrieveResponse, assertScoreResponse } from './helpers/contract-assertions.js';

describe('rag-service contract', () => {
  const app = createRagApp({ enableServiceAuth: false });

  it('should_match_health_contract', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    assertHealthPayload(res.body, 'rag-service');
  });

  it('should_match_retrieve_response_shape', async () => {
    const res = await request(app)
      .post('/v1/retrieve')
      .send({ query: '近7天销售额', collection: 'metadata', mode: 'sql' });
    expect(res.status).toBe(200);
    assertRetrieveResponse(res.body);
  });

  it('should_match_score_response_shape', async () => {
    const res = await request(app)
      .post('/v1/score')
      .send({
        query: '订单量',
        collection: 'metadata',
        results: [{ id: '1', content: 'orders 订单表', score: 0.8 }],
      });
    expect(res.status).toBe(200);
    assertScoreResponse(res.body);
  });
});
