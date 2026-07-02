import { BaseModel } from '../base-model.js';
import { EVAL_TABLES } from '../schemas.js';
import { EvalCaseModel } from './eval-case.js';

export class EvalSetModel extends BaseModel {
  id!: string;
  name!: string;
  description?: string | null;
  isPreset!: boolean;
  cases?: EvalCaseModel[];

  static tableName = EVAL_TABLES.EVAL_SETS;

  static relationMappings = () => ({
    cases: {
      relation: BaseModel.HasManyRelation,
      modelClass: EvalCaseModel,
      join: {
        from: `${EVAL_TABLES.EVAL_SETS}.id`,
        to: `${EVAL_TABLES.EVAL_CASES}.eval_set_id`,
      },
    },
  });
}
