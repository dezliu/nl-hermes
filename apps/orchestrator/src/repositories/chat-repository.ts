import { randomUUID } from 'node:crypto';
import {
  ConversationModel,
  MessageModel,
  WorkflowCheckpointModel,
  bindChatDb,
} from '@hermes/orm-schemas';
import type { GenerationMode } from '@hermes/shared';

export class ChatRepository {
  constructor(private readonly enabled: boolean) {}

  async createConversation(userId: string, mode: GenerationMode, title: string): Promise<string> {
    if (!this.enabled) return randomUUID();
    const id = randomUUID();
    await ConversationModel.query().insert({
      id,
      userId,
      title: title.slice(0, 256),
      mode,
      lastActiveAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });
    return id;
  }

  async touchConversation(conversationId: string): Promise<void> {
    if (!this.enabled) return;
    await ConversationModel.query().findById(conversationId).patch({
      lastActiveAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });
  }

  async addMessage(input: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    mode: GenerationMode;
    status?: 'completed' | 'interrupted' | 'failed';
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    if (!this.enabled) return randomUUID();
    const id = randomUUID();
    await MessageModel.query().insert({
      id,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      mode: input.mode,
      status: input.status ?? 'completed',
      metadata: input.metadata ?? null,
      createdAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });
    return id;
  }

  async listHistory(conversationId: string, limit = 20) {
    if (!this.enabled) return [];
    const rows = await MessageModel.query()
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc')
      .limit(limit);
    return rows.map((m) => ({ role: m.role, content: m.content }));
  }

  async saveCheckpoint(input: {
    conversationId: string;
    runId: string;
    graphState?: Record<string, unknown>;
    redisRef?: string;
    status: 'running' | 'interrupted' | 'completed' | 'failed';
  }): Promise<string> {
    if (!this.enabled) return input.runId;
    const id = randomUUID();
    await WorkflowCheckpointModel.query().insert({
      id,
      conversationId: input.conversationId,
      runId: input.runId,
      graphState: input.graphState ?? null,
      redisRef: input.redisRef ?? null,
      status: input.status,
    });
    return id;
  }

  async updateCheckpoint(
    runId: string,
    patch: Partial<{ graphState: Record<string, unknown>; status: 'running' | 'interrupted' | 'completed' | 'failed' }>,
  ) {
    if (!this.enabled) return;
    await WorkflowCheckpointModel.query().where('run_id', runId).patch(patch);
  }
}

export function createChatRepository(dbEnabled = true): ChatRepository {
  if (dbEnabled) bindChatDb();
  return new ChatRepository(dbEnabled);
}
