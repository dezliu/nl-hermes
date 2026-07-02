import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class PromptVersionModel extends BaseModel {
  id!: string;
  roleId?: string | null;
  persona!: string;
  constraints!: string;
  version!: number;
  isActive!: boolean;
  createdBy?: string | null;

  static tableName = META_TABLES.PROMPT_VERSIONS;
}
