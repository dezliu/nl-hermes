export type ChatHistoryItem = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type LlmProvider = {
  classifyIntent(input: {
    query: string;
    mode: 'sql' | 'report';
    history: ChatHistoryItem[];
  }): Promise<{ intent: 'direct_answer' | 'needs_generation' | 'refuse'; reason?: string; answer?: string }>;

  generateSql(input: {
    query: string;
    schemaContext: unknown[];
    businessKnowledge: unknown[];
    examples: unknown[];
    mode: 'sql' | 'report';
    errorFeedback?: string;
  }): Promise<{ sql: string; explanation: string }>;

  generateReport(input: {
    query: string;
    schemaContext: unknown[];
    businessKnowledge: unknown[];
    examples: unknown[];
    errorFeedback?: string;
  }): Promise<{ sql: string; chartType: 'line' | 'bar' | 'table'; chartConfig: Record<string, string>; explanation: string }>;
};

export type LlmProviderName = 'openai' | 'aliyun' | 'zhipu';

export type ResolvedLlmConfig = {
  provider: LlmProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
};
