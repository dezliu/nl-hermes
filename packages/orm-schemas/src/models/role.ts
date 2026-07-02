import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class RoleModel extends BaseModel {
  id!: string;
  code!: string;
  name!: string;
  description?: string | null;

  static tableName = META_TABLES.ROLES;
}
