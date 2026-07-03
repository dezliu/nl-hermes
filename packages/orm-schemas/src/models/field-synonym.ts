import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class FieldSynonymModel extends BaseModel {
  id!: string;
  fieldId!: string;
  synonym!: string;

  static tableName = META_TABLES.FIELD_SYNONYMS;

  /** field_synonyms 表无 timestamp 列 */
  $beforeInsert() {
    // no timestamp columns
  }

  $beforeUpdate() {
    // no timestamp columns
  }
}
