import { getServiceAuthHeaders } from '@hermes/shared';

export type CreateCandidatePayload = {
  sourceMessageId: string;
  conversationId: string;
  mode: 'sql' | 'report';
  userQuery: string;
  sqlBody: string;
  chartType?: 'line' | 'bar' | 'table';
  chartConfig?: unknown;
  ragScore?: number;
  schemaContextCount?: number;
};

export type CreateFeedbackPayload = {
  messageId: string;
  conversationId: string;
  mode: 'sql' | 'report';
  userQuery: string;
  assistantContent: string;
  generatedSql?: string;
  refuseReason?: string;
  ragScore?: number;
  feedbackReason: string;
};

export class MetadataClosedLoopClient {
  constructor(
    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',
  ) {}

  private async postJson<T>(path: string, body: unknown): Promise<T | null> {
    try {
      const res = await fetch(`${this.metadataUrl}${path}`, {
        method: 'POST',
        headers: {
          ...getServiceAuthHeaders('orchestrator'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }

  createCandidate(payload: CreateCandidatePayload) {
    return this.postJson<{ item: unknown }>('/internal/template-candidates', payload);
  }

  boostCandidate(messageId: string) {
    return this.postJson<{ ok: boolean }>(`/internal/template-candidates/${messageId}/upvote`, {});
  }

  createFeedbackItem(payload: CreateFeedbackPayload) {
    return this.postJson<{ item: unknown }>('/internal/generation-feedback', payload);
  }
}

export function createMetadataClosedLoopClient(): MetadataClosedLoopClient {
  return new MetadataClosedLoopClient();
}
