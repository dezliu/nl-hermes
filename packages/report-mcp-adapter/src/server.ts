import express, { type Express } from 'express';
import { createLogger, generateTraceId } from '@hermes/shared';
import { ReportMcpClient } from './report-client.js';
import { handleMcpJsonRpc, type JsonRpcRequest } from './mcp-handler.js';

export type CreateReportMcpAppOptions = {
  reportBaseUrl?: string;
  port?: number;
};

export function createReportMcpApp(options: CreateReportMcpAppOptions = {}): Express {
  const logger = createLogger({ service: 'report-mcp-adapter' });
  const client = new ReportMcpClient({ baseUrl: options.reportBaseUrl });
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'report-mcp-adapter' });
  });

  app.post('/mcp', async (req, res) => {
    const traceId = (req.header('x-trace-id') ?? generateTraceId()).trim();
    const body = req.body as JsonRpcRequest;

    if (!body || body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
      res.status(400).json({
        jsonrpc: '2.0',
        id: body?.id ?? null,
        error: { code: -32600, message: 'Invalid Request' },
      });
      return;
    }

    logger.info('mcp.request', { traceId, method: body.method });
    const response = await handleMcpJsonRpc(client, body, traceId);
    res.json(response);
  });

  return app;
}

export { handleMcpJsonRpc, REPORT_MCP_TOOLS } from './mcp-handler.js';
export { ReportMcpClient } from './report-client.js';
