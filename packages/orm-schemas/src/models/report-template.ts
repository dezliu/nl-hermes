import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class ReportTemplateModel extends BaseModel {
  id!: string;
  name!: string;
  scenarioDescription!: string;
  sqlBody!: string;
  chartType!: 'line' | 'bar' | 'table';
  chartConfig?: unknown | null;
  placeholders?: unknown | null;
  score?: number | null;
  usageCount!: number;
  successRate?: number | null;
  satisfactionAvg?: number | null;
  inLibrary!: boolean;
  status!: 'draft' | 'active' | 'archived';
  vectorId?: string | null;
  createdBy?: string | null;

  static tableName = META_TABLES.REPORT_TEMPLATES;
}
