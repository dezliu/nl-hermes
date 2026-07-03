import { randomUUID } from 'node:crypto';
import {
  ConversationModel,
  MessageFeedbackModel,
  MessageModel,
  WorkflowCheckpointModel,
  bindChatDb,
} from '@hermes/orm-schemas';
import type {
  ConversationMessageRecord,
  ConversationSummary,
  SubmitFeedbackRequest,
} from '@hermes/contracts';
import type { GenerationMode } from '@hermes/shared';

type MemoryConversation = ConversationSummary & { userId: string };
type MemoryMessage = ConversationMessageRecord & { conversationId: string };

export class ChatRepository {
  private readonly memoryConversations = new Map<string, MemoryConversation>();
  private readonly memoryMessages = new Map<string, MemoryMessage[]>();
  private readonly memoryFeedback = new Map<string, { userId: string; rating: 'up' | 'down'; reason?: string }>();

  constructor(private readonly enabled: boolean) {}

  async createConversation(userId: string, mode: GenerationMode, title: string): Promise<string> {
    const id = randomUUID();
    const lastActiveAt = new Date().toISOString();
    if (!this.enabled) {
      this.memoryConversations.set(id, { id, userId, title: title.slice(0, 256), mode, lastActiveAt });
      this.memoryMessages.set(id, []);
      return id;
    }
    await ConversationModel.query().insert({
      id,
      userId,
      title: title.slice(0, 256),
      mode,
      lastActiveAt: lastActiveAt.slice(0, 23).replace('T', ' '),
    });
    return id;
  }

  async touchConversation(conversationId: string): Promise<void> {
    const lastActiveAt = new Date().toISOString();
    if (!this.enabled) {
      const row = this.memoryConversations.get(conversationId);
      if (row) row.lastActiveAt = lastActiveAt;
      return;
    }
    await ConversationModel.query().findById(conversationId).patch({
      lastActiveAt: lastActiveAt.slice(0, 23).replace('T', ' '),
    });
  }

  async addMessage(input: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    mode: GenerationMode;
    status?: 'completed' | 'interrupted' | 'failed';
    templateId?: string;
    templateType?: 'sql' | 'report';
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    if (!this.enabled) {
      const list = this.memoryMessages.get(input.conversationId) ?? [];
      list.push({
        id,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        mode: input.mode,
        status: input.status ?? 'completed',
        templateId: input.templateId ?? null,
        templateType: input.templateType ?? null,
        metadata: input.metadata ?? null,
        createdAt,
      });
      this.memoryMessages.set(input.conversationId, list);
      return id;
    }
    await MessageModel.query().insert({
      id,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      mode: input.mode,
      templateId: input.templateId ?? null,
      templateType: input.templateType ?? null,
      status: input.status ?? 'completed',
      metadata: input.metadata ?? null,
      createdAt: createdAt.slice(0, 23).replace('T', ' '),
    });
    return id;
  }

  async listHistory(conversationId: string, limit = 20) {
    if (!this.enabled) {
      const rows = this.memoryMessages.get(conversationId) ?? [];
      return rows.slice(-limit).map((m) => ({ role: m.role, content: m.content }));
    }
    const rows = await MessageModel.query()
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc')
      .limit(limit);
    return rows.map((m) => ({ role: m.role, content: m.content }));
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    if (!this.enabled) {
      return [...this.memoryConversations.values()]
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
        .map(({ id, title, mode, lastActiveAt }) => ({ id, title, mode, lastActiveAt }));
    }
    const rows = await ConversationModel.query()
      .where('user_id', userId)
      .orderBy('last_active_at', 'desc');
    return rows.map((c) => ({
      id: c.id,
      title: c.title,
      mode: c.mode,
      lastActiveAt: c.lastActiveAt,
    }));
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationSummary | null> {
    if (!this.enabled) {
      const row = this.memoryConversations.get(conversationId);
      if (!row || row.userId !== userId) return null;
      const { id, title, mode, lastActiveAt } = row;
      return { id, title, mode, lastActiveAt };
    }
    const row = await ConversationModel.query().findById(conversationId);
    if (!row || row.userId !== userId) return null;
    return { id: row.id, title: row.title, mode: row.mode, lastActiveAt: row.lastActiveAt };
  }

  async renameConversation(userId: string, conversationId: string, title: string): Promise<ConversationSummary | null> {
    const trimmed = title.trim().slice(0, 256);
    if (!trimmed) return null;
    if (!this.enabled) {
      const row = this.memoryConversations.get(conversationId);
      if (!row || row.userId !== userId) return null;
      row.title = trimmed;
      return { id: row.id, title: row.title, mode: row.mode, lastActiveAt: row.lastActiveAt };
    }
    const row = await ConversationModel.query().findById(conversationId);
    if (!row || row.userId !== userId) return null;
    await ConversationModel.query().findById(conversationId).patch({ title: trimmed });
    return { id: row.id, title: trimmed, mode: row.mode, lastActiveAt: row.lastActiveAt };
  }

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    if (!this.enabled) {
      const row = this.memoryConversations.get(conversationId);
      if (!row || row.userId !== userId) return false;
      this.memoryConversations.delete(conversationId);
      this.memoryMessages.delete(conversationId);
      for (const [messageId, fb] of this.memoryFeedback.entries()) {
        const msg = [...(this.memoryMessages.values() ?? [])].flat().find((m) => m.id === messageId);
        if (msg?.conversationId === conversationId) this.memoryFeedback.delete(messageId);
      }
      return true;
    }
    const row = await ConversationModel.query().findById(conversationId);
    if (!row || row.userId !== userId) return false;
    await MessageFeedbackModel.query().delete().whereIn(
      'message_id',
      MessageModel.query().select('id').where('conversation_id', conversationId),
    );
    await MessageModel.query().delete().where('conversation_id', conversationId);
    await WorkflowCheckpointModel.query().delete().where('conversation_id', conversationId);
    await ConversationModel.query().deleteById(conversationId);
    return true;
  }

  async listConversationMessages(userId: string, conversationId: string): Promise<ConversationMessageRecord[]> {
    const conv = await this.getConversation(userId, conversationId);
    if (!conv) return [];

    if (!this.enabled) {
      const rows = this.memoryMessages.get(conversationId) ?? [];
      return rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        mode: m.mode,
        status: m.status,
        templateId: m.templateId,
        templateType: m.templateType,
        metadata: m.metadata,
        createdAt: m.createdAt,
        feedbackRating: this.memoryFeedback.get(m.id)?.rating ?? null,
      }));
    }

    const rows = await MessageModel.query()
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc');
    const messageIds = rows.map((m) => m.id);
    const feedbackRows =
      messageIds.length > 0
        ? await MessageFeedbackModel.query().whereIn('message_id', messageIds).where('user_id', userId)
        : [];
    const feedbackMap = new Map(feedbackRows.map((f: { messageId: string; rating: 'up' | 'down' }) => [f.messageId, f.rating]));

    return rows.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      mode: m.mode,
      status: m.status,
      templateId: m.templateId,
      templateType: m.templateType,
      metadata: m.metadata,
      feedbackRating: feedbackMap.get(m.id) ?? null,
    }));
  }

  async getMessage(messageId: string): Promise<(ConversationMessageRecord & { conversationId?: string }) | null> {
    if (!this.enabled) {
      for (const rows of this.memoryMessages.values()) {
        const found = rows.find((m) => m.id === messageId);
        if (found) {
          return {
            id: found.id,
            conversationId: found.conversationId,
            role: found.role,
            content: found.content,
            mode: found.mode,
            status: found.status,
            templateId: found.templateId,
            templateType: found.templateType,
            metadata: found.metadata,
          };
        }
      }
      return null;
    }
    const row = await MessageModel.query().findById(messageId);
    if (!row) return null;
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role,
      content: row.content,
      mode: row.mode,
      status: row.status,
      templateId: row.templateId,
      templateType: row.templateType,
      metadata: row.metadata,
    };
  }

  async findPrecedingUserQuery(conversationId: string, beforeMessageId: string): Promise<string | null> {
    if (!this.enabled) {
      const rows = this.memoryMessages.get(conversationId) ?? [];
      const idx = rows.findIndex((m) => m.id === beforeMessageId);
      for (let i = idx - 1; i >= 0; i--) {
        if (rows[i]!.role === 'user') return rows[i]!.content;
      }
      return null;
    }
    const target = await MessageModel.query().findById(beforeMessageId);
    if (!target) return null;
    const row = await MessageModel.query()
      .where('conversation_id', conversationId)
      .where('role', 'user')
      .where('created_at', '<', target.createdAt!)
      .orderBy('created_at', 'desc')
      .first();
    return row?.content ?? null;
  }

  async upsertFeedback(req: SubmitFeedbackRequest): Promise<boolean> {
    if (!this.enabled) {
      this.memoryFeedback.set(req.messageId, {
        userId: req.userId,
        rating: req.rating,
        reason: req.reason,
      });
      return true;
    }

    const existing = await MessageFeedbackModel.query()
      .where({ message_id: req.messageId, user_id: req.userId })
      .first();
    if (existing) {
      await MessageFeedbackModel.query().findById(existing.id).patch({
        rating: req.rating,
        reason: req.reason ?? null,
      });
      return true;
    }

    await MessageFeedbackModel.query().insert({
      id: randomUUID(),
      messageId: req.messageId,
      userId: req.userId,
      rating: req.rating,
      reason: req.reason ?? null,
      createdAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });
    return true;
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
