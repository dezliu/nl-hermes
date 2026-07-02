import type { RetrieveResult } from '@hermes/contracts';
import type { WorkflowGraphState } from './state.js';
import type { NodeResult, WorkflowDeps } from './types.js';
import { DEFAULT_WORKFLOW_LIMITS } from './state.js';
import { checkSecurityGuard } from './security-guard.js';
import { checkGrounding, checkColumnGrounding, checkSqlGrounding } from './grounding.js';
import { computeRagScore, isRagScoreAcceptable, mergeRetrieveResults } from './rag-utils.js';

const DATASOURCE_SETUP_HINT =
  '未配置有效数据源。请执行 pnpm seed:settle 并在 .env 设置 DEFAULT_DATASOURCE_ID。';

function shouldSkipRagRewrite(query: string): boolean {
  if (process.env.WORKFLOW_SKIP_RAG_REWRITE === 'true') return true;
  if (query.length < 8) return false;
  return /查|统计|流水|查询|汇总|明细|报表/.test(query);
}

function interrupted(state: WorkflowGraphState, deps: WorkflowDeps): NodeResult | null {
  if (deps.signal.isInterrupted()) {
    return { status: 'interrupted', currentNode: 'Interrupted' };
  }
  return null;
}

function emitPhase(deps: WorkflowDeps, phase: WorkflowGraphState['currentPhase']) {
  deps.emit({ type: 'phase', phase });
}

function emitStep(deps: WorkflowDeps, step: string, detail?: string) {
  deps.emit({ type: 'step', step, detail });
}

function emitSqlDraft(deps: WorkflowDeps, explanation: string, sql: string) {
  deps.emit({
    type: 'chunk',
    content: `**分析**\n${explanation}\n\n**SQL 草案**\n\`\`\`sql\n${sql}\n\`\`\`\n`,
  });
}

function summarizeSchemaTables(schemaContext: RetrieveResult[]): string {
  const tables = new Set<string>();
  for (const item of schemaContext.slice(0, 6)) {
    const match = item.content.match(/^([a-z_][a-z0-9_]*)/i);
    if (match) tables.add(match[1]!);
  }
  return tables.size > 0 ? [...tables].join('、') : '（未命中相关表）';
}

function rolePromptInput(state: WorkflowGraphState) {
  if (!state.rolePrompt) return undefined;
  return { persona: state.rolePrompt.persona, constraints: state.rolePrompt.constraints };
}

async function retrieveAllCollections(
  deps: WorkflowDeps,
  query: string,
  mode: WorkflowGraphState['mode'],
): Promise<{
  metadata: RetrieveResult[];
  business: RetrieveResult[];
  templates: RetrieveResult[];
}> {
  const [metadata, business, templates] = await Promise.all([
    deps.rag.retrieve({ query, collection: 'metadata', mode, topK: 8 }),
    deps.rag.retrieve({ query, collection: 'business', mode, topK: 6 }),
    deps.rag.retrieve({ query, collection: 'templates', mode, topK: 4 }),
  ]);
  return {
    metadata: metadata.results,
    business: business.results,
    templates: templates.results,
  };
}

export async function securityGuardNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const check = checkSecurityGuard(state.query);
  if (check.blocked) {
    return {
      intent: 'refuse',
      refuseReason: check.reason,
      currentNode: 'SecurityGuard',
    };
  }
  return { currentNode: 'SecurityGuard' };
}

export async function loadContextNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (!deps.datasourceId) {
    return {
      intent: 'refuse',
      refuseReason: DATASOURCE_SETUP_HINT,
      currentNode: 'LoadContext',
    };
  }

  emitPhase(deps, 'understanding');
  emitStep(deps, '理解问题', state.query);
  deps.emit({ type: 'chunk', content: '正在理解问题…\n' });

  const rolePrompt = await deps.metadata.getActivePrompt(state.roleId ?? null);

  return {
    rolePrompt,
    currentNode: 'LoadContext',
    currentPhase: 'understanding',
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

export async function intentClassifyNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const result = await deps.llm.classifyIntent({
    query: state.query,
    mode: state.mode,
    history: state.history,
  });

  const confidence = result.confidence ?? 1;
  if (result.intent === 'needs_generation' && confidence < state.minIntentConfidence) {
    return {
      intent: 'clarify',
      intentConfidence: confidence,
      clarifyQuestion: result.clarifyQuestion ?? '请补充更具体的业务描述，例如时间范围、指标或分析对象。',
      currentNode: 'IntentClassify',
    };
  }

  return {
    intent: result.intent,
    intentConfidence: confidence,
    refuseReason: result.reason,
    directAnswer: result.answer,
    currentNode: 'IntentClassify',
  };
}

export async function ragPrepareNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (state.ragQueries?.length || state.hydeUsed) {
    return { currentNode: 'RagPrepare' };
  }

  if (shouldSkipRagRewrite(state.query)) {
    return { ragQueries: [state.query], currentNode: 'RagPrepare' };
  }

  const queries = await deps.llm.rewriteQueries({ query: state.query, mode: state.mode });
  return { ragQueries: queries, currentNode: 'RagPrepare' };
}

export async function ragRetrieveNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  emitPhase(deps, 'retrieving');
  emitStep(deps, '检索表字段');
  deps.emit({ type: 'chunk', content: '正在检索相关数据表…\n' });

  const searchQueries = state.ragSearchQuery
    ? [state.ragSearchQuery]
    : state.ragQueries.length > 0
      ? state.ragQueries
      : [state.query];

  const metaSets: RetrieveResult[][] = [];
  const bizSets: RetrieveResult[][] = [];
  const tplSets: RetrieveResult[][] = [];

  const batches = await Promise.all(
    searchQueries.map((q) => retrieveAllCollections(deps, q, state.mode)),
  );
  for (const batch of batches) {
    metaSets.push(batch.metadata);
    bizSets.push(batch.business);
    tplSets.push(batch.templates);
  }

  const schemaContext = mergeRetrieveResults(...metaSets);
  emitStep(deps, '检索表字段', summarizeSchemaTables(schemaContext));

  return {
    schemaContext,
    businessKnowledge: mergeRetrieveResults(...bizSets),
    templateExamples: mergeRetrieveResults(...tplSets),
    ragLoopCount: state.ragLoopCount + 1,
    ragSearchQuery: undefined,
    currentNode: 'RagRetrieve',
    currentPhase: 'retrieving',
  };
}

export async function ragQualityGateNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const ragScore = computeRagScore(state.schemaContext, state.businessKnowledge);

  if (isRagScoreAcceptable(ragScore, state.minRagScore, state.schemaContext)) {
    return { ragScore, currentNode: 'RagQualityGate' };
  }

  if (!state.hydeUsed) {
    const draft = await deps.llm.generateHydeDraft({ query: state.query, mode: state.mode });
    return {
      ragScore,
      hydeUsed: true,
      ragSearchQuery: draft,
      currentNode: 'RagQualityGate',
    };
  }

  if (state.ragLoopCount >= state.maxRagLoops) {
    return {
      ragScore,
      refuseReason: '未能在智能查询库中找到足够相关的知识，请换一种说法或联系数据管理员补充元数据。',
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
  emitStep(deps, '生成 SQL');
  deps.emit({ type: 'chunk', content: '正在生成 SQL…\n' });

  const gen = await deps.llm.generateSql({
    query: state.query,
    schemaContext: state.schemaContext,
    businessKnowledge: state.businessKnowledge,
    examples: state.templateExamples,
    mode: state.mode,
    rolePrompt: rolePromptInput(state),
    errorFeedback: state.lastError,
    onThinking: (chunk) => {
      if (chunk) deps.emit({ type: 'thinking', content: chunk });
    },
  });

  deps.emit({ type: 'thinking', content: '', done: true });
  emitSqlDraft(deps, gen.explanation, gen.sql);

  return {
    generatedSql: gen.sql,
    generatedContent: gen.explanation,
    lastError: undefined,
    currentNode: 'GenerateSQL',
    currentPhase: 'generating',
  };
}

export async function generateReportNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  emitPhase(deps, 'generating');
  emitStep(deps, '生成报表');
  deps.emit({ type: 'chunk', content: '正在生成报表…\n' });

  const gen = await deps.llm.generateReport({
    query: state.query,
    schemaContext: state.schemaContext,
    businessKnowledge: state.businessKnowledge,
    examples: state.templateExamples,
    rolePrompt: rolePromptInput(state),
    errorFeedback: state.lastError,
    onThinking: (chunk) => {
      if (chunk) deps.emit({ type: 'thinking', content: chunk });
    },
  });

  deps.emit({ type: 'thinking', content: '', done: true });
  emitSqlDraft(deps, gen.explanation, gen.sql);

  return {
    generatedSql: gen.sql,
    generatedContent: gen.explanation,
    chartConfig: { ...gen.chartConfig, chartType: gen.chartType },
    lastError: undefined,
    currentNode: 'GenerateReport',
    currentPhase: 'generating',
  };
}

export async function validateResultNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (!state.generatedSql) {
    return { currentNode: 'ValidateResult' };
  }

  emitStep(deps, '校验 SQL');

  const columnCheck = checkColumnGrounding({ sql: state.generatedSql, schemaContext: state.schemaContext });
  if (!columnCheck.ok) {
    const unknown = columnCheck.unknownColumns?.join(', ') ?? '未知字段';
    const msg = `SQL 包含知识库外的字段：${unknown}`;
    deps.emit({ type: 'chunk', content: `\n⚠️ ${msg}\n` });
    if (state.validateRetryCount < state.maxValidateRetries) {
      return {
        lastError: msg,
        validateRetryCount: state.validateRetryCount + 1,
        currentNode: 'ValidateResult',
      };
    }
    return {
      refuseReason: `SQL 校验未通过：${msg}`,
      intent: 'refuse',
      currentNode: 'ValidateResult',
    };
  }

  const datasourceId = deps.datasourceId;
  if (!datasourceId) {
    return {
      refuseReason: DATASOURCE_SETUP_HINT,
      intent: 'refuse',
      currentNode: 'ValidateResult',
    };
  }

  try {
    const validation = await deps.report.validateSql({
      sql: state.generatedSql,
      datasourceId,
      lightweight: state.mode === 'sql',
    });
    if (!validation.valid) {
      const errors = validation.errors ?? [];
      if (errors.some((e) => e.code === 'DATASOURCE_NOT_FOUND')) {
        return {
          refuseReason: DATASOURCE_SETUP_HINT,
          intent: 'refuse',
          currentNode: 'ValidateResult',
        };
      }
      const msg = errors.map((e: { message: string }) => e.message).join('; ') || 'SQL 校验失败';
      deps.emit({ type: 'chunk', content: `\n⚠️ 校验失败：${msg}\n` });
      if (state.validateRetryCount < state.maxValidateRetries) {
        return {
          lastError: msg,
          validateRetryCount: state.validateRetryCount + 1,
          currentNode: 'ValidateResult',
        };
      }
      return {
        refuseReason: `SQL 校验未通过：${msg}`,
        intent: 'refuse',
        currentNode: 'ValidateResult',
      };
    }
  } catch {
    // report-service 不可用时跳过预检
  }

  return { lastError: undefined, currentNode: 'ValidateResult' };
}

export async function executeReportNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (!state.generatedSql) {
    return { currentNode: 'ExecuteReport' };
  }

  const datasourceId = deps.datasourceId;
  if (!datasourceId) {
    return {
      refuseReason: DATASOURCE_SETUP_HINT,
      intent: 'refuse',
      currentNode: 'ExecuteReport',
    };
  }

  const exec = await deps.report.executeQuery({
    sql: state.generatedSql,
    datasourceId,
    parameters: {},
  });

  if (!exec.ok) {
    const errMsg = exec.error?.message ?? '报表执行失败';
    if (state.reportRetryCount < state.maxReportRetries) {
      return {
        lastError: errMsg,
        reportRetryCount: state.reportRetryCount + 1,
        currentNode: 'ExecuteReport',
      };
    }
    return {
      refuseReason: `执行环境异常，错误码：${exec.error?.code ?? 'EXEC_ERROR'}，请检查数据源。${errMsg}`,
      intent: 'refuse',
      currentNode: 'ExecuteReport',
    };
  }

  return {
    executionResult: { rows: exec.rows, rowCount: exec.rowCount },
    lastError: undefined,
    currentNode: 'ExecuteReport',
  };
}

export async function summarizeResultNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const rows = (state.executionResult?.rows as Record<string, unknown>[] | undefined) ?? [];
  const rowCount = (state.executionResult?.rowCount as number | undefined) ?? rows.length;

  let summary: string;
  if (state.mode === 'report' && rows.length > 0) {
    summary = await deps.llm.summarizeResult({
      query: state.query,
      mode: state.mode,
      sql: state.generatedSql,
      rows: rows.slice(0, 50),
      rowCount,
    });
  } else if (state.mode === 'sql' && state.generatedSql) {
    summary = state.generatedContent ?? '';
  } else {
    summary = state.generatedContent ?? '';
  }

  const sqlBlock = state.generatedSql ? `\n\n\`\`\`sql\n${state.generatedSql}\n\`\`\`` : '';
  const chartLine =
    state.mode === 'report' && state.chartConfig?.chartType
      ? `\n\n图表类型：${String(state.chartConfig.chartType)}`
      : '';
  const rowLine = state.mode === 'report' ? `\n行数：${rowCount}` : '';
  const summaryLine = summary && state.mode === 'report' ? `\n\n${summary}` : '';
  const explanation = state.generatedContent ?? '';

  const content =
    state.mode === 'sql'
      ? `${explanation}${sqlBlock}`
      : `${explanation}${sqlBlock}${chartLine}${rowLine}${summaryLine}`;
  deps.emit({ type: 'chunk', content });

  return {
    summaryText: summary,
    generatedContent: content,
    streamBuffer: state.streamBuffer + content,
    currentNode: 'SummarizeResult',
  };
}

export async function groundingCheckNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (!state.generatedSql && !state.generatedContent) {
    return { currentNode: 'GroundingCheck' };
  }

  const check = checkSqlGrounding({
    sql: state.generatedSql,
    schemaContext: state.schemaContext,
    businessKnowledge: state.businessKnowledge,
  });

  if (!check.ok) {
    deps.logger.warn('workflow.grounding.failed', {
      unknown: check.unknownTokens ?? check.unknownColumns,
    });
    const detail = check.unknownColumns?.length
      ? `未知字段：${check.unknownColumns.join(', ')}`
      : `未知表：${check.unknownTokens?.join(', ') ?? ''}`;
    return {
      intent: 'refuse',
      refuseReason: `抱歉，生成结果包含知识库外的未定义字段，请重新描述需求。${detail}`,
      currentNode: 'GroundingCheck',
    };
  }

  return { currentNode: 'GroundingCheck' };
}

export async function clarifyNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  const content = state.clarifyQuestion ?? '请补充更具体的业务描述。';
  deps.emit({ type: 'chunk', content });
  return {
    generatedContent: content,
    streamBuffer: state.streamBuffer + content,
    status: 'completed',
    currentNode: 'Clarify',
  };
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

export async function streamOutputNode(_state: WorkflowGraphState, _deps: WorkflowDeps): Promise<NodeResult> {
  return {
    status: _state.status === 'interrupted' ? 'interrupted' : _state.status === 'failed' ? 'failed' : 'completed',
    currentNode: 'StreamOutput',
  };
}

export function routeAfterSecurity(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  return 'load_context';
}

export function routeAfterIntent(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  if (state.intent === 'clarify') return 'clarify';
  if (state.intent === 'direct_answer') return 'direct_answer';
  return 'rag_prepare';
}

export function routeAfterQualityGate(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  if (isRagScoreAcceptable(state.ragScore, state.minRagScore, state.schemaContext)) {
    return state.mode === 'sql' ? 'generate_sql' : 'generate_report';
  }
  if (state.ragSearchQuery) return 'rag_retrieve';
  if (state.ragLoopCount < state.maxRagLoops) return 'rag_retrieve';
  return 'refuse';
}

export function routeAfterValidate(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  if (state.lastError) {
    return state.mode === 'sql' ? 'generate_sql' : 'generate_report';
  }
  if (state.mode === 'report') return 'execute_report';
  return 'summarize';
}

export function routeAfterExecute(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  if (state.lastError) return 'generate_report';
  return 'summarize';
}

export function routeAfterGrounding(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  return 'stream_output';
}
