import { createChatKnex } from '@hermes/orm-schemas';
import type { Knex } from 'knex';

export type SatisfactionRow = {
  mode: 'sql' | 'report';
  rating: 'up' | 'down';
  count: number;
};

export type DownReasonRow = {
  reason: string;
  count: number;
};

export class ChatMetricsClient {
  private readonly knex: Knex;

  constructor(knex?: Knex) {
    this.knex = knex ?? createChatKnex();
  }

  async getSatisfactionStats(days = 30): Promise<{
    rows: SatisfactionRow[];
    reasons: DownReasonRow[];
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 23)
      .replace('T', ' ');

    try {
      const rows = await this.knex('message_feedback as mf')
        .join('messages as m', 'm.id', 'mf.message_id')
        .where('mf.created_at', '>=', since)
        .groupBy('m.mode', 'mf.rating')
        .select('m.mode as mode', 'mf.rating as rating')
        .count('* as count');

      const reasons = await this.knex('message_feedback as mf')
        .where('mf.created_at', '>=', since)
        .where('mf.rating', 'down')
        .whereNotNull('mf.reason')
        .where('mf.reason', '!=', '')
        .groupBy('mf.reason')
        .select('mf.reason as reason')
        .count('* as count')
        .orderBy('count', 'desc')
        .limit(10);

      return {
        rows: rows.map((r) => ({
          mode: r.mode as 'sql' | 'report',
          rating: r.rating as 'up' | 'down',
          count: Number(r.count),
        })),
        reasons: reasons.map((r) => ({ reason: String(r.reason), count: Number(r.count) })),
      };
    } catch {
      return { rows: [], reasons: [] };
    }
  }
}
