import type { Logger } from '@hermes/shared';
import { getServiceAuthHeaders, HTTP_HEADERS, QDRANT_COLLECTIONS, OPENSEARCH_INDICES } from '@hermes/shared';
import { embedText } from '../lib/embedding.js';
import { OpenSearchClient } from '../lib/opensearch.js';
import { QdrantClient } from '../lib/qdrant.js';

type QueryLibraryField = {
  id: string;
  tableId: string;
  physicalName: string;
  businessName?: string;
  description?: string;
  dataType: string;
  tablePhysicalName: string;
  tableBusinessName?: string;
  synonyms?: { synonym: string }[];
};

export class IndexPipelineService {
  constructor(
    private readonly os: OpenSearchClient,
    private readonly qdrant: QdrantClient,
    private readonly logger: Logger,
    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',
  ) {}

  private authHeaders(traceId?: string): Record<string, string> {
    return {
      ...getServiceAuthHeaders('rag-service'),
      ...(traceId ? { [HTTP_HEADERS.TRACE_ID]: traceId } : {}),
    };
  }

  private async fetchQueryLibrary(): Promise<QueryLibraryField[]> {
    const res = await fetch(`${this.metadataUrl}/v1/meta/query-library`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch query library: ${res.status}`);
    const data = (await res.json()) as { items: QueryLibraryField[] };
    return data.items ?? [];
  }

  private buildMetadataDocs(fields: QueryLibraryField[]) {
    return fields.map((f) => {
      const synonymText = (f.synonyms ?? []).map((s) => s.synonym).join(' ');
      const content = [
        f.tablePhysicalName,
        f.tableBusinessName,
        f.physicalName,
        f.businessName,
        f.description,
        f.dataType,
        synonymText,
      ].filter(Boolean).join(' ');
      return {
        id: f.id,
        content,
        metadata: {
          tableId: f.tableId,
          tableName: f.tablePhysicalName,
          fieldName: f.physicalName,
          type: 'field',
        },
      };
    });
  }

  async rebuildMetadata(traceId?: string) {
    const fields = await this.fetchQueryLibrary();
    const docs = this.buildMetadataDocs(fields);
    const points = docs.map((d) => ({
      id: d.id,
      vector: embedText(d.content),
      payload: { content: d.content, metadata: d.metadata },
    }));

    await Promise.all([
      this.os.bulkIndex(OPENSEARCH_INDICES.METADATA, docs),
      this.qdrant.upsertPoints(QDRANT_COLLECTIONS.METADATA, points),
    ]);

    this.logger.info('rag.index.metadata.completed', { traceId, count: docs.length });
    return { collection: 'metadata', indexed: docs.length };
  }

  async rebuildBusiness(traceId?: string) {
    const res = await fetch(`${this.metadataUrl}/v1/business-knowledge?status=active`, {
      headers: this.authHeaders(traceId),
    });
    if (!res.ok) throw new Error(`Failed to fetch business knowledge: ${res.status}`);
    const data = (await res.json()) as {
      items: { id: string; title: string; category: string; content: string }[];
    };
    const items = data.items ?? [];

    const docs = items.map((item) => ({
      id: item.id,
      content: [item.title, item.category, item.content].join(' '),
      metadata: { type: item.category, title: item.title },
    }));
    const points = docs.map((d) => ({
      id: d.id,
      vector: embedText(d.content),
      payload: { content: d.content, metadata: d.metadata },
    }));

    await Promise.all([
      this.os.bulkIndex(OPENSEARCH_INDICES.BUSINESS, docs),
      this.qdrant.upsertPoints(QDRANT_COLLECTIONS.BUSINESS, points),
    ]);

    this.logger.info('rag.index.business.completed', { traceId, count: docs.length });
    return { collection: 'business', indexed: docs.length };
  }

  async rebuildTemplates(traceId?: string) {
    const sqlRes = await fetch(`${this.metadataUrl}/v1/templates/sql?status=active`, {
      headers: this.authHeaders(traceId),
    });
    const rptRes = await fetch(`${this.metadataUrl}/v1/templates/report?status=active`, {
      headers: this.authHeaders(traceId),
    });
    const sqlData = sqlRes.ok ? ((await sqlRes.json()) as { items: { id: string; name: string; scenarioDescription: string; sqlBody: string; inLibrary: boolean }[] }) : { items: [] };
    const rptData = rptRes.ok ? ((await rptRes.json()) as { items: { id: string; name: string; scenarioDescription: string; sqlBody: string; inLibrary: boolean }[] }) : { items: [] };

    const templates = [
      ...sqlData.items.filter((t) => t.inLibrary).map((t) => ({ ...t, type: 'sql' as const })),
      ...rptData.items.filter((t) => t.inLibrary).map((t) => ({ ...t, type: 'report' as const })),
    ];

    const docs = templates.map((t) => ({
      id: t.id,
      content: [t.name, t.scenarioDescription, t.sqlBody].join(' '),
      metadata: { type: t.type, name: t.name },
    }));
    const points = docs.map((d) => ({
      id: d.id,
      vector: embedText(d.content),
      payload: { content: d.content, metadata: d.metadata },
    }));

    await Promise.all([
      this.os.bulkIndex(OPENSEARCH_INDICES.TEMPLATES, docs),
      this.qdrant.upsertPoints(QDRANT_COLLECTIONS.TEMPLATES, points),
    ]);

    this.logger.info('rag.index.templates.completed', { traceId, count: docs.length });
    return { collection: 'templates', indexed: docs.length };
  }

  async rebuildAll(traceId?: string) {
    const results = await Promise.all([
      this.rebuildMetadata(traceId),
      this.rebuildBusiness(traceId),
      this.rebuildTemplates(traceId),
    ]);
    return { results };
  }
}
