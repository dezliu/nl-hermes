import { BaseModel } from '../base-model.js';
import { CHAT_TABLES } from '../schemas.js';

export class ConversationModel extends BaseModel {
  id!: string;
  userId!: string;
  title!: string;
  mode!: 'sql' | 'report';
  lastActiveAt!: string;

  static tableName = CHAT_TABLES.CONVERSATIONS;
}
