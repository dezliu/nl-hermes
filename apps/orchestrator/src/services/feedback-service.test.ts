import { describe, it, expect } from 'vitest';
import { createChatRepository } from '../repositories/chat-repository.js';
import { createFeedbackService } from '../services/feedback-service.js';

describe('FeedbackService', () => {
  it('stores message feedback in memory mode', async () => {
    const repo = createChatRepository(false);
    const svc = createFeedbackService(repo);
    const conversationId = await repo.createConversation('u1', 'sql', 'test');
    const messageId = await repo.addMessage({
      conversationId,
      role: 'assistant',
      content: 'result',
      mode: 'sql',
    });

    await svc.submit({ userId: 'u1', messageId, rating: 'up' });
    const messages = await repo.listConversationMessages('u1', conversationId);
    expect(messages[0]?.feedbackRating).toBe('up');

    await svc.submit({ userId: 'u1', messageId, rating: 'down', reason: '不准确' });
    const updated = await repo.listConversationMessages('u1', conversationId);
    expect(updated[0]?.feedbackRating).toBe('down');
  });

  it('requires reason when downvoting failed message', async () => {
    const repo = createChatRepository(false);
    const svc = createFeedbackService(repo);
    const conversationId = await repo.createConversation('u1', 'sql', 'test');
    const messageId = await repo.addMessage({
      conversationId,
      role: 'assistant',
      content: 'SQL 校验未通过',
      mode: 'sql',
      status: 'failed',
    });

    await expect(svc.submit({ userId: 'u1', messageId, rating: 'down' })).rejects.toMatchObject({
      code: 'REASON_REQUIRED',
    });
  });
});
