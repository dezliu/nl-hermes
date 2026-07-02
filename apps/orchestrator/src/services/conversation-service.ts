import type { ConversationSummary, RenameConversationRequest } from '@hermes/contracts';
import type { ChatRepository } from '../repositories/chat-repository.js';

export class ConversationService {
  constructor(private readonly repo: ChatRepository) {}

  list(userId: string): Promise<ConversationSummary[]> {
    return this.repo.listConversations(userId);
  }

  messages(userId: string, conversationId: string) {
    return this.repo.listConversationMessages(userId, conversationId);
  }

  rename(req: RenameConversationRequest): Promise<ConversationSummary | null> {
    return this.repo.renameConversation(req.userId, req.conversationId, req.title);
  }

  delete(userId: string, conversationId: string): Promise<boolean> {
    return this.repo.deleteConversation(userId, conversationId);
  }
}

export function createConversationService(repo: ChatRepository): ConversationService {
  return new ConversationService(repo);
}
