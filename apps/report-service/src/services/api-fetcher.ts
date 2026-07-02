import type { ExecuteQueryResponse } from '@hermes/contracts';

export type ApiDataSourceConfig = {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  dataPath?: string;
};

export class ApiDataFetcher {
  async fetch(config: ApiDataSourceConfig, parameters: Record<string, string> = {}): Promise<ExecuteQueryResponse> {
    try {
      let url = config.url;
      for (const [key, value] of Object.entries(parameters)) {
        url = url.replace(`{{${key}}}`, encodeURIComponent(value));
      }

      const res = await fetch(url, {
        method: config.method ?? 'GET',
        headers: config.headers,
      });

      if (!res.ok) {
        return {
          ok: false,
          error: {
            code: 'API_FETCH_FAILED',
            message: `API 请求失败: HTTP ${res.status}`,
            suggestion: '请检查 API 数据源配置与鉴权信息',
          },
        };
      }

      const json = (await res.json()) as unknown;
      const rows = this.extractRows(json, config.dataPath);
      return { ok: true, rows, rowCount: rows.length };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'API_FETCH_ERROR',
          message: err instanceof Error ? err.message : 'API 取数失败',
        },
      };
    }
  }

  private extractRows(json: unknown, dataPath?: string): Record<string, unknown>[] {
    if (!dataPath) {
      if (Array.isArray(json)) return json as Record<string, unknown>[];
      if (json && typeof json === 'object' && 'data' in json && Array.isArray((json as { data: unknown }).data)) {
        return (json as { data: Record<string, unknown>[] }).data;
      }
      return [json as Record<string, unknown>];
    }
    const parts = dataPath.split('.');
    let cur: unknown = json;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) cur = (cur as Record<string, unknown>)[p];
      else return [];
    }
    return Array.isArray(cur) ? (cur as Record<string, unknown>[]) : [];
  }
}
