import { QDRANT_COLLECTIONS } from '@hermes/shared';
import { EMBEDDING_DIM } from './embedding.js';

export type VectorPoint = {
  id: string;
  vector: number[];
  payload: { content: string; metadata?: Record<string, unknown> };
};

export type VectorHit = {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export class QdrantClient {
  private readonly baseUrl: string;

  constructor(baseUrl = process.env.QDRANT_URL ?? 'http://localhost:6333') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async ensureCollection(collection: string): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/collections/${collection}`, { method: 'GET' });
      if (res.status === 404) {
        await fetch(`${this.baseUrl}/collections/${collection}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vectors: { size: EMBEDDING_DIM, distance: 'Cosine' },
          }),
        });
      }
    } catch {
      // External Qdrant unavailable
    }
  }

  async upsertPoints(collection: string, points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return;
    await this.ensureCollection(collection);
    await fetch(`${this.baseUrl}/collections/${collection}/points?wait=true`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      }),
    });
  }

  async search(collection: string, vector: number[], topK: number): Promise<VectorHit[]> {
    try {
      await this.ensureCollection(collection);
      const res = await fetch(`${this.baseUrl}/collections/${collection}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vector, limit: topK, with_payload: true }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        result?: { id: string | number; score: number; payload?: { content?: string; metadata?: Record<string, unknown> } }[];
      };
      return (data.result ?? []).map((r) => ({
        id: String(r.id),
        content: r.payload?.content ?? '',
        score: r.score,
        metadata: r.payload?.metadata,
      }));
    } catch {
      return [];
    }
  }
}

export function collectionToQdrant(collection: 'metadata' | 'business' | 'templates'): string {
  const map = {
    metadata: QDRANT_COLLECTIONS.METADATA,
    business: QDRANT_COLLECTIONS.BUSINESS,
    templates: QDRANT_COLLECTIONS.TEMPLATES,
  };
  return map[collection];
}
