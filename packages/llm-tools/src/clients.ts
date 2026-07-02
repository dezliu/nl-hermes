import { withServiceAuth, HTTP_HEADERS } from '@hermes/shared';
import type {
  ExecuteQueryRequest,
  ExecuteQueryResponse,
  RetrieveRequest,
  RetrieveResponse,
  ScoreRequest,
  ScoreResponse,
  TemplateMatchRequest,
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
