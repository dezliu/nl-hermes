import { BaseModel } from '../base-model.js';
import { CHAT_TABLES } from '../schemas.js';

export class PublishedQueryModel extends BaseModel {
  id!: string;
  reportId!: string;
  sqlTemplate!: string;
  datasourceId!: string;
  parametersSchema?: Record<string, unknown> | null;
  authMode!: 'owner' | 'token' | 'api_key';
  shareToken?: string | null;

  static tableName = CHAT_TABLES.PUBLISHED_QUERIES;

  static get jsonAttributes() {
    return ['parametersSchema'];
  }
}
