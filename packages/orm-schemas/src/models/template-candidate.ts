import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class TemplateCandidateModel extends BaseModel {
  id!: string;
  sourceMessageId!: string;
  conversationId!: string;
  mode!: 'sql' | 'report';
  userQuery!: string;
  scenarioDescription!: string;
  sqlBody!: string;
  chartType?: 'line' | 'bar' | 'table' | null;
  chartConfig?: unknown | null;
  ragScore?: number | null;
  userUpvoted!: boolean;
  priority!: number;
  status!: 'pending' | 'approved' | 'rejected';
  templateId?: string | null;

  static tableName = META_TABLES.TEMPLATE_CANDIDATES;

  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // template_candidates has no updated_at
  }
}
