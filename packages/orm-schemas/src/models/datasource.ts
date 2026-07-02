import { BaseModel } from '../base-model.js';
import { META_TABLES } from '../schemas.js';

export class DatasourceModel extends BaseModel {
  id!: string;
  name!: string;
  host!: string;
  port!: number;
  databaseName!: string;
  username!: string;
  passwordEncrypted!: string;
  connectionStatus!: 'unknown' | 'ok' | 'failed';
  lastTestedAt?: string | null;
  lastSyncedAt?: string | null;
  createdBy?: string | null;

  static tableName = META_TABLES.DATASOURCES;
}
