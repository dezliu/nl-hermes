import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class FieldSynonymModel extends BaseModel {
  id!: string;
  fieldId!: string;
  synonym!: string;

  static tableName = META_TABLES.FIELD_SYNONYMS;
}
