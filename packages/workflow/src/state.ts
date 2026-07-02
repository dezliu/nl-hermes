import type { GenerationMode } from '@hermes/shared';
import type { RetrieveResult, RolePrompt, TemplateMatchResult } from '@hermes/contracts';

export type IntentKind = 'direct_answer' | 'needs_generation' | 'refuse' | 'clarify';

export type WorkflowPhase = 'understanding' | 'retrieving' | 'generating';

export type WorkflowGraphState = {
  sessionId: string;
  runId: string;
  userId: string;
  roleId?: string;
  mode: GenerationMode;
  query: string;
  checkpointId: string;
  traceId?: string;

  ragLoopCount: number;
  reportRetryCount: number;
  validateRetryCount: number;
  maxRagLoops: number;
  maxReportRetries: number;
  maxValidateRetries: number;
  minRagScore: number;
  minIntentConfidence: number;

  rolePrompt?: RolePrompt | null;
  history: { role: 'user' | 'assistant'; content: string }[];

  intent?: IntentKind;
  intentConfidence?: number;
  refuseReason?: string;
  directAnswer?: string;
  clarifyQuestion?: string;

  ragQueries: string[];
  ragSearchQuery?: string;
  hydeUsed: boolean;

  schemaContext: RetrieveResult[];
  businessKnowledge: RetrieveResult[];
  templateExamples: RetrieveResult[];
  templateMatches: TemplateMatchResult[];
  ragScore: number;

  generatedSql?: string;
  generatedContent?: string;
  chartConfig?: Record<string, unknown>;
  executionResult?: Record<string, unknown>;
  lastError?: string;
  summaryText?: string;

  currentPhase: WorkflowPhase;
  currentNode: string;
  status: 'running' | 'interrupted' | 'completed' | 'failed';
  streamBuffer: string;
};

export const DEFAULT_WORKFLOW_LIMITS = {
  maxRagLoops: 2,
  maxReportRetries: 3,
  maxValidateRetries: 2,
  minRagScore: 0.35,
  minIntentConfidence: 0.8,
  templateThreshold: 0.72,
};

export function createInitialState(input: {
  sessionId: string;
  runId: string;
  userId: string;
  roleId?: string;
  mode: GenerationMode;
  query: string;
  checkpointId: string;
  traceId?: string;
  history?: WorkflowGraphState['history'];
}): WorkflowGraphState {
  return {
    ...input,
    history: input.history ?? [],
    ragLoopCount: 0,
    reportRetryCount: 0,
    validateRetryCount: 0,
    maxRagLoops: DEFAULT_WORKFLOW_LIMITS.maxRagLoops,
    maxReportRetries: DEFAULT_WORKFLOW_LIMITS.maxReportRetries,
    maxValidateRetries: DEFAULT_WORKFLOW_LIMITS.maxValidateRetries,
    minRagScore: DEFAULT_WORKFLOW_LIMITS.minRagScore,
    minIntentConfidence: DEFAULT_WORKFLOW_LIMITS.minIntentConfidence,
    ragQueries: [],
    hydeUsed: false,
    schemaContext: [],
    businessKnowledge: [],
    templateExamples: [],
    templateMatches: [],
    ragScore: 0,
    currentPhase: 'understanding',
    currentNode: 'LoadContext',
    status: 'running',
    streamBuffer: '',
  };
}
