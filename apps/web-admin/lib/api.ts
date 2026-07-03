const METADATA_URL = process.env.NEXT_PUBLIC_METADATA_URL ?? 'http://localhost:4050';
const RAG_URL = process.env.NEXT_PUBLIC_RAG_URL ?? 'http://localhost:4020';
const EVAL_URL = process.env.NEXT_PUBLIC_EVAL_URL ?? 'http://localhost:4040';
const SERVICE_TOKEN = process.env.NEXT_PUBLIC_SERVICE_TOKEN ?? 'hermes-dev-service-token';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-service-token': SERVICE_TOKEN,
  };
}

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.headers.get('content-type')?.includes('text/markdown')) {
    return res.text() as Promise<T>;
  }
  return res.json() as Promise<T>;
}

export type MetaTableItem = {
  id: string;
  physicalName: string;
  businessName?: string | null;
  description?: string | null;
  source: string;
  sourceStatus?: string;
  inQueryLibrary: boolean;
  fields?: MetaFieldItem[];
};

export type MetaFieldItem = {
  id: string;
  physicalName: string;
  businessName?: string | null;
  description?: string | null;
  dataType: string;
  inQueryLibrary: boolean;
  isSensitive: boolean;
  sourceStatus?: string;
  synonyms?: { synonym: string }[];
};

export type SyncPreviewField = {
  physicalName: string;
  dataType: string;
  columnComment?: string;
};

export type SyncPreviewTable = {
  physicalName: string;
  tableComment?: string;
  fields: SyncPreviewField[];
};

export type SyncDatasourceOptions = {
  mode?: 'full' | 'selective';
  tables?: Array<{ physicalName: string; fields?: string[] }>;
  defaultInQueryLibrary?: boolean;
};

export type SyncDatasourceResult = {
  tablesSynced: number;
  fieldsSynced: number;
};

export const metaApi = {
  listDatasources: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/datasources'),
  createDatasource: (body: unknown) =>
    request(METADATA_URL, '/v1/datasources', { method: 'POST', body: JSON.stringify(body) }),
  testDatasource: (id: string) =>
    request(METADATA_URL, `/v1/datasources/${id}/test`, { method: 'POST' }),
  previewSync: (id: string) =>
    request<{ tables: SyncPreviewTable[] }>(METADATA_URL, `/v1/datasources/${id}/sync/preview`),
  syncDatasource: (id: string, body?: SyncDatasourceOptions) =>
    request<SyncDatasourceResult>(METADATA_URL, `/v1/datasources/${id}/sync`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),
  listTables: (datasourceId: string) =>
    request<{ items: MetaTableItem[] }>(METADATA_URL, `/v1/datasources/${datasourceId}/tables`),
  getTable: (id: string) =>
    request<{ item: MetaTableItem }>(METADATA_URL, `/v1/meta/tables/${id}`),
  updateTable: (
    id: string,
    body: Partial<{ businessName: string; description: string; inQueryLibrary: boolean }>,
  ) =>
    request<{ item: MetaTableItem }>(METADATA_URL, `/v1/meta/tables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  updateField: (
    id: string,
    body: Partial<{
      businessName: string;
      description: string;
      inQueryLibrary: boolean;
      isSensitive: boolean;
      synonyms: string[];
    }>,
  ) =>
    request<{ item: MetaTableItem }>(METADATA_URL, `/v1/meta/fields/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  listRoles: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/prompts/roles'),
  listPromptVersions: (roleId?: string) =>
    request<{ items: unknown[] }>(
      METADATA_URL,
      `/v1/prompts${roleId ? `?roleId=${roleId}` : ''}`,
    ),
  savePrompt: (body: unknown) =>
    request(METADATA_URL, '/v1/prompts', { method: 'POST', body: JSON.stringify(body) }),
  listSettings: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/settings'),
};

export type BusinessKnowledgeItem = {
  id: string;
  title: string;
  category: 'glossary' | 'metric' | 'rule' | 'faq';
  content: string;
  status: 'active' | 'archived';
  createdAt?: string;
  updatedAt?: string;
};

export const businessKnowledgeApi = {
  list: (params?: { status?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    const q = qs.toString();
    return request<{ items: BusinessKnowledgeItem[] }>(
      METADATA_URL,
      `/v1/business-knowledge${q ? `?${q}` : ''}`,
    );
  },
  create: (body: Omit<BusinessKnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<{ item: BusinessKnowledgeItem }>(METADATA_URL, '/v1/business-knowledge', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: string, body: Partial<BusinessKnowledgeItem>) =>
    request<{ item: BusinessKnowledgeItem }>(METADATA_URL, `/v1/business-knowledge/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export type SqlTemplateItem = {
  id: string;
  name: string;
  scenarioDescription: string;
  sqlBody: string;
  score?: number | null;
  inLibrary: boolean;
  status: 'draft' | 'active' | 'archived';
  usageCount?: number;
};

export type ReportTemplateItem = SqlTemplateItem & {
  chartType: 'line' | 'bar' | 'table';
  chartConfig?: Record<string, string> | null;
};

export const templateApi = {
  listSql: (status?: string) =>
    request<{ items: SqlTemplateItem[] }>(
      METADATA_URL,
      `/v1/templates/sql${status ? `?status=${status}` : ''}`,
    ),
  createSql: (body: Partial<SqlTemplateItem>) =>
    request<{ item: SqlTemplateItem }>(METADATA_URL, '/v1/templates/sql', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSql: (id: string, body: Partial<SqlTemplateItem>) =>
    request<{ item: SqlTemplateItem }>(METADATA_URL, `/v1/templates/sql/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  listReport: (status?: string) =>
    request<{ items: ReportTemplateItem[] }>(
      METADATA_URL,
      `/v1/templates/report${status ? `?status=${status}` : ''}`,
    ),
  createReport: (body: Partial<ReportTemplateItem>) =>
    request<{ item: ReportTemplateItem }>(METADATA_URL, '/v1/templates/report', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateReport: (id: string, body: Partial<ReportTemplateItem>) =>
    request<{ item: ReportTemplateItem }>(METADATA_URL, `/v1/templates/report/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};

export type TemplateCandidateItem = {
  id: string;
  sourceMessageId: string;
  conversationId: string;
  mode: 'sql' | 'report';
  userQuery: string;
  scenarioDescription: string;
  sqlBody: string;
  chartType?: 'line' | 'bar' | 'table' | null;
  chartConfig?: Record<string, unknown> | null;
  ragScore?: number | null;
  userUpvoted: boolean;
  priority: number;
  status: 'pending' | 'approved' | 'rejected';
  templateId?: string | null;
  createdAt?: string;
};

export type GenerationFeedbackItem = {
  id: string;
  messageId: string;
  conversationId: string;
  mode: 'sql' | 'report';
  userQuery: string;
  assistantContent: string;
  generatedSql?: string | null;
  refuseReason?: string | null;
  ragScore?: number | null;
  feedbackReason: string;
  status: 'open' | 'resolved';
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resultTemplateId?: string | null;
  createdAt?: string;
};

export const closedLoopApi = {
  listCandidates: (status?: string) =>
    request<{ items: TemplateCandidateItem[] }>(
      METADATA_URL,
      `/v1/template-candidates${status ? `?status=${status}` : ''}`,
    ),
  approveCandidate: (
    id: string,
    body?: {
      name?: string;
      scenarioDescription?: string;
      sqlBody?: string;
      chartType?: 'line' | 'bar' | 'table';
      chartConfig?: Record<string, unknown>;
      status?: 'draft' | 'active' | 'archived';
      inLibrary?: boolean;
    },
  ) =>
    request<{ candidate: TemplateCandidateItem; template: unknown }>(
      METADATA_URL,
      `/v1/template-candidates/${id}/approve`,
      { method: 'POST', body: JSON.stringify(body ?? { inLibrary: false }) },
    ),
  rejectCandidate: (id: string) =>
    request<{ item: TemplateCandidateItem }>(METADATA_URL, `/v1/template-candidates/${id}/reject`, {
      method: 'POST',
    }),
  listFeedback: (status?: string) =>
    request<{ items: GenerationFeedbackItem[] }>(
      METADATA_URL,
      `/v1/generation-feedback${status ? `?status=${status}` : ''}`,
    ),
  resolveFeedback: (id: string, body?: { resultTemplateId?: string }) =>
    request<{ item: GenerationFeedbackItem }>(METADATA_URL, `/v1/generation-feedback/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(body ?? {}),
    }),
};

export const ragApi = {
  retrieve: (body: unknown) =>
    request<{ results: { id: string; content: string; score: number; matchReason?: string }[] }>(
      RAG_URL,
      '/v1/retrieve',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  rebuildIndex: (collection?: string) =>
    request(RAG_URL, '/v1/index/rebuild', {
      method: 'POST',
      body: JSON.stringify({ collection }),
    }),
};

export function scoreLabel(score: number): '高' | '中' | '低' {
  if (score >= 0.6) return '高';
  if (score >= 0.35) return '中';
  return '低';
}

export const alertApi = {
  list: (query?: Record<string, string>) => {
    const qs = query ? `?${new URLSearchParams(query).toString()}` : '';
    return request<{ items: AlertItem[] }>(METADATA_URL, `/v1/alerts${qs}`);
  },
  unreadCount: () => request<{ count: number }>(METADATA_URL, '/v1/alerts/unread-count'),
  update: (id: string, body: { status: string; resolutionNote?: string }) =>
    request<{ item: AlertItem }>(METADATA_URL, `/v1/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  batchRead: (ids: string[]) =>
    request<{ updated: number }>(METADATA_URL, '/v1/alerts/batch-read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

export type AlertItem = {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  status: 'open' | 'acknowledged' | 'resolved';
  refType?: string;
  refId?: string;
  createdAt?: string;
};

export const evalApi = {
  listSets: () => request<{ items: EvalSetItem[] }>(EVAL_URL, '/v1/eval/sets'),
  getSet: (id: string) => request<{ item: EvalSetDetail }>(EVAL_URL, `/v1/eval/sets/${id}`),
  createSet: (body: { name: string; description?: string }) =>
    request<{ item: EvalSetItem }>(EVAL_URL, '/v1/eval/sets', { method: 'POST', body: JSON.stringify(body) }),
  addCase: (setId: string, body: EvalCaseInput) =>
    request<{ item: EvalCaseItem }>(EVAL_URL, `/v1/eval/sets/${setId}/cases`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  startRun: (evalSetId: string) =>
    request<{ item: EvalRunItem }>(EVAL_URL, '/v1/eval/runs', {
      method: 'POST',
      body: JSON.stringify({ evalSetId }),
    }),
  getRun: (runId: string) => request<{ item: EvalRunDetail }>(EVAL_URL, `/v1/eval/runs/${runId}`),
  cancelRun: (runId: string) =>
    request<{ ok: boolean }>(EVAL_URL, `/v1/eval/runs/${runId}/cancel`, { method: 'POST' }),
  exportReport: (runId: string) => request<string>(EVAL_URL, `/v1/eval/runs/${runId}/export`),
};

export type EvalSetItem = { id: string; name: string; description?: string; caseCount?: number };
export type EvalCaseItem = {
  id: string;
  question: string;
  mode: 'sql' | 'report';
  expectedTables?: string[];
  expectedPoints?: string;
};
export type EvalSetDetail = EvalSetItem & { cases: EvalCaseItem[] };
export type EvalCaseInput = {
  question: string;
  mode: 'sql' | 'report';
  expectedTables?: string[];
  expectedPoints?: string;
};
export type EvalRunItem = {
  id: string;
  evalSetId: string;
  status: string;
  progress: number;
  summary?: {
    retrievalHitRate: number;
    generateSuccessRate: number;
    averageScore: number;
    lowScoreCount: number;
    avgCaseDurationMs?: number;
  };
};
export type EvalRunDetail = EvalRunItem & {
  results: {
    id: string;
    question?: string;
    mode?: string;
    retrievalHit?: boolean;
    generateSuccess?: boolean;
    score?: number;
    diffNotes?: string;
    expectedPoints?: string;
  }[];
};
