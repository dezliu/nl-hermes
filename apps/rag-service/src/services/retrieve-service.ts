import type { Logger } from '@hermes/shared';
import { getServiceAuthHeaders, HTTP_HEADERS } from '@hermes/shared';
import type { RetrieveRequest, RetrieveResponse, RetrieveResult } from '@hermes/contracts';
import { embedText } from '../lib/embedding.js';
import { OpenSearchClient, collectionToIndex } from '../lib/opensearch.js';
import { QdrantClient, collectionToQdrant } from '../lib/qdrant.js';
import { reciprocalRankFusion, rerankByQuery } from './fusion.js';

export type RetrieveSettings = {
  bm25TopK: number;
  vectorTopK: number;
  rrfK: number;
  rerankTopK: number;
  enableRerank: boolean;
};

const DEFAULT_SETTINGS: RetrieveSettings = {
  bm25TopK: 20,
  vectorTopK: 20,
  rrfK: 60,
  rerankTopK: 10,
  enableRerank: true,
};

export class RetrieveService {
  constructor(
    private readonly os: OpenSearchClient,
    private readonly qdrant: QdrantClient,
    private readonly logger: Logger,
    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',
  ) {}

  async retrieve(req: RetrieveRequest, traceId?: string): Promise<RetrieveResponse> {
    const settings = {
      ...DEFAULT_SETTINGS,
      bm25TopK: req.bm25TopK ?? req.topK ?? DEFAULT_SETTINGS.bm25TopK,
      vectorTopK: req.vectorTopK ?? req.topK ?? DEFAULT_SETTINGS.vectorTopK,
      rrfK: req.rrfK ?? DEFAULT_SETTINGS.rrfK,
      rerankTopK: req.rerankTopK ?? DEFAULT_SETTINGS.rerankTopK,
      enableRerank: req.enableRerank ?? DEFAULT_SETTINGS.enableRerank,
    };

    const indexName = collectionToIndex(req.collection);
    const collectionName = collectionToQdrant(req.collection);
    const queryVector = embedText(req.query);

    const [bm25Hits, vectorHits] = await Promise.all([
      this.os.search(indexName, req.query, settings.bm25TopK),
      this.qdrant.search(collectionName, queryVector, settings.vectorTopK),
    ]);

    const fused = reciprocalRankFusion(
      [
        { name: 'bm25', hits: bm25Hits },
        { name: 'vector', hits: vectorHits },
      ],
      settings.rrfK,
    );

    let results: RetrieveResult[] = fused.map((d) => ({
      id: d.id,
      content: d.content,
      score: Number(d.score.toFixed(4)),
      matchReason: [...d.sources, 'rrf'].join('+'),
      source: 'rrf' as const,
    }));

    if (settings.enableRerank && results.length > 0) {
      results = rerankByQuery(req.query, fused, settings.rerankTopK);
    } else {
      results = results.slice(0, settings.rerankTopK);
    }

    this.logger.info('rag.retrieve.completed', {
      traceId,
      collection: req.collection,
      bm25Count: bm25Hits.length,
      vectorCount: vectorHits.length,
      resultCount: results.length,
    });

    return { results, query: req.query, collection: req.collection };
  }

  private authHeaders(traceId?: string): Record<string, string> {
    return {
      ...getServiceAuthHeaders('rag-service'),
      ...(traceId ? { [HTTP_HEADERS.TRACE_ID]: traceId } : {}),
    };
  }

  async fetchSettings(traceId?: string): Promise<Partial<RetrieveSettings>> {
    try {
      const res = await fetch(`${this.metadataUrl}/v1/settings?category=rag`, {
        headers: this.authHeaders(traceId),
      });
      if (!res.ok) return {};
      const data = (await res.json()) as { items?: { settingKey: string; settingValue: unknown }[] };
      const map = Object.fromEntries((data.items ?? []).map((i) => [i.settingKey, i.settingValue]));
      return {
        bm25TopK: Number(map['rag.bm25.topK'] ?? DEFAULT_SETTINGS.bm25TopK),
        vectorTopK: Number(map['rag.vector.topK'] ?? DEFAULT_SETTINGS.vectorTopK),
        rrfK: Number(map['rag.rrf.k'] ?? DEFAULT_SETTINGS.rrfK),
        rerankTopK: Number(map['rag.rerank.topK'] ?? DEFAULT_SETTINGS.rerankTopK),
      };
    } catch {
      this.logger.warn('rag.settings.fetch_failed', { traceId });
      return {};
    }
  }
}
