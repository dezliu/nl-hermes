import type { SubmitFeedbackRequest } from '@hermes/contracts';
import type { ChatRepository } from '../repositories/chat-repository.js';

export class FeedbackService {
  constructor(private readonly repo: ChatRepository) {}

  submit(req: SubmitFeedbackRequest): Promise<boolean> {
    return this.repo.upsertFeedback(req);
  }
}

export function createFeedbackService(repo: ChatRepository): FeedbackService {
  return new FeedbackService(repo);
}
