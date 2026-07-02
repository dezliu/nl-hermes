import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class AuditLogModel extends BaseModel {
  id!: string;
  actorId?: string | null;
  action!: string;
  resourceType!: string;
  resourceId?: string | null;
  beforeSnapshot?: unknown | null;
  afterSnapshot?: unknown | null;
  traceId?: string | null;

  static tableName = META_TABLES.AUDIT_LOGS;
}
