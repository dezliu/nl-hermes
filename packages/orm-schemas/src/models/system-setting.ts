import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class SystemSettingModel extends BaseModel {
  id!: string;
  category!: 'rag' | 'sql' | 'report' | 'security';
  settingKey!: string;
  settingValue!: unknown;
  updatedBy?: string | null;

  static tableName = META_TABLES.SYSTEM_SETTINGS;
}
