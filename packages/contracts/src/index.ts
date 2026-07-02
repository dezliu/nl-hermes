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

/** Chat / orchestrator API contracts (Phase 5) */
export type ChatStreamPhase = 'understanding' | 'retrieving' | 'generating';

export type ChatStreamEvent =
  | { type: 'phase'; phase: ChatStreamPhase }
  | { type: 'chunk'; content: string }
  | { type: 'templates'; results: TemplateMatchResult[] }
  | {
      type: 'done';
      runId: string;
      messageId: string;
      conversationId: string;
      status: 'completed' | 'interrupted' | 'failed';
      content: string;
      metadata?: Record<string, unknown>;
    }
  | { type: 'error'; code: string; message: string };

export type StartChatRequest = {
  userId: string;
  roleId?: string;
  conversationId?: string;
  query: string;
  mode: 'sql' | 'report';
  traceId?: string;
  /** Phase 6: apply template with filled parameters */
  templateId?: string;
  templateType?: 'sql' | 'report';
  templateParameters?: Record<string, string>;
};

export type TemplateDetail = {
  id: string;
  name: string;
  scenarioDescription: string;
  type: 'sql' | 'report';
  sqlBody: string;
  placeholders: string[];
  chartType?: 'line' | 'bar' | 'table';
  chartConfig?: Record<string, unknown>;
};

export type ConversationSummary = {
  id: string;
  title: string;
  mode: 'sql' | 'report';
  lastActiveAt: string;
};

export type ConversationMessageRecord = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  mode: 'sql' | 'report';
  status?: 'completed' | 'interrupted' | 'failed';
  templateId?: string | null;
  templateType?: 'sql' | 'report' | null;
  feedbackRating?: 'up' | 'down' | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
};

export type SubmitFeedbackRequest = {
  userId: string;
  messageId: string;
  rating: 'up' | 'down';
  reason?: string;
};

export type RenameConversationRequest = {
  userId: string;
  conversationId: string;
  title: string;
};

export type DeleteConversationRequest = {
  userId: string;
  conversationId: string;
};

export type StartChatResponse = {
  runId: string;
  conversationId: string;
  checkpointId: string;
};

export type CancelChatRequest = {
  userId: string;
  runId: string;
  conversationId: string;
};

export type ContinueChatRequest = {
  userId: string;
  roleId?: string;
  conversationId: string;
  checkpointId: string;
  query: string;
  mode: 'sql' | 'report';
  traceId?: string;
};

export type RolePrompt = {
  roleId: string | null;
  persona: string;
  constraints: string;
  version: number;
};

export type UserPermissions = {
  userId: string;
  roleId: string;
  allowedTables: string[];
  allowedFields: string[];
  datasourceId?: string;
};

/** Monitor / alerts (Phase 7) */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export type AlertRecord = {
  id: string;
  type: string;
  level: AlertLevel;
  title: string;
  message: string;
  refType?: string | null;
  refId?: string | null;
  status: AlertStatus;
  createdAt?: string;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
};

export type MetricPoint = {
  timestamp: string;
  value: number;
};

export type CacheHitMetrics = {
  currentRate: number;
  previousDayRate: number;
  trend: MetricPoint[];
  interpretation?: string;
};

export type RetrievalQualityAlert = {
  active: boolean;
  alertId?: string;
  triggeredAt?: string;
  lowScoreRatio?: number;
  topDomain?: string;
  suggestion?: string;
};

export type TokenMetrics = {
  range: '7d' | '30d';
  total: number;
  dailyAverage: number;
  trend: MetricPoint[];
};

export type SatisfactionMetrics = {
  rangeDays: number;
  upCount: number;
  downCount: number;
  satisfactionRate: number;
  byMode: { mode: 'sql' | 'report'; up: number; down: number; rate: number }[];
  topDownReasons: { reason: string; count: number }[];
  updatedAt: string;
};

export type MonitorDashboard = {
  cacheHit: CacheHitMetrics;
  retrievalAlert: RetrievalQualityAlert;
  tokenUsage: TokenMetrics;
  satisfaction: SatisfactionMetrics;
};

export type RecordMetricEvent = {
  type: 'query' | 'cache_hit' | 'cache_miss' | 'retrieval_score' | 'token_usage';
  value?: number;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

/** Offline evaluation (Phase 8) */
export type EvalSetRecord = {
  id: string;
  name: string;
  description?: string | null;
  isPreset: boolean;
  caseCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type EvalCaseRecord = {
  id: string;
  evalSetId: string;
  question: string;
  mode: 'sql' | 'report';
  expectedTables?: string[] | null;
  expectedPoints?: string | null;
  sortOrder: number;
};

export type EvalRunSummary = {
  retrievalHitRate: number;
  generateSuccessRate: number;
  averageScore: number;
  lowScoreCount: number;
  totalCases: number;
  domainSummary?: string;
  avgCaseDurationMs?: number;
};

export type EvalRunRecord = {
  id: string;
  evalSetId: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  summary?: EvalRunSummary | null;
  startedBy?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string;
};

export type EvalResultRecord = {
  id: string;
  evalRunId: string;
  evalCaseId: string;
  question?: string;
  mode?: 'sql' | 'report';
  retrievalHit?: boolean | null;
  generateSuccess?: boolean | null;
  score?: number | null;
  actualOutput?: Record<string, unknown> | null;
  expectedPoints?: string | null;
  diffNotes?: string | null;
};

export type StartEvalRunRequest = {
  evalSetId: string;
  startedBy?: string;
  concurrency?: number;
};

export type CreateEvalSetRequest = {
  name: string;
  description?: string;
  isPreset?: boolean;
};

export type UpsertEvalCaseRequest = {
  question: string;
  mode: 'sql' | 'report';
  expectedTables?: string[];
  expectedPoints?: string;
  sortOrder?: number;
};
