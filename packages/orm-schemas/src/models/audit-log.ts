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

  /** audit_logs 表仅有 created_at，无 updated_at */
  $beforeInsert() {
    const now = new Date().toISOString().slice(0, 23).replace('T', ' ');
    if (!this.createdAt) this.createdAt = now;
  }

  $beforeUpdate() {
    // no updated_at column
  }
}
