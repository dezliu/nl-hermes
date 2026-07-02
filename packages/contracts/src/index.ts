/** Shared API contract types between microservices */
export type RetrieveRequest = {
  query: string;
  collection: 'metadata' | 'business' | 'templates';
  mode?: 'sql' | 'report';
  topK?: number;
  bm25TopK?: number;
  vectorTopK?: number;
  rrfK?: number;
  rerankTopK?: number;
  enableRerank?: boolean;
};

export type RetrieveResult = {
  id: string;
  content: string;
  score: number;
  matchReason?: string;
  source?: 'bm25' | 'vector' | 'rrf' | 'rerank';
};

export type RetrieveResponse = {
  results: RetrieveResult[];
  query: string;
  collection: string;
  fusedScore?: number;
};

export type ScoreRequest = {
  query: string;
  collection: 'metadata' | 'business' | 'templates';
  results?: RetrieveResult[];
};

export type ScoreResponse = {
  score: number;
  level: 'high' | 'medium' | 'low';
  details: { id: string; score: number }[];
};

export type ReportGenerateRequest = {
  mode: 'report';
  query: string;
  schemaContext: unknown;
  datasourceId: string;
  parameters?: Record<string, string>;
};

export type TemplateMatchRequest = {
  query: string;
  mode: 'sql' | 'report';
  topK?: number;
  threshold?: number;
};

export type TemplateMatchResult = {
  id: string;
  name: string;
  scenarioDescription: string;
  score: number;
  type: 'sql' | 'report';
};

export type ExecuteQueryRequest = {
  sql: string;
  datasourceId: string;
  parameters?: Record<string, string>;
  maxRows?: number;
};

export type StructuredError = {
  code: string;
  field?: string;
  message: string;
  suggestion?: string;
};

export type ExecuteQueryResponse = {
  ok: boolean;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  truncated?: boolean;
  error?: StructuredError;
};

export type ValidateSqlRequest = {
  sql: string;
  datasourceId: string;
  maxRows?: number;
};

export type ValidateSqlResponse = {
  valid: boolean;
  errors: StructuredError[];
};
