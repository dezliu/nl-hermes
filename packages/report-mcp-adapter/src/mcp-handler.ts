import type { ReportMcpClient } from './report-client.js';
import { createDefaultDashboardLayout, validateDashboardLayout } from '@hermes/contracts';
import type { DashboardLayoutSpec, ReportSpec } from '@hermes/contracts';

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export const REPORT_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'match_template',
    description: 'Match SQL or report templates by natural language query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'User question or scenario description' },
        mode: { type: 'string', enum: ['sql', 'report'] },
        topK: { type: 'number' },
        threshold: { type: 'number' },
      },
      required: ['query', 'mode'],
    },
  },
  {
    name: 'generate_report',
    description: 'Generate report SQL and chart config from RAG context',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        schemaContext: { type: 'object' },
        datasourceId: { type: 'string' },
        parameters: { type: 'object', additionalProperties: { type: 'string' } },
      },
      required: ['query', 'schemaContext', 'datasourceId'],
    },
  },
  {
    name: 'execute_report_query',
    description: 'Execute parameterized SQL against an authorized datasource with row limit',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string' },
        datasourceId: { type: 'string' },
        parameters: { type: 'object', additionalProperties: { type: 'string' } },
        maxRows: { type: 'number' },
      },
      required: ['sql', 'datasourceId'],
    },
  },
  {
    name: 'validate_sql',
    description: 'Validate SQL syntax, permissions and row limits before execution',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string' },
        datasourceId: { type: 'string' },
        maxRows: { type: 'number' },
      },
      required: ['sql', 'datasourceId'],
    },
  },
  {
    name: 'compose_dashboard_layout',
    description: 'Generate dashboard layout spec (panels + charts) from query results',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        rows: { type: 'array', items: { type: 'object' } },
        rowCount: { type: 'number' },
        theme: { type: 'string', enum: ['dark', 'light'] },
      },
      required: ['query', 'rows'],
    },
  },
  {
    name: 'render_dashboard',
    description: 'Render dashboard artifact and return previewUrl',
    inputSchema: {
      type: 'object',
      properties: {
        spec: { type: 'object', description: 'ReportSpec with outputFormat=dashboard' },
        gatewayBaseUrl: { type: 'string' },
      },
      required: ['spec'],
    },
  },
  {
    name: 'update_dashboard_layout',
    description: 'Update dashboard panel layout or chart types',
    inputSchema: {
      type: 'object',
      properties: {
        reportId: { type: 'string' },
        userId: { type: 'string' },
        layout: { type: 'object' },
        charts: { type: 'array', items: { type: 'object' } },
      },
      required: ['reportId', 'userId', 'layout'],
    },
  },
  {
    name: 'execute_panel_query',
    description: 'Execute a published query for dashboard panel refresh',
    inputSchema: {
      type: 'object',
      properties: {
        publishedQueryId: { type: 'string' },
        parameters: { type: 'object', additionalProperties: { type: 'string' } },
        shareToken: { type: 'string' },
      },
      required: ['publishedQueryId'],
    },
  },
];

export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export async function handleMcpJsonRpc(
  client: ReportMcpClient,
  req: JsonRpcRequest,
  traceId?: string,
): Promise<JsonRpcResponse> {
  try {
    switch (req.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            protocolVersion: '2024-11-05',
            serverInfo: { name: 'hermes-report-mcp', version: '0.1.0' },
            capabilities: { tools: {} },
          },
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: { tools: REPORT_MCP_TOOLS },
        };

      case 'tools/call': {
        const params = req.params ?? {};
        const name = params.name as string;
        const args = (params.arguments ?? {}) as Record<string, unknown>;
        const content = await invokeTool(client, name, args, traceId);
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(content, null, 2) }],
            isError: false,
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id: req.id,
          error: { code: -32601, message: `Method not found: ${req.method}` },
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: { code: -32000, message },
    };
  }
}

async function invokeTool(
  client: ReportMcpClient,
  name: string,
  args: Record<string, unknown>,
  traceId?: string,
): Promise<unknown> {
  switch (name) {
    case 'match_template':
      return client.matchTemplate(
        {
          query: String(args.query),
          mode: args.mode as 'sql' | 'report',
          topK: args.topK as number | undefined,
          threshold: args.threshold as number | undefined,
        },
        traceId,
      );
    case 'generate_report':
      return client.generateReport(
        {
          mode: 'report',
          query: String(args.query),
          schemaContext: args.schemaContext,
          datasourceId: String(args.datasourceId),
          parameters: args.parameters as Record<string, string> | undefined,
        },
        traceId,
      );
    case 'execute_report_query':
      return client.executeQuery(
        {
          sql: String(args.sql),
          datasourceId: String(args.datasourceId),
          parameters: args.parameters as Record<string, string> | undefined,
          maxRows: args.maxRows as number | undefined,
        },
        traceId,
      );
    case 'validate_sql':
      return client.validateSql(
        {
          sql: String(args.sql),
          datasourceId: String(args.datasourceId),
          maxRows: args.maxRows as number | undefined,
        },
        traceId,
      );
    case 'compose_dashboard_layout': {
      const rows = (args.rows as Record<string, unknown>[]) ?? [];
      const query = String(args.query ?? '数据大屏');
      const recommendedCharts = [
        { chartType: 'line' as const, chartConfig: { xField: 'x', yField: 'y', title: '趋势' } },
        { chartType: 'bar' as const, chartConfig: { xField: 'x', yField: 'y', title: '对比' } },
      ];
      const layout = createDefaultDashboardLayout(recommendedCharts.length, query.slice(0, 48));
      if (args.theme === 'light') layout.theme = 'light';
      const validation = validateDashboardLayout(layout, recommendedCharts.length);
      return {
        title: query.slice(0, 48),
        summary: `共 ${Number(args.rowCount ?? rows.length)} 行数据`,
        recommendedCharts,
        layout: validation.normalized ?? layout,
      };
    }
    case 'render_dashboard': {
      const spec = args.spec as ReportSpec;
      if (spec.outputFormat !== 'dashboard') {
        throw new Error('spec.outputFormat must be dashboard');
      }
      return client.renderReport(
        {
          spec,
          gatewayBaseUrl: args.gatewayBaseUrl as string | undefined,
        },
        traceId,
      );
    }
    case 'update_dashboard_layout':
      return client.updateDashboardLayout(
        {
          reportId: String(args.reportId),
          userId: String(args.userId),
          layout: args.layout as DashboardLayoutSpec,
          charts: args.charts as ReportSpec['charts'] | undefined,
        },
        traceId,
      );
    case 'execute_panel_query': {
      const queryId = String(args.publishedQueryId);
      const baseUrl = process.env.REPORT_SERVICE_URL ?? 'http://localhost:4030';
      const res = await fetch(`${baseUrl}/v1/published-queries/${queryId}/data`, {
        headers: {
          'Content-Type': 'application/json',
          ...(args.shareToken ? { 'x-share-token': String(args.shareToken) } : {}),
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`panel query failed: ${res.status} ${text}`);
      }
      return res.json();
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
