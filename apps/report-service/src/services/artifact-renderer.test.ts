import { describe, expect, it } from 'vitest';
import { createReportApp } from '../app.js';
import request from 'supertest';

describe('report render API', () => {
  const app = createReportApp({ enableServiceAuth: false });

  it('renders inline report artifact', async () => {
    const spec = {
      id: 'test-report-1',
      title: '测试报表',
      userQuery: '近7天销售额',
      sql: 'SELECT 1 AS dt, 2 AS cnt',
      datasourceId: 'ds-1',
      userId: 'user-1',
      data: {
        rows: [{ dt: '2026-01', cnt: 10 }],
        rowCount: 1,
      },
      charts: [{ chartType: 'line' as const, chartConfig: { xField: 'dt', yField: 'cnt' } }],
      narrative: { summary: '测试摘要' },
      outputFormat: 'inline' as const,
      createdAt: new Date().toISOString(),
    };

    const res = await request(app)
      .post('/v1/reports/render')
      .send({ spec, gatewayBaseUrl: 'http://localhost:4000' });

    expect(res.status).toBe(200);
    expect(res.body.artifact.status).toBe('ready');
    expect(res.body.artifact.format).toBe('inline');
    expect(res.body.artifact.inlinePayload?.rows).toHaveLength(1);
  });
});
