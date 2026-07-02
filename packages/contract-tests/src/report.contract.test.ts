import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createReportApp } from '../../../apps/report-service/src/app.js';
import {
  assertExecuteQueryResponse,
  assertHealthPayload,
  assertTemplateMatchResults,
} from './helpers/contract-assertions.js';

describe('report-service contract', () => {
  const app = createReportApp({ enableServiceAuth: false });

  it('should_match_health_contract', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    assertHealthPayload(res.body, 'report-service');
  });

  it('should_match_template_match_response_shape', async () => {
    const res = await request(app)
      .post('/v1/templates/match')
      .send({ query: '月度销售报表', mode: 'report', topK: 3 });
    expect(res.status).toBe(200);
    expect(res.body.results).toBeInstanceOf(Array);
    assertTemplateMatchResults(res.body.results);
  });

  it('should_match_execute_query_error_shape', async () => {
    const res = await request(app)
      .post('/v1/query/execute')
      .send({ sql: 'DELETE FROM users', datasourceId: 'ds-missing' });
    expect([422, 200]).toContain(res.status);
    assertExecuteQueryResponse(res.body);
    if (!res.body.ok) {
      expect(res.body.error).toMatchObject({
        code: expect.any(String),
        message: expect.any(String),
      });
    }
  });

  it('should_match_validate_sql_response_shape', async () => {
    const res = await request(app)
      .post('/v1/query/validate')
      .send({ sql: 'SELECT 1', datasourceId: 'ds-missing' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      valid: expect.any(Boolean),
      errors: expect.any(Array),
    });
  });
});
