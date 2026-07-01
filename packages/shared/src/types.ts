export type GenerationMode = 'sql' | 'report';

export type ServiceHealth = {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  timestamp: string;
};

export type WorkflowState = {
  sessionId: string;
  mode: GenerationMode;
  userId: string;
  query: string;
};
