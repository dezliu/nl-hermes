import type { ChatStreamEvent } from '@hermes/contracts';
import type { Logger } from '@hermes/shared';
import type { LlmProvider, MetadataClient, RagClient, ReportClient } from '@hermes/llm-tools';
import type { WorkflowGraphState } from './state.js';

export type { LlmProvider } from '@hermes/llm-tools';

export type StreamEmitter = (event: ChatStreamEvent) => void;

export type InterruptSignal = {
  isInterrupted: () => boolean;
};

export type WorkflowDeps = {
  rag: RagClient;
  report: ReportClient;
  metadata: MetadataClient;
  llm: LlmProvider;
  logger: Logger;
  emit: StreamEmitter;
  signal: InterruptSignal;
  datasourceId?: string;
};

export type NodeResult = Partial<WorkflowGraphState>;

export type WorkflowNodeHandler = (
  state: WorkflowGraphState,
  deps: WorkflowDeps,
) => Promise<NodeResult>;
