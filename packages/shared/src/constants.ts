/** HTTP header names used across Hermes services */
export const HTTP_HEADERS = {
  TRACE_ID: 'x-trace-id',
  SERVICE_TOKEN: 'x-service-token',
  SERVICE_NAME: 'x-service-name',
  USER_ID: 'x-user-id',
} as const;

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

export const OPENSEARCH_INDICES = {
  METADATA: 'hermes_metadata',
  BUSINESS: 'hermes_business',
  TEMPLATES: 'hermes_templates',
} as const;

/** Paths exempt from service-to-service token validation */
export const PUBLIC_SERVICE_PATHS = ['/health', '/ready'] as const;
