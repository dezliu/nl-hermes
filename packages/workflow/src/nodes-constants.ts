export const WORKFLOW_NODES = [
  'LoadContext',
  'IntentClassify',
  'TemplateMatch',
  'RagRetrieve',
  'RagQualityGate',
  'GenerateSQL',
  'GenerateReport',
  'ReportRetry',
  'ValidateResult',
  'StreamOutput',
  'DirectAnswer',
  'Refuse',
] as const;

export type WorkflowNodeName = (typeof WORKFLOW_NODES)[number];
