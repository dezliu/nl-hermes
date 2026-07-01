export const SERVICE_PORTS = {
  GATEWAY_API: 4000,
  ORCHESTRATOR: 4010,
  RAG_SERVICE: 4020,
  REPORT_SERVICE: 4030,
  EVAL_SERVICE: 4040,
  METADATA_SERVICE: 4050,
  WEB_USER: 3001,
  WEB_ADMIN: 3002,
  WEB_MONITOR: 3003,
} as const;

export const QDRANT_COLLECTIONS = {
  METADATA: 'hermes_metadata',
  BUSINESS: 'hermes_business',
  TEMPLATES: 'hermes_templates',
} as const;
