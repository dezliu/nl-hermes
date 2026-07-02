import type { Logger } from '@hermes/shared';
import type { Repositories } from '../repositories/index.js';

const DEFAULT_SETTINGS = [
  { category: 'rag' as const, settingKey: 'rag.bm25.topK', settingValue: 20 },
  { category: 'rag' as const, settingKey: 'rag.vector.topK', settingValue: 20 },
  { category: 'rag' as const, settingKey: 'rag.rrf.k', settingValue: 60 },
  { category: 'rag' as const, settingKey: 'rag.rerank.topK', settingValue: 10 },
  { category: 'rag' as const, settingKey: 'rag.minScore', settingValue: 0.35 },
  { category: 'rag' as const, settingKey: 'rag.maxLoops', settingValue: 3 },
  { category: 'report' as const, settingKey: 'report.maxRows', settingValue: 1000 },
  { category: 'sql' as const, settingKey: 'sql.crossDbAllowed', settingValue: false },
];

export class SettingsService {
  constructor(
    private readonly repos: Repositories,
    private readonly logger: Logger,
  ) {}

  async list(category?: string) {
    const rows = await this.repos.settings.findAll(category);
    if (rows.length === 0) {
      for (const d of DEFAULT_SETTINGS) {
        await this.repos.settings.upsert(d);
      }
      return this.repos.settings.findAll(category);
    }
    return rows;
  }

  async get(category: string, settingKey: string) {
    let row = await this.repos.settings.findByKey(category, settingKey);
    if (!row) {
      const def = DEFAULT_SETTINGS.find((s) => s.category === category && s.settingKey === settingKey);
      if (def) {
        row = await this.repos.settings.upsert(def);
      }
    }
    return row;
  }

  async upsert(
    input: { category: 'rag' | 'sql' | 'report' | 'security'; settingKey: string; settingValue: unknown; updatedBy?: string },
    traceId?: string,
  ) {
    const row = await this.repos.settings.upsert(input);
    await this.repos.audit.create({
      actorId: input.updatedBy,
      action: 'settings.upsert',
      resourceType: 'system_setting',
      resourceId: row.id,
      afterSnapshot: { settingKey: input.settingKey, settingValue: input.settingValue },
      traceId,
    });
    this.logger.info('settings.updated', { traceId, settingKey: input.settingKey });
    return row;
  }
}
