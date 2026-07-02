import type {
  ExecuteQueryRequest,
  ExecuteQueryResponse,
  ReportGenerateRequest,
  TemplateMatchRequest,
  TemplateMatchResult,
  ValidateSqlRequest,
  ValidateSqlResponse,
} from '@hermes/contracts';
import { withServiceAuth } from '@hermes/shared';

export type ReportMcpClientOptions = {
  baseUrl?: string;
  serviceName?: string;
};

export class ReportMcpClient {
  private readonly baseUrl: string;
  private readonly serviceName: string;

  constructor(options: ReportMcpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.REPORT_SERVICE_URL ?? 'http://localhost:4030';
    this.serviceName = options.serviceName ?? 'report-mcp-adapter';
  }

  async matchTemplate(input: TemplateMatchRequest, traceId?: string): Promise<TemplateMatchResult[]> {
    const res = await this.post<{ results: TemplateMatchResult[] }>(
      '/v1/templates/match',
      input,
      traceId,
    );
    return res.results;
  }

  async generateReport(input: ReportGenerateRequest, traceId?: string): Promise<unknown> {
    return this.post('/v1/reports/generate', input, traceId);
  }

  async executeQuery(input: ExecuteQueryRequest, traceId?: string): Promise<ExecuteQueryResponse> {
    return this.post<ExecuteQueryResponse>('/v1/query/execute', input, traceId);
  }

  async validateSql(input: ValidateSqlRequest, traceId?: string): Promise<ValidateSqlResponse> {
    return this.post<ValidateSqlResponse>('/v1/query/validate', input, traceId);
  }

  private async post<T>(path: string, body: unknown, traceId?: string): Promise<T> {
    const headers = withServiceAuth(
      {
        'Content-Type': 'application/json',
        ...(traceId ? { 'x-trace-id': traceId } : {}),
      },
      this.serviceName,
    );

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`report-service ${path} failed: ${res.status} ${text}`);
    }

    return (await res.json()) as T;
  }
}
