import type { Logger } from '@hermes/shared';
import type { Repositories } from '../repositories/index.js';
import { newId } from '../lib/crypto.js';

export type BusinessKnowledgeCategory = 'glossary' | 'metric' | 'rule' | 'faq';
export type BusinessKnowledgeStatus = 'active' | 'archived';

export class BusinessKnowledgeService {
  constructor(
    private readonly repos: Repositories,
    private readonly logger: Logger,
  ) {}

  list(filters?: { status?: string; category?: string }) {
    return this.repos.businessKnowledge.list(filters);
  }

  get(id: string) {
    return this.repos.businessKnowledge.findById(id);
  }

  async create(
    input: {
      title: string;
      category: BusinessKnowledgeCategory;
      content: string;
      status?: BusinessKnowledgeStatus;
      createdBy?: string;
    },
    traceId?: string,
  ) {
    const row = await this.repos.businessKnowledge.insert({
      id: newId(),
      title: input.title,
      category: input.category,
      content: input.content,
      status: input.status ?? 'active',
      createdBy: input.createdBy ?? null,
    });
    this.logger.info('business_knowledge.created', { traceId, id: row.id });
    return row;
  }

  async update(id: string, input: Record<string, unknown>, traceId?: string) {
    const row = await this.repos.businessKnowledge.patch(id, input);
    if (row) this.logger.info('business_knowledge.updated', { traceId, id });
    return row;
  }
}
