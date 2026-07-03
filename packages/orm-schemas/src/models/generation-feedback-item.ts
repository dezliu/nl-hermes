import { BaseModel } from '../base-model.js';
import { CHAT_TABLES } from '../schemas.js';

export class GenerationFeedbackItemModel extends BaseModel {
  id!: string;
  messageId!: string;
  conversationId!: string;
  mode!: 'sql' | 'report';
  userQuery!: string;
  assistantContent!: string;
  generatedSql?: string | null;
  refuseReason?: string | null;
  ragScore?: number | null;
  feedbackReason!: string;
  status!: 'open' | 'resolved';
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resultTemplateId?: string | null;

  static tableName = CHAT_TABLES.GENERATION_FEEDBACK_ITEMS;

  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // generation_feedback_items has no updated_at
  }
}
