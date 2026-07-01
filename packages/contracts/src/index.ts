/** Shared API contract types between microservices */
export type RetrieveRequest = {
  query: string;
  collection: 'metadata' | 'business' | 'templates';
  mode?: 'sql' | 'report';
  topK?: number;
};

export type RetrieveResult = {
  id: string;
  content: string;
  score: number;
  matchReason?: string;
};

export type ReportGenerateRequest = {
  mode: 'report';
  query: string;
  schemaContext: unknown;
  datasourceId: string;
  parameters?: Record<string, string>;
};
