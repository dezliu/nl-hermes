import type { Logger } from '@hermes/shared';
import type {
  CreateEvalSetRequest,
  EvalCaseRecord,
  EvalSetRecord,
  UpsertEvalCaseRequest,
} from '@hermes/contracts';
import {
  EvalCaseRepository,
  EvalSetRepository,
} from '../repositories/eval-repository.js';

export class EvalSetService {
  constructor(
    private readonly sets: EvalSetRepository,
    private readonly cases: EvalCaseRepository,
    private readonly logger: Logger,
  ) {}

  async listSets(): Promise<EvalSetRecord[]> {
    const items = await this.sets.findAll();
    const enriched = await Promise.all(
      items.map(async (s) => ({
        ...this.toSetRecord(s),
        caseCount: await this.sets.countCases(s.id),
      })),
    );
    return enriched;
  }

  async getSet(id: string): Promise<(EvalSetRecord & { cases: EvalCaseRecord[] }) | null> {
    const item = await this.sets.findById(id);
    if (!item) return null;
    return {
      ...this.toSetRecord(item),
      caseCount: item.cases?.length ?? 0,
      cases: (item.cases ?? []).map((c) => this.toCaseRecord(c)),
    };
  }

  async createSet(body: CreateEvalSetRequest): Promise<EvalSetRecord> {
    const item = await this.sets.insert({
      name: body.name,
      description: body.description ?? null,
      isPreset: body.isPreset ?? false,
    });
    this.logger.info('eval_set.created', { id: item.id });
    return this.toSetRecord(item);
  }

  async updateSet(id: string, body: Partial<CreateEvalSetRequest>): Promise<EvalSetRecord | null> {
    const item = await this.sets.patch(id, body);
    return item ? this.toSetRecord(item) : null;
  }

  async deleteSet(id: string): Promise<boolean> {
    await this.cases.deleteBySet(id);
    const n = await this.sets.delete(id);
    return n > 0;
  }

  async addCase(evalSetId: string, body: UpsertEvalCaseRequest): Promise<EvalCaseRecord | null> {
    const set = await this.sets.findById(evalSetId);
    if (!set) return null;
    const item = await this.cases.insert({
      evalSetId,
      question: body.question,
      mode: body.mode,
      expectedTables: body.expectedTables ?? null,
      expectedPoints: body.expectedPoints ?? null,
      sortOrder: body.sortOrder ?? (set.cases?.length ?? 0),
    });
    return this.toCaseRecord(item);
  }

  async updateCase(caseId: string, body: UpsertEvalCaseRequest): Promise<EvalCaseRecord | null> {
    const item = await this.cases.patch(caseId, {
      question: body.question,
      mode: body.mode,
      expectedTables: body.expectedTables ?? null,
      expectedPoints: body.expectedPoints ?? null,
      sortOrder: body.sortOrder,
    });
    return item ? this.toCaseRecord(item) : null;
  }

  async deleteCase(caseId: string): Promise<boolean> {
    const n = await this.cases.delete(caseId);
    return n > 0;
  }

  async importCases(
    evalSetId: string,
    items: UpsertEvalCaseRequest[],
  ): Promise<EvalCaseRecord[]> {
    const created: EvalCaseRecord[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const row = await this.addCase(evalSetId, { ...items[i]!, sortOrder: i });
      if (row) created.push(row);
    }
    return created;
  }

  private toSetRecord(s: {
    id: string;
    name: string;
    description?: string | null;
    isPreset: boolean;
    createdAt?: string;
    updatedAt?: string;
  }): EvalSetRecord {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      isPreset: s.isPreset,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  private toCaseRecord(c: {
    id: string;
    evalSetId: string;
    question: string;
    mode: 'sql' | 'report';
    expectedTables?: string[] | null;
    expectedPoints?: string | null;
    sortOrder: number;
  }): EvalCaseRecord {
    return {
      id: c.id,
      evalSetId: c.evalSetId,
      question: c.question,
      mode: c.mode,
      expectedTables: c.expectedTables,
      expectedPoints: c.expectedPoints,
      sortOrder: c.sortOrder,
    };
  }
}
