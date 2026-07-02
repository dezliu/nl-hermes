import { describe, it, expect } from 'vitest';
import { createChatRepository } from '../repositories/chat-repository.js';
import { createConversationService } from '../services/conversation-service.js';

describe('ConversationService', () => {
  it('lists, renames and deletes conversations in memory mode', async () => {
    const repo = createChatRepository(false);
    const svc = createConversationService(repo);

    const id = await repo.createConversation('u1', 'sql', '订单趋势');
    await repo.addMessage({ conversationId: id, role: 'user', content: 'hello', mode: 'sql' });

    const list = await svc.list('u1');
    expect(list).toHaveLength(1);
    expect(list[0]?.title).toBe('订单趋势');

    const renamed = await svc.rename({ userId: 'u1', conversationId: id, title: '新标题' });
    expect(renamed?.title).toBe('新标题');

    const messages = await svc.messages('u1', id);
    expect(messages).toHaveLength(1);

    const deleted = await svc.delete('u1', id);
    expect(deleted).toBe(true);
    expect(await svc.list('u1')).toHaveLength(0);
  });
});
