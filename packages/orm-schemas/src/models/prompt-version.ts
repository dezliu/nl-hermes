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

  /** prompt_versions 表仅有 created_at，无 updated_at */
  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // no updated_at column
  }
}
