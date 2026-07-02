const METADATA_URL = process.env.NEXT_PUBLIC_METADATA_URL ?? 'http://localhost:4050';
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';
const SERVICE_TOKEN = process.env.NEXT_PUBLIC_SERVICE_TOKEN ?? 'hermes-dev-service-token';

function headers(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-service-token': SERVICE_TOKEN,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${METADATA_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type Dashboard = {
  cacheHit: { currentRate: number; previousDayRate: number; trend: { timestamp: string; value: number }[]; interpretation?: string };
  retrievalAlert: { active: boolean; lowScoreRatio?: number; suggestion?: string; alertId?: string };
  tokenUsage: { range: '7d' | '30d'; total: number; dailyAverage: number; trend: { timestamp: string; value: number }[] };
  satisfaction: {
    upCount: number;
    downCount: number;
    satisfactionRate: number;
    byMode: { mode: string; up: number; down: number; rate: number }[];
    topDownReasons: { reason: string; count: number }[];
    updatedAt: string;
  };
};

export const monitorApi = {
  getDashboard: (tokenRange: '7d' | '30d' = '7d') =>
    request<{ dashboard: Dashboard }>(`/v1/monitor/dashboard?tokenRange=${tokenRange}`),
  getAlert: (id: string) => request<{ item: unknown }>(`/v1/alerts/${id}`),
};

export function adminAlertUrl(alertId: string): string {
  const url = `${ADMIN_URL}/admin/alerts?id=${encodeURIComponent(alertId)}`;
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c5ef2c' },
    body: JSON.stringify({
      sessionId: 'c5ef2c',
      location: 'api.ts:adminAlertUrl',
      message: 'built admin alert link',
      data: { url, alertId, hypothesisId: 'A' },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return url;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function trendDirection(current: number, previous: number): 'up' | 'down' | 'flat' {
  if (current > previous + 0.01) return 'up';
  if (current < previous - 0.01) return 'down';
  return 'flat';
}
