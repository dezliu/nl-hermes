const METADATA_URL = process.env.NEXT_PUBLIC_METADATA_URL ?? 'http://localhost:4050';
const RAG_URL = process.env.NEXT_PUBLIC_RAG_URL ?? 'http://localhost:4020';
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
