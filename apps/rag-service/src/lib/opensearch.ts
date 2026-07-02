import { OPENSEARCH_INDICES } from '@hermes/shared';

export type IndexDocument = {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type Bm25Hit = {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export class OpenSearchClient {
  private readonly baseUrl: string;

  constructor(baseUrl = process.env.OPENSEARCH_URL ?? 'http://localhost:9200') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async ensureIndex(indexName: string): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/${indexName}`, { method: 'HEAD' });
      if (res.status === 404) {
        await fetch(`${this.baseUrl}/${indexName}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings: { index: { number_of_shards: 1, number_of_replicas: 0 } },
            mappings: {
              properties: {
                content: { type: 'text' },
                metadata: { type: 'object', enabled: false },
              },
            },
          }),
        });
      }
    } catch {
      // External OpenSearch unavailable — caller falls back to empty hits
    }
  }

  async bulkIndex(indexName: string, docs: IndexDocument[]): Promise<void> {
    if (docs.length === 0) return;
    await this.ensureIndex(indexName);
    const body = docs.flatMap((doc) => [
      JSON.stringify({ index: { _index: indexName, _id: doc.id } }),
      JSON.stringify({ content: doc.content, metadata: doc.metadata ?? {} }),
    ]).join('\n') + '\n';
    await fetch(`${this.baseUrl}/_bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body,
    });
  }

  async search(indexName: string, query: string, topK: number): Promise<Bm25Hit[]> {
    try {
      await this.ensureIndex(indexName);
      const res = await fetch(`${this.baseUrl}/${indexName}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: topK,
          query: { match: { content: { query, operator: 'or' } } },
        }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        hits?: { hits?: { _id: string; _score: number; _source: { content: string; metadata?: Record<string, unknown> } }[] };
      };
      return (data.hits?.hits ?? []).map((h) => ({
        id: h._id,
        content: h._source.content,
        score: h._score,
        metadata: h._source.metadata,
      }));
    } catch {
      return [];
    }
  }
}

export function collectionToIndex(collection: 'metadata' | 'business' | 'templates'): string {
  const map = {
    metadata: OPENSEARCH_INDICES.METADATA,
    business: OPENSEARCH_INDICES.BUSINESS,
    templates: OPENSEARCH_INDICES.TEMPLATES,
  };
  return map[collection];
}
