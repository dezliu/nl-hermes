import { BaseModel } from '../base-model.js';
import { EVAL_TABLES } from '../schemas.js';

export class EvalResultModel extends BaseModel {
  id!: string;
  evalRunId!: string;
  evalCaseId!: string;
  retrievalHit?: boolean | null;
  generateSuccess?: boolean | null;
  score?: number | null;
  actualOutput?: Record<string, unknown> | null;
  diffNotes?: string | null;

  static tableName = EVAL_TABLES.EVAL_RESULTS;

  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // eval_results has no updated_at
  }
}
