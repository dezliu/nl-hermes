import type { WorkflowGraphState } from './state.js';
import type { NodeResult, WorkflowDeps } from './types.js';
import { DEFAULT_WORKFLOW_LIMITS } from './state.js';

function interrupted(state: WorkflowGraphState, deps: WorkflowDeps): NodeResult | null {
  if (deps.signal.isInterrupted()) {
    return { status: 'interrupted', currentNode: 'Interrupted' };
  }
  return null;
}

function emitPhase(deps: WorkflowDeps, phase: WorkflowGraphState['currentPhase']) {
  deps.emit({ type: 'phase', phase });
}

function emitChunk(deps: WorkflowDeps, content: string, state: WorkflowGraphState): string {
  deps.emit({ type: 'chunk', content });
  return state.streamBuffer + content;
}

export async function loadContextNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  emitPhase(deps, 'understanding');
  deps.emit({ type: 'chunk', content: '正在理解问题…\n' });

  const [rolePrompt, permissions] = await Promise.all([
    deps.metadata.getActivePrompt(state.roleId ?? null),
    deps.metadata.getUserPermissions(state.userId),
  ]);

  return {
    rolePrompt,
    permissions,
    currentNode: 'LoadContext',
    currentPhase: 'understanding',
    streamBuffer: emitChunk(deps, '', state),
  };
}

export async function intentClassifyNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const result = await deps.llm.classifyIntent({
    query: state.query,
    mode: state.mode,
    history: state.history,
  });

  return {
    intent: result.intent,
    refuseReason: result.reason,
    directAnswer: result.answer,
    currentNode: 'IntentClassify',
  };
}

export async function templateMatchNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  try {
    const { results } = await deps.report.matchTemplates({
      query: state.query,
      mode: state.mode,
      topK: 3,
      threshold: DEFAULT_WORKFLOW_LIMITS.templateThreshold,
    });
    if (results.length > 0) {
      deps.emit({ type: 'templates', results });
    }
    return { templateMatches: results, currentNode: 'TemplateMatch' };
  } catch (err) {
    deps.logger.warn('workflow.template_match.failed', { err: String(err) });
    return { templateMatches: [], currentNode: 'TemplateMatch' };
  }
}

export async function ragRetrieveNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  emitPhase(deps, 'retrieving');
  deps.emit({ type: 'chunk', content: '正在检索相关数据表…\n' });

  const [metadata, business, templates] = await Promise.all([
    deps.rag.retrieve({ query: state.query, collection: 'metadata', mode: state.mode, topK: 8 }),
    deps.rag.retrieve({ query: state.query, collection: 'business', mode: state.mode, topK: 6 }),
    deps.rag.retrieve({ query: state.query, collection: 'templates', mode: state.mode, topK: 4 }),
  ]);

  return {
    schemaContext: metadata.results,
    businessKnowledge: business.results,
    templateExamples: templates.results,
    ragLoopCount: state.ragLoopCount + 1,
    currentNode: 'RagRetrieve',
    currentPhase: 'retrieving',
  };
}

export async function ragQualityGateNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const metaScore = state.schemaContext[0]?.score ?? 0;
  const bizScore = state.businessKnowledge[0]?.score ?? 0;
  const ragScore = metaScore * 0.7 + bizScore * 0.3;

  if (ragScore < state.minRagScore && state.ragLoopCount >= state.maxRagLoops) {
    return {
      ragScore,
      refuseReason: '未能在智能查询库中找到足够相关的表/字段，请换一种说法或联系数据管理员补充元数据。',
      intent: 'refuse',
      currentNode: 'RagQualityGate',
    };
  }

  return { ragScore, currentNode: 'RagQualityGate' };
}

export async function generateSqlNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  emitPhase(deps, 'generating');
  deps.emit({ type: 'chunk', content: '正在生成 SQL…\n' });

  const gen = await deps.llm.generateSql({
    query: state.query,
    schemaContext: state.schemaContext,
    businessKnowledge: state.businessKnowledge,
    examples: state.templateExamples,
    mode: state.mode,
    errorFeedback: state.lastError,
  });

  const content = `${gen.explanation}\n\n\`\`\`sql\n${gen.sql}\n\`\`\``;
  deps.emit({ type: 'chunk', content });

  return {
    generatedSql: gen.sql,
    generatedContent: content,
    streamBuffer: state.streamBuffer + content,
    currentNode: 'GenerateSQL',
    currentPhase: 'generating',
  };
}

export async function generateReportNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  emitPhase(deps, 'generating');
  deps.emit({ type: 'chunk', content: '正在生成报表…\n' });

  const gen = await deps.llm.generateReport({
    query: state.query,
    schemaContext: state.schemaContext,
    businessKnowledge: state.businessKnowledge,
    examples: state.templateExamples,
    errorFeedback: state.lastError,
  });

  const datasourceId = state.permissions?.datasourceId ?? deps.datasourceId ?? 'default';
  const exec = await deps.report.executeQuery({
    sql: gen.sql,
    datasourceId,
    parameters: {},
  });

  if (!exec.ok) {
    return {
      generatedSql: gen.sql,
      lastError: exec.error?.message ?? '报表执行失败',
      reportRetryCount: state.reportRetryCount + 1,
      currentNode: 'GenerateReport',
    };
  }

  const content = `${gen.explanation}\n\n图表类型：${gen.chartType}\n行数：${exec.rowCount ?? 0}`;
  deps.emit({ type: 'chunk', content });

  return {
    generatedSql: gen.sql,
    generatedContent: content,
    chartConfig: { ...gen.chartConfig, chartType: gen.chartType },
    executionResult: { rows: exec.rows, rowCount: exec.rowCount },
    streamBuffer: state.streamBuffer + content,
    currentNode: 'GenerateReport',
    currentPhase: 'generating',
    lastError: undefined,
  };
}

export async function validateResultNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (state.mode === 'report' && state.generatedSql) {
    const datasourceId = state.permissions?.datasourceId ?? deps.datasourceId ?? 'default';
    try {
      const validation = await deps.report.validateSql({ sql: state.generatedSql, datasourceId });
      if (!validation.valid) {
        const msg = validation.errors.map((e: { message: string }) => e.message).join('; ');
        return { refuseReason: msg, intent: 'refuse', currentNode: 'ValidateResult' };
      }
    } catch {
      // report-service 不可用时跳过预检
    }
  }

  return { currentNode: 'ValidateResult' };
}

export async function directAnswerNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const content = state.directAnswer ?? '';
  if (content) deps.emit({ type: 'chunk', content });
  return {
    generatedContent: content,
    streamBuffer: state.streamBuffer + content,
    status: 'completed',
    currentNode: 'DirectAnswer',
  };
}

export async function refuseNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const content = state.refuseReason ?? state.lastError ?? '抱歉，无法处理该请求。';
  deps.emit({ type: 'chunk', content });
  return {
    generatedContent: content,
    streamBuffer: state.streamBuffer + content,
    status: 'failed',
    currentNode: 'Refuse',
  };
}

export async function streamOutputNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  return {
    status: state.status === 'interrupted' ? 'interrupted' : state.status === 'failed' ? 'failed' : 'completed',
    currentNode: 'StreamOutput',
  };
}

export function routeAfterIntent(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  if (state.intent === 'direct_answer') return 'direct_answer';
  return 'rag_retrieve';
}

export function routeAfterQualityGate(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  if (state.ragScore >= state.minRagScore) {
    return state.mode === 'sql' ? 'generate_sql' : 'generate_report';
  }
  if (state.ragLoopCount < state.maxRagLoops) return 'rag_retrieve';
  return 'refuse';
}

export function routeAfterReport(state: WorkflowGraphState): string {
  if (state.lastError && state.reportRetryCount < state.maxReportRetries) return 'generate_report';
  if (state.lastError) return 'refuse';
  return 'validate';
}

export function routeAfterValidate(state: WorkflowGraphState): string {
  if (state.intent === 'refuse' && state.refuseReason) return 'refuse';
  return 'stream_output';
}
