const METADATA_URL = process.env.NEXT_PUBLIC_METADATA_URL ?? 'http://localhost:4050';
const SERVICE_TOKEN = process.env.NEXT_PUBLIC_SERVICE_TOKEN ?? 'hermes-dev-service-token';

export type DatasourceSummary = {
  id: string;
  name: string;
  databaseName?: string;
  connectionStatus?: string;
};

const DATASOURCE_STORAGE_KEY = 'hermes-user-datasource-id';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-service-token': SERVICE_TOKEN,
  };
}

export async function listDatasources(): Promise<DatasourceSummary[]> {
  const res = await fetch(`${METADATA_URL}/v1/datasources`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { items: DatasourceSummary[] };
  return data.items ?? [];
}

function canUseStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function loadStoredDatasourceId(): string | undefined {
  if (!canUseStorage()) return undefined;
  return localStorage.getItem(DATASOURCE_STORAGE_KEY) ?? undefined;
}

export function storeDatasourceId(id: string | undefined): void {
  if (!canUseStorage()) return;
  if (id) {
    localStorage.setItem(DATASOURCE_STORAGE_KEY, id);
  } else {
    localStorage.removeItem(DATASOURCE_STORAGE_KEY);
  }
}
