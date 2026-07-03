import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class RoleModel extends BaseModel {
  id!: string;
  code!: string;
  name!: string;
  description?: string | null;

  static tableName = META_TABLES.ROLES;

  /** roles 表仅有 created_at，无 updated_at */
  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // no updated_at column
  }
}
