import { BaseModel } from '../base-model.js';
import { CHAT_TABLES } from '../schemas.js';

export class WorkflowCheckpointModel extends BaseModel {
  id!: string;
  conversationId!: string;
  runId!: string;
  graphState?: Record<string, unknown> | null;
  redisRef?: string | null;
  status!: 'running' | 'interrupted' | 'completed' | 'failed';

  static tableName = CHAT_TABLES.WORKFLOW_CHECKPOINTS;

  static get jsonAttributes() {
    return ['graphState'];
  }
}
