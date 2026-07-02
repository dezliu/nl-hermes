import type { Logger } from '@hermes/shared';
import type { Repositories } from '../repositories/index.js';
import { newId } from '../lib/crypto.js';

export class TemplateService {
  constructor(
    private readonly repos: Repositories,
    private readonly logger: Logger,
  ) {}

  listSql(status?: string) {
    return this.repos.template.listSql(status);
  }

  listReport(status?: string) {
    return this.repos.template.listReport(status);
  }

  getSql(id: string) {
    return this.repos.template.findSql(id);
  }

  getReport(id: string) {
    return this.repos.template.findReport(id);
  }

  async createSql(
    input: {
      name: string;
      scenarioDescription: string;
      sqlBody: string;
      placeholders?: unknown;
      createdBy?: string;
    },
    traceId?: string,
  ) {
    const row = await this.repos.template.insertSql({
      id: newId(),
      ...input,
      status: 'draft',
      inLibrary: false,
      usageCount: 0,
    });
    this.logger.info('template.sql.created', { traceId, templateId: row.id });
    return row;
  }

  async createReport(
    input: {
      name: string;
      scenarioDescription: string;
      sqlBody: string;
      chartType: 'line' | 'bar' | 'table';
      chartConfig?: unknown;
      placeholders?: unknown;
      createdBy?: string;
    },
    traceId?: string,
  ) {
    const row = await this.repos.template.insertReport({
      id: newId(),
      ...input,
      status: 'draft',
      inLibrary: false,
      usageCount: 0,
    });
    this.logger.info('template.report.created', { traceId, templateId: row.id });
    return row;
  }

  async updateSql(id: string, input: Record<string, unknown>, traceId?: string) {
    const row = await this.repos.template.patchSql(id, input);
    if (row) this.logger.info('template.sql.updated', { traceId, templateId: id });
    return row;
  }

  async updateReport(id: string, input: Record<string, unknown>, traceId?: string) {
    const row = await this.repos.template.patchReport(id, input);
    if (row) this.logger.info('template.report.updated', { traceId, templateId: id });
    return row;
  }

  listInLibrary(mode: 'sql' | 'report') {
    return this.repos.template.listInLibrary(mode);
  }
}
