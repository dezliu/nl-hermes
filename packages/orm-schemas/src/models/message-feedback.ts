import { BaseModel } from '../base-model.js';
import { CHAT_TABLES } from '../schemas.js';

export class MessageFeedbackModel extends BaseModel {
  id!: string;
  messageId!: string;
  userId!: string;
  rating!: 'up' | 'down';
  reason?: string | null;

  static tableName = CHAT_TABLES.MESSAGE_FEEDBACK;

  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // no updated_at column
  }
}
