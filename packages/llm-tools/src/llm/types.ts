export type RolePromptInput = {
  persona: string;
  constraints: string;
} | null | undefined;

export type ChatHistoryItem = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type LlmProvider = {
  classifyIntent(input: {
    query: string;
    mode: 'sql' | 'report';
    history: ChatHistoryItem[];
  }): Promise<{
    intent: 'direct_answer' | 'needs_generation' | 'refuse';
    confidence?: number;
    reason?: string;
    answer?: string;
    clarifyQuestion?: string;
  }>;

  rewriteQueries(input: { query: string; mode: 'sql' | 'report' }): Promise<string[]>;

  generateHydeDraft(input: { query: string; mode: 'sql' | 'report' }): Promise<string>;

  summarizeResult(input: {
    query: string;
    mode: 'sql' | 'report';
    sql?: string;
    rows: Record<string, unknown>[];
    rowCount: number;
  }): Promise<string>;

  generateSql(input: {
    query: string;
    schemaContext: unknown[];
    businessKnowledge: unknown[];
    examples: unknown[];
    mode: 'sql' | 'report';
    rolePrompt?: RolePromptInput;
    errorFeedback?: string;
    onThinking?: (chunk: string) => void;
  }): Promise<{ sql: string; explanation: string }>;

  generateReport(input: {
    query: string;
    schemaContext: unknown[];
    businessKnowledge: unknown[];
    examples: unknown[];
    rolePrompt?: RolePromptInput;
    errorFeedback?: string;
    onThinking?: (chunk: string) => void;
  }): Promise<{
    sql: string;
    chartType: 'line' | 'bar' | 'table';
    chartConfig: Record<string, string>;
    explanation: string;
  }>;

  analyzeReportData(input: {
    query: string;
    outputFormat: 'inline' | 'web' | 'word' | 'dashboard';
    sql?: string;
    rows: Record<string, unknown>[];
    rowCount: number;
    schemaContext: unknown[];
    businessKnowledge: unknown[];
    chartType?: string;
    chartConfig?: Record<string, string>;
  }): Promise<{
    title: string;
    summary: string;
    insights: string[];
    dataSources: string[];
    caveats?: string[];
    recommendedCharts?: Array<{
      chartType: 'line' | 'bar' | 'table' | 'pie';
      chartConfig: Record<string, string>;
    }>;
    sections?: { title: string; body: string; chartIndex?: number }[];
  }>;

  analyzeDashboardLayout(input: {
    query: string;
    sql?: string;
    rows: Record<string, unknown>[];
    rowCount: number;
    schemaContext: unknown[];
    businessKnowledge: unknown[];
    chartType?: string;
    chartConfig?: Record<string, string>;
  }): Promise<{
    title: string;
    summary: string;
    insights: string[];
    dataSources: string[];
    caveats?: string[];
    recommendedCharts: Array<{
      chartType: 'line' | 'bar' | 'table' | 'pie';
      chartConfig: Record<string, string>;
    }>;
    layout: import('@hermes/contracts').DashboardLayoutSpec;
  }>;
};

export type LlmProviderName = 'openai' | 'aliyun' | 'zhipu';

export type ResolvedLlmConfig = {
  provider: LlmProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
  fastModel?: string;
};
