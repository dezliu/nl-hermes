import type { GenerationMode } from '@hermes/shared';
import type { RetrieveResult, RolePrompt, TemplateMatchResult, UserPermissions } from '@hermes/contracts';

export type IntentKind = 'direct_answer' | 'needs_generation' | 'refuse';

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
  maxRagLoops: number;
  maxReportRetries: number;
  minRagScore: number;

  rolePrompt?: RolePrompt | null;
  permissions?: UserPermissions;
  history: { role: 'user' | 'assistant'; content: string }[];

  intent?: IntentKind;
  refuseReason?: string;
  directAnswer?: string;

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

  currentPhase: WorkflowPhase;
  currentNode: string;
  status: 'running' | 'interrupted' | 'completed' | 'failed';
  streamBuffer: string;
};

export const DEFAULT_WORKFLOW_LIMITS = {
  maxRagLoops: 3,
  maxReportRetries: 3,
  minRagScore: 0.35,
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
    maxRagLoops: DEFAULT_WORKFLOW_LIMITS.maxRagLoops,
    maxReportRetries: DEFAULT_WORKFLOW_LIMITS.maxReportRetries,
    minRagScore: DEFAULT_WORKFLOW_LIMITS.minRagScore,
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
