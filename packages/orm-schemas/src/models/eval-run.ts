import { BaseModel } from '../base-model.js';
import { EVAL_TABLES } from '../schemas.js';
import { EvalResultModel } from './eval-result.js';

export class EvalRunModel extends BaseModel {
  id!: string;
  evalSetId!: string;
  status!: 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress!: number;
  summary?: Record<string, unknown> | null;
  startedBy?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  results?: EvalResultModel[];

  static tableName = EVAL_TABLES.EVAL_RUNS;

  static relationMappings = () => ({
    results: {
      relation: BaseModel.HasManyRelation,
      modelClass: EvalResultModel,
      join: {
        from: `${EVAL_TABLES.EVAL_RUNS}.id`,
        to: `${EVAL_TABLES.EVAL_RESULTS}.eval_run_id`,
      },
    },
  });
}
