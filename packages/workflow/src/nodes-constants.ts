export const WORKFLOW_NODES = [
  'SecurityGuard',
  'LoadContext',
  'IntentClassify',
  'TemplateMatch',
  'RagPrepare',
  'RagRetrieve',
  'RagQualityGate',
  'GenerateSQL',
  'GenerateReport',
  'ValidateResult',
  'ExecuteReport',
  'SummarizeResult',
  'GroundingCheck',
  'StreamOutput',
  'DirectAnswer',
  'Clarify',
  'Refuse',
] as const;

export type WorkflowNodeName = (typeof WORKFLOW_NODES)[number];
