import { Model } from 'objection';
import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';
import { MetaFieldModel } from './meta-field.js';

export class MetaTableModel extends BaseModel {
  id!: string;
  datasourceId!: string;
  physicalName!: string;
  businessName?: string | null;
  description?: string | null;
  source!: 'sync' | 'manual';
  sourceStatus!: 'active' | 'removed_at_source';
  inQueryLibrary!: boolean;

  fields?: MetaFieldModel[];

  static tableName = META_TABLES.META_TABLES;

  static relationMappings = () => ({
    fields: {
      relation: Model.HasManyRelation,
      modelClass: MetaFieldModel,
      join: { from: `${META_TABLES.META_TABLES}.id`, to: `${META_TABLES.META_FIELDS}.table_id` },
    },
  });
}
