import { getServiceAuthHeaders } from '@hermes/shared';
import type { TemplateDetail } from '@hermes/contracts';
import { extractPlaceholders } from './template-utils.js';

type SqlTemplateRecord = {
  id: string;
  name: string;
  scenarioDescription: string;
  sqlBody: string;
  placeholders?: unknown;
  status?: string;
  inLibrary?: boolean;
};

type ReportTemplateRecord = SqlTemplateRecord & {
  chartType?: 'line' | 'bar' | 'table';
  chartConfig?: Record<string, unknown>;
};

export class MetadataTemplateClient {
  constructor(
    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',
  ) {}

  private async fetchJson<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.metadataUrl}${path}`, {
        headers: getServiceAuthHeaders('orchestrator'),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  async getTemplate(type: 'sql' | 'report', id: string): Promise<TemplateDetail | null> {
    const path = type === 'sql' ? '/v1/templates/sql' : '/v1/templates/report';
    const data = await this.fetchJson<{ items: (SqlTemplateRecord | ReportTemplateRecord)[] }>(`${path}?status=active`);
    const item = data?.items?.find((t) => t.id === id);
    if (!item) return null;

    const declared = Array.isArray(item.placeholders)
      ? (item.placeholders as string[])
      : typeof item.placeholders === 'object' && item.placeholders !== null
        ? Object.keys(item.placeholders as Record<string, unknown>)
        : [];
    const placeholders = declared.length > 0 ? declared : extractPlaceholders(item.sqlBody);

    const detail: TemplateDetail = {
      id: item.id,
      name: item.name,
      scenarioDescription: item.scenarioDescription,
      type,
      sqlBody: item.sqlBody,
      placeholders,
    };

    if (type === 'report') {
      const report = item as ReportTemplateRecord;
      detail.chartType = report.chartType;
      detail.chartConfig = report.chartConfig;
    }

    return detail;
  }
}

export function createMetadataTemplateClient(): MetadataTemplateClient {
  return new MetadataTemplateClient();
}
