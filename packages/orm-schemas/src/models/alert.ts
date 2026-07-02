import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class AlertModel extends BaseModel {
  id!: string;
  type!: string;
  level!: 'info' | 'warning' | 'error' | 'critical';
  title!: string;
  message!: string;
  refType?: string | null;
  refId?: string | null;
  status!: 'open' | 'acknowledged' | 'resolved';
  resolvedAt?: string | null;
  resolvedBy?: string | null;

  static tableName = META_TABLES.ALERTS;
}
