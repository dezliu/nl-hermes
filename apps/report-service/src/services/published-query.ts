import { randomUUID } from 'node:crypto';
import type { Logger } from '@hermes/shared';
import type { PublishedQueryDataResponse, PublishedQueryRecord } from '@hermes/contracts';
import type { ReportService } from './report-service.js';

export class PublishedQueryService {
  private readonly queries = new Map<string, PublishedQueryRecord & { shareToken?: string }>();

  constructor(
    private readonly reportService: ReportService,
    private readonly logger: Logger,
  ) {}

  register(input: {
    reportId: string;
    sqlTemplate: string;
    datasourceId: string;
    parametersSchema?: Record<string, unknown>;
    authMode?: PublishedQueryRecord['authMode'];
    shareToken?: string;
  }): PublishedQueryRecord {
    const record: PublishedQueryRecord = {
      id: randomUUID(),
      reportId: input.reportId,
      sqlTemplate: input.sqlTemplate,
      datasourceId: input.datasourceId,
      parametersSchema: input.parametersSchema,
      authMode: input.authMode ?? 'token',
      createdAt: new Date().toISOString(),
    };
    this.queries.set(record.id, { ...record, shareToken: input.shareToken });
    return record;
  }

  get(id: string): PublishedQueryRecord | undefined {
    return this.queries.get(id);
  }

  async fetchData(
    id: string,
    parameters: Record<string, string> = {},
    auth?: { shareToken?: string },
  ): Promise<PublishedQueryDataResponse> {
    const query = this.queries.get(id);
    if (!query) {
      return { ok: false, error: { code: 'NOT_FOUND', message: '查询服务不存在' } };
    }

    if (query.authMode === 'token' && query.shareToken && auth?.shareToken !== query.shareToken) {
      return { ok: false, error: { code: 'FORBIDDEN', message: '无效的访问凭证' } };
    }

    const sql = fillSqlParameters(query.sqlTemplate, parameters);
    const result = await this.reportService.executeQuery({
      sql,
      datasourceId: query.datasourceId,
      parameters,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    this.logger.info('published_query.data', { queryId: id, rowCount: result.rowCount });
    return {
      ok: true,
      rows: result.rows,
      rowCount: result.rowCount,
      cachedAt: new Date().toISOString(),
    };
  }
}

function fillSqlParameters(sql: string, parameters: Record<string, string>): string {
  let filled = sql;
  for (const [key, value] of Object.entries(parameters)) {
    filled = filled.replaceAll(`{{${key}}}`, value);
  }
  return filled;
}
