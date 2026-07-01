import type { GenerationMode } from '@hermes/shared';

export type WorkflowGraphState = {
  sessionId: string;
  runId: string;
  userId: string;
  mode: GenerationMode;
  query: string;
  ragLoopCount: number;
  reportRetryCount: number;
  schemaContext: unknown[];
  businessKnowledge: unknown[];
  templateExamples: unknown[];
  status: 'running' | 'interrupted' | 'completed' | 'failed';
};
