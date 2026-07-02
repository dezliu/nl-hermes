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

export const metaApi = {
  listDatasources: () => request<{ items: unknown[] }>(METADATA_URL, '/v1/datasources'),
  createDatasource: (body: unknown) =>
    request(METADATA_URL, '/v1/datasources', { method: 'POST', body: JSON.stringify(body) }),
  testDatasource: (id: string) =>
    request(METADATA_URL, `/v1/datasources/${id}/test`, { method: 'POST' }),
  syncDatasource: (id: string) =>
    request(METADATA_URL, `/v1/datasources/${id}/sync`, { method: 'POST' }),
  listTables: (datasourceId: string) =>
    request<{ items: unknown[] }>(METADATA_URL, `/v1/datasources/${datasourceId}/tables`),
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
