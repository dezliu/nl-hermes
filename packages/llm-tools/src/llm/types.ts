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
  }): Promise<{ sql: string; explanation: string }>;

  generateReport(input: {
    query: string;
    schemaContext: unknown[];
    businessKnowledge: unknown[];
    examples: unknown[];
    rolePrompt?: RolePromptInput;
    errorFeedback?: string;
  }): Promise<{
    sql: string;
    chartType: 'line' | 'bar' | 'table';
    chartConfig: Record<string, string>;
    explanation: string;
  }>;
};

export type LlmProviderName = 'openai' | 'aliyun' | 'zhipu';

export type ResolvedLlmConfig = {
  provider: LlmProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
};
