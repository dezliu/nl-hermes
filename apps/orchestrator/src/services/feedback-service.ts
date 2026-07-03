import type { SubmitFeedbackRequest } from '@hermes/contracts';
import type { ChatRepository } from '../repositories/chat-repository.js';
import type { MetadataClosedLoopClient } from '../lib/metadata-closed-loop-client.js';

export class FeedbackService {
  constructor(
    private readonly repo: ChatRepository,
    private readonly closedLoop?: MetadataClosedLoopClient,
  ) {}

  async submit(req: SubmitFeedbackRequest): Promise<boolean> {
    const message = await this.repo.getMessage(req.messageId);
    if (!message) {
      throw Object.assign(new Error('消息不存在'), { code: 'MESSAGE_NOT_FOUND' });
    }

    if (req.rating === 'down') {
      const isFailed = message.status === 'failed' || message.status === 'interrupted';
      if (isFailed && !req.reason?.trim()) {
        throw Object.assign(new Error('请填写不满意原因'), { code: 'REASON_REQUIRED' });
      }
    }

    const ok = await this.repo.upsertFeedback(req);
    if (!ok) return false;

    if (req.rating === 'up' && message.status === 'completed') {
      void this.closedLoop?.boostCandidate(req.messageId);
    }

    if (req.rating === 'down' && this.closedLoop) {
      const meta = (message.metadata ?? {}) as Record<string, unknown>;
      const conversationId = message.conversationId ?? '';
      const userQuery =
        (typeof meta.userQuery === 'string' && meta.userQuery) ||
        (conversationId ? await this.repo.findPrecedingUserQuery(conversationId, req.messageId) : null) ||
        '';

      void this.closedLoop.createFeedbackItem({
        messageId: req.messageId,
        conversationId,
        mode: message.mode,
        userQuery,
        assistantContent: message.content,
        generatedSql: typeof meta.sql === 'string' ? meta.sql : undefined,
        refuseReason: typeof meta.refuseReason === 'string' ? meta.refuseReason : message.content,
        ragScore: typeof meta.ragScore === 'number' ? meta.ragScore : undefined,
        feedbackReason: req.reason?.trim() ?? '未填写原因',
      });
    }

    return true;
  }
}

export function createFeedbackService(
  repo: ChatRepository,
  closedLoop?: MetadataClosedLoopClient,
): FeedbackService {
  return new FeedbackService(repo, closedLoop);
}
