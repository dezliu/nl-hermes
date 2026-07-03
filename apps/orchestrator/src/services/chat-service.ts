import { randomUUID } from 'node:crypto';
import type { Logger } from '@hermes/shared';
import type {
  CancelChatRequest,
  ChatStreamEvent,
  ContinueChatRequest,
  StartChatRequest,
  StartChatResponse,
} from '@hermes/contracts';
import {
  createMetadataClient,
  createRagClient,
  createReportClient,
} from '@hermes/llm-tools';
import {
  createInitialState,
  runWorkflow,
  saveCheckpointRef,
  type WorkflowGraphState,
} from '@hermes/workflow';
import { createLlmProviderFromEnv } from '@hermes/llm-tools';
import type { ChatRepository } from '../repositories/chat-repository.js';
import type { GenerationLock, InterruptRegistry, RedisLike } from '../lib/redis.js';
import type { TemplateApplyService } from './template-apply-service.js';
import type { MetadataClosedLoopClient } from '../lib/metadata-closed-loop-client.js';
import type { ReportArtifactRepository } from '../repositories/report-artifact-repository.js';
import { shouldCreateTemplateCandidate } from '../lib/candidate-eligibility.js';

export type ChatServiceOptions = {
  logger: Logger;
  repo: ChatRepository;
  lock: GenerationLock;
  interrupts: InterruptRegistry;
  redis: RedisLike | null;
  dbEnabled?: boolean;
  templateApply?: TemplateApplyService;
  closedLoop?: MetadataClosedLoopClient;
  reportArtifacts?: ReportArtifactRepository;
};

export class ChatService {
  private readonly runs = new Map<string, { conversationId: string; userId: string }>();

  constructor(private readonly opts: ChatServiceOptions) {}

  async start(req: StartChatRequest): Promise<StartChatResponse> {
    const runId = randomUUID();
    const acquired = await this.opts.lock.acquire(req.userId, runId);
    if (!acquired) {
      throw Object.assign(new Error('已有进行中的生成任务'), { code: 'CONCURRENT_GENERATION' });
    }

    const conversationId =
      req.conversationId ??
      (await this.opts.repo.createConversation(req.userId, req.mode, req.query.slice(0, 64) || '新会话'));

    await this.opts.repo.addMessage({
      conversationId,
      role: 'user',
      content: req.query,
      mode: req.mode,
      templateId: req.templateId,
      templateType: req.templateType,
    });

    const checkpointId = await this.opts.repo.saveCheckpoint({
      conversationId,
      runId,
      status: 'running',
    });

    this.runs.set(runId, { conversationId, userId: req.userId });
    return { runId, conversationId, checkpointId };
  }

  async cancel(req: CancelChatRequest): Promise<boolean> {
    this.opts.interrupts.mark(req.runId);
    await this.opts.repo.updateCheckpoint(req.runId, { status: 'interrupted' });
    const meta = this.runs.get(req.runId);
    if (meta) await this.opts.lock.release(meta.userId, req.runId);
    return true;
  }

  async continue(req: ContinueChatRequest): Promise<StartChatResponse> {
    return this.start({
      userId: req.userId,
      roleId: req.roleId,
      conversationId: req.conversationId,
      query: req.query,
      mode: req.mode,
      traceId: req.traceId,
      outputFormat: req.outputFormat,
    });
  }

  async stream(
    runId: string,
    input: StartChatRequest,
    write: (event: ChatStreamEvent) => void,
  ): Promise<void> {
    const meta = this.runs.get(runId);
    const conversationId = meta?.conversationId ?? input.conversationId ?? randomUUID();
    const traceId = input.traceId;

    const rag = createRagClient(process.env.RAG_SERVICE_URL, traceId);
    const report = createReportClient(process.env.REPORT_SERVICE_URL, traceId);
    const metadata = createMetadataClient(process.env.METADATA_SERVICE_URL, traceId);
    const llm = createLlmProviderFromEnv();

    const datasourceId = await metadata.resolveDatasourceId(input.datasourceId);

    const history = await this.opts.repo.listHistory(conversationId);
    const checkpointId = randomUUID();

    const usingTemplate = Boolean(input.templateId && input.templateType && input.templateParameters);
    const initial = createInitialState({
      sessionId: conversationId,
      runId,
      userId: input.userId,
      roleId: input.roleId,
      mode: input.mode,
      query: input.query,
      checkpointId,
      traceId,
      outputFormat: input.outputFormat,
      history: history.filter((h) => h.role === 'user' || h.role === 'assistant') as WorkflowGraphState['history'],
    });

    let finalState: WorkflowGraphState = initial;

    try {
      if (usingTemplate && this.opts.templateApply) {
        const applied = await this.opts.templateApply.run(
          {
            mode: input.mode,
            query: input.query,
            templateId: input.templateId!,
            templateType: input.templateType!,
            templateParameters: input.templateParameters!,
            traceId,
            datasourceId,
          },
          write,
        );

        const messageId = await this.opts.repo.addMessage({
          conversationId,
          role: 'assistant',
          content: applied.content,
          mode: input.mode,
          status: 'completed',
          templateId: input.templateId,
          templateType: input.templateType,
          metadata: {
            appliedTemplate: true,
            sql: applied.sql,
            chartConfig: applied.chartConfig,
          },
        });

        await this.opts.repo.updateCheckpoint(runId, { status: 'completed' });
        await this.opts.repo.touchConversation(conversationId);

        write({
          type: 'done',
          runId,
          messageId,
          conversationId,
          status: 'completed',
          content: applied.content,
          metadata: { appliedTemplate: true, sql: applied.sql },
        });
        return;
      }

      finalState = await runWorkflow(initial, {
        rag,
        report,
        metadata,
        llm,
        logger: this.opts.logger,
        emit: write,
        signal: { isInterrupted: () => this.opts.interrupts.isInterrupted(runId) },
        datasourceId,
      });

      const redisRef = await saveCheckpointRef(this.opts.redis, conversationId, runId, {
        query: input.query,
        mode: input.mode,
        status: finalState.status,
      });

      const assistantStatus =
        finalState.status === 'interrupted' ? 'interrupted' : finalState.status === 'failed' ? 'failed' : 'completed';

      const messageMetadata = {
        phases: finalState.currentPhase,
        ragScore: finalState.ragScore,
        sql: finalState.generatedSql,
        chartConfig: finalState.chartConfig,
        refuseReason: finalState.refuseReason,
        lastError: finalState.lastError,
        workflowNode: finalState.currentNode,
        userQuery: input.query,
        outputFormat: finalState.outputFormat,
        reportId: finalState.reportSpec?.id,
        reportSpec: finalState.reportSpec,
        reportArtifact: finalState.reportArtifact,
        redisRef,
      };

      const messageId = await this.opts.repo.addMessage({
        conversationId,
        role: 'assistant',
        content: finalState.generatedContent ?? finalState.refuseReason ?? '',
        mode: input.mode,
        status: assistantStatus,
        metadata: messageMetadata,
      });

      if (
        finalState.reportSpec &&
        finalState.reportArtifact &&
        this.opts.reportArtifacts
      ) {
        await this.opts.reportArtifacts.save({
          id: finalState.reportSpec.id,
          messageId,
          userId: input.userId,
          spec: finalState.reportSpec,
          artifact: finalState.reportArtifact,
        });
      }

      if (
        assistantStatus === 'completed' &&
        finalState.generatedSql &&
        !finalState.refuseReason &&
        this.opts.closedLoop &&
        shouldCreateTemplateCandidate(finalState)
      ) {
        void this.opts.closedLoop.createCandidate({
          sourceMessageId: messageId,
          conversationId,
          mode: input.mode,
          userQuery: input.query,
          sqlBody: finalState.generatedSql,
          chartType:
            input.mode === 'report' && finalState.chartConfig?.chartType
              ? (finalState.chartConfig.chartType as 'line' | 'bar' | 'table')
              : undefined,
          chartConfig: finalState.chartConfig,
          ragScore: finalState.ragScore,
          schemaContextCount: finalState.schemaContext.length,
        });
      }

      await this.opts.repo.updateCheckpoint(runId, {
        status: finalState.status,
        graphState: { ragScore: finalState.ragScore, node: finalState.currentNode },
      });
      await this.opts.repo.touchConversation(conversationId);

      write({
        type: 'done',
        runId,
        messageId,
        conversationId,
        status: finalState.status === 'interrupted' ? 'interrupted' : finalState.status === 'failed' ? 'failed' : 'completed',
        content: finalState.generatedContent ?? '',
        metadata: {
          ragScore: finalState.ragScore,
          reportId: finalState.reportSpec?.id,
          reportArtifact: finalState.reportArtifact,
        },
      });
    } catch (err) {
      this.opts.logger.error('chat.stream.failed', { runId, err: String(err) });
      write({ type: 'error', code: 'WORKFLOW_FAILED', message: err instanceof Error ? err.message : '工作流执行失败' });
    } finally {
      this.opts.interrupts.clear(runId);
      const m = this.runs.get(runId);
      if (m) await this.opts.lock.release(m.userId, runId);
      this.runs.delete(runId);
    }
  }
}
