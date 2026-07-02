import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class BusinessKnowledgeModel extends BaseModel {
  id!: string;
  title!: string;
  category!: 'glossary' | 'metric' | 'rule' | 'faq';
  content!: string;
  status!: 'active' | 'archived';
  vectorId?: string | null;
  createdBy?: string | null;

  static tableName = META_TABLES.BUSINESS_KNOWLEDGE;
}
