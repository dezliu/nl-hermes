import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class SqlTemplateModel extends BaseModel {
  id!: string;
  name!: string;
  scenarioDescription!: string;
  sqlBody!: string;
  placeholders?: unknown | null;
  score?: number | null;
  usageCount!: number;
  successRate?: number | null;
  satisfactionAvg?: number | null;
  inLibrary!: boolean;
  status!: 'draft' | 'active' | 'archived';
  vectorId?: string | null;
  createdBy?: string | null;

  static tableName = META_TABLES.SQL_TEMPLATES;
}
