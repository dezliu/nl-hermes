import { z } from 'zod';

export type ToolDefinition = {
  name: string;
  description: string;
  schema: z.ZodType;
  bindNodes: string[];
};

export const executeReportQuerySchema = z.object({
  sql: z.string(),
  chartType: z.enum(['line', 'bar', 'table']),
  chartConfig: z.object({
    xField: z.string(),
    yField: z.string(),
    seriesField: z.string().optional(),
  }),
  parameters: z.record(z.string()).optional(),
  datasourceId: z.string(),
});

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'retrieve_metadata',
    description: 'Retrieve table/field metadata from the smart query library.',
    schema: z.object({ query: z.string(), topK: z.number().optional() }),
    bindNodes: ['RagRetrieve'],
  },
  {
    name: 'retrieve_business_knowledge',
    description: 'Retrieve business knowledge docs and field samples.',
    schema: z.object({ query: z.string(), topK: z.number().optional() }),
    bindNodes: ['RagRetrieve'],
  },
  {
    name: 'retrieve_templates',
    description: 'Retrieve similar SQL/report templates as few-shot examples.',
    schema: z.object({ query: z.string(), mode: z.enum(['sql', 'report']), topK: z.number().optional() }),
    bindNodes: ['TemplateMatch', 'GenerateSQL', 'GenerateReport'],
  },
  {
    name: 'execute_report_query',
    description: 'Execute validated SQL and return chart-ready data. Report mode only.',
    schema: executeReportQuerySchema,
    bindNodes: ['GenerateReport'],
  },
  {
    name: 'validate_sql',
    description: 'Pre-validate SQL syntax, permissions, and row limits.',
    schema: z.object({ sql: z.string(), datasourceId: z.string() }),
    bindNodes: ['ValidateResult'],
  },
  {
    name: 'compose_dashboard_layout',
    description: 'Generate dashboard layout spec (panels + charts) from query results.',
    schema: z.object({
      query: z.string(),
      rows: z.array(z.record(z.unknown())),
      rowCount: z.number(),
      theme: z.enum(['dark', 'light']).optional(),
    }),
    bindNodes: ['AnalyzeReport'],
  },
  {
    name: 'validate_dashboard_layout',
    description: 'Validate dashboard grid layout and chart index bindings.',
    schema: z.object({
      layout: z.record(z.unknown()),
      chartCount: z.number(),
    }),
    bindNodes: ['ComposeSpec'],
  },
  {
    name: 'render_dashboard',
    description: 'Render dashboard artifact with preview and share URLs.',
    schema: z.object({ spec: z.record(z.unknown()) }),
    bindNodes: ['RenderArtifact'],
  },
];
