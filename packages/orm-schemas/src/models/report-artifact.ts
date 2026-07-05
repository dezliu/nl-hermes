import { BaseModel } from '../base-model.js';
import { CHAT_TABLES } from '../schemas.js';

export class ReportArtifactModel extends BaseModel {
  id!: string;
  messageId?: string | null;
  userId!: string;
  specJson!: Record<string, unknown>;
  outputFormat!: 'inline' | 'web' | 'word' | 'dashboard';
  storageKey?: string | null;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  status!: 'pending' | 'ready' | 'failed';
  artifactJson?: Record<string, unknown> | null;

  static tableName = CHAT_TABLES.REPORT_ARTIFACTS;

  static get jsonAttributes() {
    return ['specJson', 'artifactJson'];
  }
}
