import { BaseModel } from '../base-model.js';
import { EVAL_TABLES } from '../schemas.js';

export class EvalCaseModel extends BaseModel {
  id!: string;
  evalSetId!: string;
  question!: string;
  mode!: 'sql' | 'report';
  expectedTables?: string[] | null;
  expectedPoints?: string | null;
  sortOrder!: number;

  static tableName = EVAL_TABLES.EVAL_CASES;
}
