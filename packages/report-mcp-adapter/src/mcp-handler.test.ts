import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createReportMcpApp } from './server.js';
import { handleMcpJsonRpc } from './mcp-handler.js';
import { ReportMcpClient } from './report-client.js';

describe('report MCP adapter', () => {
  const app = createReportMcpApp({ reportBaseUrl: 'http://report.test' });

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/v1/templates/match')) {
          return new Response(
            JSON.stringify({
              results: [
                {
                  id: 'tpl-1',
                  name: '销售日报',
                  scenarioDescription: '按日汇总',
                  score: 0.88,
                  type: 'report',
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ ok: true, rows: [], rowCount: 0 }), { status: 200 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should_expose_health_endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('report-mcp-adapter');
  });

  it('should_list_tools_via_jsonrpc', async () => {
    const res = await request(app).post('/mcp').send({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    });
    expect(res.status).toBe(200);
    expect(res.body.result.tools).toHaveLength(4);
    expect(res.body.result.tools.map((t: { name: string }) => t.name)).toContain('match_template');
  });

  it('should_call_match_template_tool', async () => {
    const client = new ReportMcpClient({ baseUrl: 'http://report.test' });
    const res = await handleMcpJsonRpc(client, {
      jsonrpc: '2.0',
      id: 'call-1',
      method: 'tools/call',
      params: {
        name: 'match_template',
        arguments: { query: '销售日报', mode: 'report' },
      },
    });
    expect(res.error).toBeUndefined();
    const text = (res.result as { content: { text: string }[] }).content[0].text;
    expect(text).toContain('销售日报');
  });
});
