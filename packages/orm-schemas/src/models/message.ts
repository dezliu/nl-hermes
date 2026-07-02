import { BaseModel } from '../base-model.js';
import { CHAT_TABLES } from '../schemas.js';

export class MessageModel extends BaseModel {
  id!: string;
  conversationId!: string;
  role!: 'user' | 'assistant' | 'system';
  content!: string;
  mode!: 'sql' | 'report';
  templateId?: string | null;
  templateType?: 'sql' | 'report' | null;
  status!: 'completed' | 'interrupted' | 'failed';
  metadata?: Record<string, unknown> | null;

  static tableName = CHAT_TABLES.MESSAGES;

  static get jsonAttributes() {
    return ['metadata'];
  }

  /** messages 表仅有 created_at，无 updated_at */
  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // no updated_at column
  }
}
