import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createReportApp } from '../app.js';
import request from 'supertest';
import { isValidDocxBuffer } from './artifact-renderer.js';

describe('isValidDocxBuffer', () => {
  it('accepts ZIP/DOCX magic bytes', () => {
    expect(isValidDocxBuffer(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
  });

  it('rejects plain text fallback bytes', () => {
    expect(isValidDocxBuffer(Buffer.from('纯文本报表', 'utf-8'))).toBe(false);
  });
});

describe('report render API', () => {
  const app = createReportApp({ enableServiceAuth: false });
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

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

  it('renders word artifact via render-worker', async () => {
    const fakeDocx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      if (url.endsWith('/render/word')) {
        return new Response(fakeDocx, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const spec = {
      id: 'test-report-word',
      title: '近7天资金流水',
      userQuery: '近7天资金流水',
      sql: 'SELECT 1 AS dt, 2 AS cnt',
      datasourceId: 'ds-1',
      userId: 'user-1',
      data: {
        rows: [
          { dt: '2026-07-01', cnt: 3 },
          { dt: '2026-07-02', cnt: 5 },
        ],
        rowCount: 2,
      },
      charts: [{ chartType: 'line' as const, chartConfig: { xField: 'dt', yField: 'cnt', title: '日汇总' } }],
      narrative: { summary: '近7天流水呈上升趋势', insights: ['总量增长'] },
      outputFormat: 'word' as const,
      createdAt: new Date().toISOString(),
    };

    const res = await request(app)
      .post('/v1/reports/render')
      .send({ spec, gatewayBaseUrl: 'http://localhost:4000' });

    expect(res.body.artifact.status).toBe('ready');
    expect(res.body.artifact.format).toBe('word');
    expect(res.body.artifact.downloadUrl).toContain('/download');
    expect(res.body.artifact.storageKey).toContain('word/report.docx');
  });

  it('marks word render failed when worker unavailable', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as typeof fetch;

    const spec = {
      id: 'test-report-word-fail',
      title: '失败测试',
      userQuery: '测试',
      sql: 'SELECT 1',
      datasourceId: 'ds-1',
      userId: 'user-1',
      data: { rows: [{ x: 1 }], rowCount: 1 },
      charts: [{ chartType: 'line' as const, chartConfig: { xField: 'x', yField: 'x' } }],
      narrative: { summary: '摘要' },
      outputFormat: 'word' as const,
      createdAt: new Date().toISOString(),
    };

    const res = await request(app)
      .post('/v1/reports/render')
      .send({ spec, gatewayBaseUrl: 'http://localhost:4000' });

    expect(res.status).toBe(200);
    expect(res.body.artifact.status).toBe('failed');
    expect(res.body.artifact.errorMessage).toContain('render-worker');
  });
});
