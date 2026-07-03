import { withServiceAuth, HTTP_HEADERS } from '@hermes/shared';
import type {
  ExecuteQueryRequest,
  ExecuteQueryResponse,
  ReportRenderRequest,
  ReportRenderResponse,
  ReportShareRequest,
  ReportShareResponse,
  ReportSpec,
  RetrieveRequest,
  RetrieveResponse,
  RolePrompt,
  ScoreRequest,
  ScoreResponse,
  TemplateMatchRequest,
  UserPermissions,
  ValidateSqlRequest,
  ValidateSqlResponse,
} from '@hermes/contracts';
import type { TemplateMatchResult } from '@hermes/contracts';

export type ClientOptions = {
  baseUrl: string;
  serviceName?: string;
  traceId?: string;
};

function buildHeaders(opts: ClientOptions): Record<string, string> {
  const headers = withServiceAuth({}, opts.serviceName);
  if (opts.traceId) headers[HTTP_HEADERS.TRACE_ID] = opts.traceId;
  headers['Content-Type'] = 'application/json';
  return headers;
}

async function postJson<T>(url: string, body: unknown, opts: ClientOptions): Promise<T> {
  const res = await fetch(`${opts.baseUrl}${url}`, {
    method: 'POST',
    headers: buildHeaders(opts),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export class RagClient {
  constructor(private readonly opts: ClientOptions) {}

  retrieve(req: RetrieveRequest): Promise<RetrieveResponse> {
    return postJson('/v1/retrieve', req, this.opts);
  }

  score(req: ScoreRequest): Promise<ScoreResponse> {
    return postJson('/v1/score', req, this.opts);
  }

  rebuildIndex(collection?: string): Promise<unknown> {
    return postJson('/v1/index/rebuild', { collection }, this.opts);
  }
}

export class ReportClient {
  constructor(private readonly opts: ClientOptions) {}

  matchTemplates(req: TemplateMatchRequest): Promise<{ results: TemplateMatchResult[] }> {
    return postJson('/v1/templates/match', req, this.opts);
  }

  executeQuery(req: ExecuteQueryRequest): Promise<ExecuteQueryResponse> {
    return postJson('/v1/query/execute', req, this.opts);
  }

  validateSql(req: ValidateSqlRequest): Promise<ValidateSqlResponse> {
    return postJson('/v1/query/validate', req, this.opts);
  }

  renderReport(req: ReportRenderRequest): Promise<ReportRenderResponse> {
    return postJson('/v1/reports/render', req, this.opts);
  }

  getReport(id: string): Promise<{ spec: ReportSpec; artifact: ReportRenderResponse['artifact'] }> {
    return getJson(`${this.opts.baseUrl}/v1/reports/${id}`, this.opts);
  }

  createShare(req: ReportShareRequest): Promise<ReportShareResponse> {
    return postJson('/v1/reports/share', req, this.opts);
  }
}

export function createRagClient(baseUrl = process.env.RAG_SERVICE_URL ?? 'http://localhost:4020', traceId?: string) {
  return new RagClient({ baseUrl, serviceName: 'orchestrator', traceId });
}

export function createReportClient(
  baseUrl = process.env.REPORT_SERVICE_URL ?? 'http://localhost:4030',
  traceId?: string,
) {
  return new ReportClient({ baseUrl, serviceName: 'orchestrator', traceId });
}

async function getJson<T>(url: string, opts: ClientOptions): Promise<T> {
  const res = await fetch(url, { headers: buildHeaders(opts) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export type QueryLibraryFieldRecord = {
  id: string;
  tableId?: string;
  physicalName: string;
  businessName?: string;
  description?: string;
  dataType?: string;
  tablePhysicalName: string;
  tableBusinessName?: string;
  synonyms?: { synonym: string }[];
};

export class MetadataClient {
  constructor(private readonly opts: ClientOptions) {}

  getActivePrompt(roleId: string | null): Promise<RolePrompt | null> {
    const path = roleId ? `/v1/prompts/${roleId}/active` : '/v1/prompts/default/active';
    return getJson<{ item: RolePrompt }>(`${this.opts.baseUrl}${path}`, this.opts)
      .then((r) => r.item)
      .catch(() => null);
  }

  getUserPermissions(userId: string): Promise<UserPermissions> {
    return getJson<UserPermissions>(`${this.opts.baseUrl}/v1/permissions/${userId}`, this.opts).catch(
      () => ({
        userId,
        roleId: 'default',
        allowedTables: [],
        allowedFields: [],
      }),
    );
  }

  listQueryLibrary(): Promise<{ items: QueryLibraryFieldRecord[] }> {
    return getJson(`${this.opts.baseUrl}/v1/meta/query-library`, this.opts);
  }

  listDatasources(): Promise<{ items: { id: string; name: string }[] }> {
    return getJson(`${this.opts.baseUrl}/v1/datasources`, this.opts);
  }

  private async datasourceExists(id: string): Promise<boolean> {
    try {
      await getJson(`${this.opts.baseUrl}/v1/datasources/${id}`, this.opts);
      return true;
    } catch {
      return false;
    }
  }

  async resolveDatasourceId(preferred?: string): Promise<string> {
    if (preferred && (await this.datasourceExists(preferred))) {
      return preferred;
    }

    const envId = process.env.DEFAULT_DATASOURCE_ID?.trim();
    if (envId && (await this.datasourceExists(envId))) {
      return envId;
    }

    const { items } = await this.listDatasources();
    if (items.length > 0) {
      return items[0]!.id;
    }

    throw new Error(
      '未配置有效数据源。请执行 pnpm seed:settle 并在 .env 设置 DEFAULT_DATASOURCE_ID。',
    );
  }
}

export function createMetadataClient(
  baseUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',
  traceId?: string,
) {
  return new MetadataClient({ baseUrl, serviceName: 'orchestrator', traceId });
}
