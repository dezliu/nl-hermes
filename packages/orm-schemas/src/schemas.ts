/** Table name constants — full models added in Phase 2 */
export const META_TABLES = {
  USERS: 'users',
  ROLES: 'roles',
  DATASOURCES: 'datasources',
  META_TABLES: 'meta_tables',
  META_FIELDS: 'meta_fields',
  FIELD_SYNONYMS: 'field_synonyms',
  BUSINESS_KNOWLEDGE: 'business_knowledge',
  FIELD_SAMPLES: 'field_samples',
  PROMPT_VERSIONS: 'prompt_versions',
  SQL_TEMPLATES: 'sql_templates',
  REPORT_TEMPLATES: 'report_templates',
  SYSTEM_SETTINGS: 'system_settings',
  ALERTS: 'alerts',
  AUDIT_LOGS: 'audit_logs',
  TEMPLATE_CANDIDATES: 'template_candidates',
} as const;

export const CHAT_TABLES = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  WORKFLOW_CHECKPOINTS: 'workflow_checkpoints',
  MESSAGE_FEEDBACK: 'message_feedback',
  GENERATION_AUDIT: 'generation_audit',
  GENERATION_FEEDBACK_ITEMS: 'generation_feedback_items',
} as const;

export const EVAL_TABLES = {
  EVAL_SETS: 'eval_sets',
  EVAL_CASES: 'eval_cases',
  EVAL_RUNS: 'eval_runs',
  EVAL_RESULTS: 'eval_results',
} as const;
