import { Model } from 'objection';
import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';
import { FieldSynonymModel } from './field-synonym.js';

export class MetaFieldModel extends BaseModel {
  id!: string;
  tableId!: string;
  physicalName!: string;
  businessName?: string | null;
  description?: string | null;
  dataType!: string;
  isSensitive!: boolean;
  source!: 'sync' | 'manual';
  sourceStatus!: 'active' | 'removed_at_source';
  inQueryLibrary!: boolean;

  synonyms?: FieldSynonymModel[];

  static tableName = META_TABLES.META_FIELDS;

  static relationMappings = () => ({
    synonyms: {
      relation: Model.HasManyRelation,
      modelClass: FieldSynonymModel,
      join: { from: `${META_TABLES.META_FIELDS}.id`, to: `${META_TABLES.FIELD_SYNONYMS}.field_id` },
    },
  });
}
