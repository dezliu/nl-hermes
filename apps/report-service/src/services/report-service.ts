import type { Logger } from '@hermes/shared';
import { getServiceAuthHeaders } from '@hermes/shared';
import type {
  ExecuteQueryRequest,
  ExecuteQueryResponse,
  ReportGenerateRequest,
  ReportRenderRequest,
  ReportShareRequest,
  ReportShareResponse,
  ValidateSqlRequest,
  ValidateSqlResponse,
} from '@hermes/contracts';
import { SqlExecutor, type DatasourceConfig } from './sql-executor.js';
import { ApiDataFetcher } from './api-fetcher.js';
import { isSelectOnly } from '../lib/sql-utils.js';
import type { ArtifactRenderer } from './artifact-renderer.js';

type DatasourceRow = {
  host: string;
  port: number;
  username: string;
  passwordEncrypted: string;
  databaseName: string;
};

export class ReportService {
  constructor(
    private readonly sqlExecutor: SqlExecutor,
    private readonly apiFetcher: ApiDataFetcher,
    private readonly logger: Logger,
    private readonly artifactRenderer?: ArtifactRenderer,
    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',
    private readonly decryptPassword: (encrypted: string) => string = () => '',
  ) {}

  private async getDatasource(id: string): Promise<DatasourceConfig | null> {
    try {
      const res = await fetch(`${this.metadataUrl}/v1/datasources/${id}`, {
        headers: getServiceAuthHeaders('report-service'),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { item: DatasourceRow & { passwordEncrypted?: string } };
      const ds = data.item;
      if (!ds) return null;
      const password = process.env.DATASOURCE_DEV_PASSWORD ?? 'hermes_dev';
      return {
        host: ds.host,
        port: ds.port,
        username: ds.username,
        password,
        databaseName: ds.databaseName,
      };
    } catch {
      return null;
    }
  }

  private async getMaxRows(): Promise<number> {
    try {
      const res = await fetch(`${this.metadataUrl}/v1/settings/report/report.maxRows`, {
        headers: getServiceAuthHeaders('report-service'),
      });
      if (!res.ok) return 1000;
      const data = (await res.json()) as { item?: { settingValue?: number } };
      return Number(data.item?.settingValue ?? 1000);
    } catch {
      return 1000;
    }
  }

  async executeQuery(req: ExecuteQueryRequest, traceId?: string): Promise<ExecuteQueryResponse> {
    if (!isSelectOnly(req.sql)) {
      return {
        ok: false,
        error: {
          code: 'FORBIDDEN_STATEMENT',
          message: '仅允许 SELECT 查询',
          suggestion: '请移除数据修改类语句',
        },
      };
    }

    const ds = await this.getDatasource(req.datasourceId);
    if (!ds) {
      return {
        ok: false,
        error: { code: 'DATASOURCE_NOT_FOUND', message: '数据源不存在' },
      };
    }
    const maxRows = req.maxRows ?? (await this.getMaxRows());
    const result = await this.sqlExecutor.execute(req.sql, ds, {
      parameters: req.parameters,
      maxRows,
    });
    this.logger.info('report.query.executed', {
      traceId,
      datasourceId: req.datasourceId,
      ok: result.ok,
      rowCount: result.rowCount,
    });
    return result;
  }

  async validateSql(req: ValidateSqlRequest, traceId?: string): Promise<ValidateSqlResponse> {
    const ds = await this.getDatasource(req.datasourceId);
    if (!ds) {
      return { valid: false, errors: [{ code: 'DATASOURCE_NOT_FOUND', message: '数据源不存在' }] };
    }
    const maxRows = req.maxRows ?? (await this.getMaxRows());
    const result = await this.sqlExecutor.validate(req.sql, ds, maxRows, req.lightweight ?? false);
    this.logger.info('report.sql.validated', { traceId, valid: result.valid });
    return result;
  }

  async generateReport(req: ReportGenerateRequest, traceId?: string) {
    this.logger.info('report.generate.requested', { traceId, datasourceId: req.datasourceId });
    return {
      status: 'draft',
      message: '报表生成由 orchestrator LLM 编排完成；此处返回结构化占位',
      mode: req.mode,
      query: req.query,
      schemaContext: req.schemaContext,
    };
  }

  getApiFetcher() {
    return this.apiFetcher;
  }

  getArtifactRenderer(): ArtifactRenderer | undefined {
    return this.artifactRenderer;
  }

  async renderReport(req: ReportRenderRequest, traceId?: string) {
    if (!this.artifactRenderer) {
      throw Object.assign(new Error('Artifact renderer not configured'), { code: 'NOT_CONFIGURED' });
    }
    this.logger.info('report.render.requested', { traceId, reportId: req.spec.id, format: req.spec.outputFormat });
    const artifact = await this.artifactRenderer.render(req);
    return { artifact };
  }

  async createShare(req: ReportShareRequest): Promise<ReportShareResponse> {
    if (!this.artifactRenderer) {
      throw Object.assign(new Error('Artifact renderer not configured'), { code: 'NOT_CONFIGURED' });
    }
    return this.artifactRenderer.createShare(req);
  }
}
