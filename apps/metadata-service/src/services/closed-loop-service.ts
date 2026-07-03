import type { Logger } from '@hermes/shared';
import { TemplateCandidateModel } from '@hermes/orm-schemas';
import type { Knex } from 'knex';
import { createChatKnex } from '@hermes/orm-schemas';
import type { Repositories } from '../repositories/index.js';
import { newId } from '../lib/crypto.js';

export type CreateCandidateInput = {
  sourceMessageId: string;
  conversationId: string;
  mode: 'sql' | 'report';
  userQuery: string;
  sqlBody: string;
  chartType?: 'line' | 'bar' | 'table';
  chartConfig?: unknown;
  ragScore?: number;
};

export type CreateFeedbackInput = {
  messageId: string;
  conversationId: string;
  mode: 'sql' | 'report';
  userQuery: string;
  assistantContent: string;
  generatedSql?: string;
  refuseReason?: string;
  ragScore?: number;
  feedbackReason: string;
};

const DEFAULT_CANDIDATE_RAG_THRESHOLD = 0.7;
const UPVOTE_PRIORITY_BOOST = 10;

export class ClosedLoopRepository {
  private readonly chatKnex: Knex;

  constructor(chatKnex?: Knex) {
    this.chatKnex = chatKnex ?? createChatKnex();
  }

  listCandidates(status?: string) {
    let q = TemplateCandidateModel.query().orderBy('priority', 'desc').orderBy('created_at', 'desc');
    if (status) q = q.where('status', status);
    return q;
  }

  findCandidateByMessageId(messageId: string) {
    return TemplateCandidateModel.query().where('source_message_id', messageId).first();
  }

  findCandidate(id: string) {
    return TemplateCandidateModel.query().findById(id);
  }

  insertCandidate(data: Partial<TemplateCandidateModel>) {
    return TemplateCandidateModel.query().insert(data);
  }

  patchCandidate(id: string, data: Partial<TemplateCandidateModel>) {
    return TemplateCandidateModel.query().patchAndFetchById(id, data);
  }

  async listFeedback(status?: string) {
    let q = this.chatKnex('generation_feedback_items').orderBy('created_at', 'desc');
    if (status) q = q.where('status', status);
    return q.select('*');
  }

  async findFeedback(id: string) {
    return this.chatKnex('generation_feedback_items').where({ id }).first();
  }

  async insertFeedback(data: Record<string, unknown>) {
    const messageId = data.message_id as string;
    const existing = await this.chatKnex('generation_feedback_items').where({ message_id: messageId }).first();
    if (existing) {
      await this.chatKnex('generation_feedback_items').where({ message_id: messageId }).update({
        feedback_reason: data.feedback_reason,
        status: 'open',
      });
      return;
    }
    await this.chatKnex('generation_feedback_items').insert(data);
  }

  async patchFeedback(id: string, data: Record<string, unknown>) {
    await this.chatKnex('generation_feedback_items').where({ id }).update(data);
  }
}

export class ClosedLoopService {
  private readonly repo: ClosedLoopRepository;

  constructor(
    private readonly templateRepos: Repositories,
    private readonly logger: Logger,
    repo?: ClosedLoopRepository,
  ) {
    this.repo = repo ?? new ClosedLoopRepository();
  }

  async createCandidate(input: CreateCandidateInput, traceId?: string) {
    const existing = await this.repo.findCandidateByMessageId(input.sourceMessageId);
    if (existing) return existing;

    const threshold = DEFAULT_CANDIDATE_RAG_THRESHOLD;
    if ((input.ragScore ?? 0) < threshold) return null;

    const row = await this.repo.insertCandidate({
      id: newId(),
      sourceMessageId: input.sourceMessageId,
      conversationId: input.conversationId,
      mode: input.mode,
      userQuery: input.userQuery,
      scenarioDescription: input.userQuery.slice(0, 512),
      sqlBody: input.sqlBody,
      chartType: input.chartType ?? null,
      chartConfig: input.chartConfig ?? null,
      ragScore: input.ragScore ?? null,
      userUpvoted: false,
      priority: Math.round((input.ragScore ?? 0) * 100),
      status: 'pending',
    });
    this.logger.info('closed_loop.candidate.created', { traceId, candidateId: row.id });
    return row;
  }

  async boostCandidateOnUpvote(messageId: string, traceId?: string) {
    const row = await this.repo.findCandidateByMessageId(messageId);
    if (!row || row.status !== 'pending') return null;
    const updated = await this.repo.patchCandidate(row.id, {
      userUpvoted: true,
      priority: row.priority + UPVOTE_PRIORITY_BOOST,
    });
    this.logger.info('closed_loop.candidate.boosted', { traceId, candidateId: row.id });
    return updated;
  }

  listCandidates(status?: string) {
    return this.repo.listCandidates(status);
  }

  async rejectCandidate(id: string, traceId?: string) {
    const row = await this.repo.patchCandidate(id, { status: 'rejected' });
    if (row) this.logger.info('closed_loop.candidate.rejected', { traceId, candidateId: id });
    return row;
  }

  async approveCandidate(
    id: string,
    input: { name?: string; inLibrary?: boolean; createdBy?: string },
    traceId?: string,
  ) {
    const candidate = await this.repo.findCandidate(id);
    if (!candidate || candidate.status !== 'pending') return null;

    if (candidate.mode === 'sql') {
      const tpl = await this.templateRepos.template.insertSql({
        id: newId(),
        name: input.name ?? candidate.userQuery.slice(0, 64),
        scenarioDescription: candidate.scenarioDescription,
        sqlBody: candidate.sqlBody,
        status: input.inLibrary ? 'active' : 'draft',
        inLibrary: input.inLibrary ?? false,
        usageCount: 0,
        score: candidate.ragScore ?? null,
        createdBy: input.createdBy,
      });
      const updated = await this.repo.patchCandidate(id, {
        status: 'approved',
        templateId: tpl.id,
      });
      this.logger.info('closed_loop.candidate.approved', { traceId, candidateId: id, templateId: tpl.id });
      return { candidate: updated, template: tpl };
    }

    const chartType = candidate.chartType ?? 'table';
    const tpl = await this.templateRepos.template.insertReport({
      id: newId(),
      name: input.name ?? candidate.userQuery.slice(0, 64),
      scenarioDescription: candidate.scenarioDescription,
      sqlBody: candidate.sqlBody,
      chartType,
      chartConfig: candidate.chartConfig ?? { xField: '', yField: '' },
      status: input.inLibrary ? 'active' : 'draft',
      inLibrary: input.inLibrary ?? false,
      usageCount: 0,
      score: candidate.ragScore ?? null,
      createdBy: input.createdBy,
    });
    const updated = await this.repo.patchCandidate(id, {
      status: 'approved',
      templateId: tpl.id,
    });
    this.logger.info('closed_loop.candidate.approved', { traceId, candidateId: id, templateId: tpl.id });
    return { candidate: updated, template: tpl };
  }

  async createFeedbackItem(input: CreateFeedbackInput, traceId?: string) {
    const id = newId();
    await this.repo.insertFeedback({
      id,
      message_id: input.messageId,
      conversation_id: input.conversationId,
      mode: input.mode,
      user_query: input.userQuery,
      assistant_content: input.assistantContent,
      generated_sql: input.generatedSql ?? null,
      refuse_reason: input.refuseReason ?? null,
      rag_score: input.ragScore ?? null,
      feedback_reason: input.feedbackReason,
      status: 'open',
      created_at: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });
    this.logger.info('closed_loop.feedback.created', { traceId, feedbackId: id });
    return { id };
  }

  listFeedback(status?: string) {
    return this.repo.listFeedback(status);
  }

  async resolveFeedback(
    id: string,
    input: { resolvedBy?: string; resultTemplateId?: string },
    traceId?: string,
  ) {
    const existing = await this.repo.findFeedback(id);
    if (!existing) return null;
    await this.repo.patchFeedback(id, {
      status: 'resolved',
      resolved_by: input.resolvedBy ?? null,
      resolved_at: new Date().toISOString().slice(0, 23).replace('T', ' '),
      result_template_id: input.resultTemplateId ?? null,
    });
    this.logger.info('closed_loop.feedback.resolved', { traceId, feedbackId: id });
    return this.repo.findFeedback(id);
  }
}
