import type { ReportMcpClient } from './report-client.js';

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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
