import type { RetrieveResult, ReportChartSpec, ReportSpec, TemplateMatchResult } from '@hermes/contracts';
import { validateDashboardLayout, createDefaultDashboardLayout } from '@hermes/contracts';
import { randomUUID } from 'node:crypto';
import { formatUnknownColumnFeedback } from '@hermes/shared';
import type { WorkflowGraphState } from './state.js';
import type { NodeResult, WorkflowDeps } from './types.js';
import { DEFAULT_WORKFLOW_LIMITS } from './state.js';
import { checkSecurityGuard } from './security-guard.js';
import { checkGrounding, checkColumnGrounding, checkSqlGrounding } from './grounding.js';
import { computeRagScore, isRagScoreAcceptable, mergeRetrieveResults } from './rag-utils.js';
import {
  enrichSchemaByTables,
  enrichSchemaForMissingColumns,
  enrichSchemaForTemporalIntent,
  hasTemporalQueryIntent,
} from './schema-enrichment.js';

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

function buildGenerationExamples(
  ragExamples: RetrieveResult[],
  templateMatches: TemplateMatchResult[],
): RetrieveResult[] {
  const fromMatches: RetrieveResult[] = templateMatches
    .filter((t) => t.sqlBody?.trim())
    .map((t) => ({
      id: `template-match-${t.id}`,
      content: `${t.name} ${t.scenarioDescription}\nSQL:\n${t.sqlBody}`,
      score: t.score,
      matchReason: 'template_match',
    }));
  return mergeRetrieveResults(fromMatches, ragExamples);
}

async function enrichSchemaContext(
  schemaContext: RetrieveResult[],
  query: string,
  deps: WorkflowDeps,
): Promise<RetrieveResult[]> {
  try {
    const { items } = await deps.metadata.listQueryLibrary();
    let enriched = enrichSchemaByTables(schemaContext, items);
    if (hasTemporalQueryIntent(query)) {
      enriched = enrichSchemaForTemporalIntent(enriched, items);
    }
    return enriched;
  } catch (err) {
    deps.logger.warn('workflow.schema_enrichment.failed', { err: String(err) });
    return schemaContext;
  }
}

async function tryEnrichForUnknownColumns(
  schemaContext: RetrieveResult[],
  unknownColumns: string[],
  sql: string,
  deps: WorkflowDeps,
): Promise<RetrieveResult[]> {
  try {
    const { items } = await deps.metadata.listQueryLibrary();
    return enrichSchemaForMissingColumns(schemaContext, unknownColumns, items, sql);
  } catch (err) {
    deps.logger.warn('workflow.schema_enrichment.missing_columns.failed', { err: String(err) });
    return schemaContext;
  }
}

function schemaContextPatch(
  schemaContext: RetrieveResult[],
  state: WorkflowGraphState,
): Pick<NodeResult, 'schemaContext'> {
  return schemaContext !== state.schemaContext ? { schemaContext } : {};
}

async function retrieveAllCollections(
  deps: WorkflowDeps,
  query: string,
  mode: WorkflowGraphState['mode'],
  metadataTopK = 8,
): Promise<{
  metadata: RetrieveResult[];
  business: RetrieveResult[];
  templates: RetrieveResult[];
}> {
  const [metadata, business, templates] = await Promise.all([
    deps.rag.retrieve({ query, collection: 'metadata', mode, topK: metadataTopK }),
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

  const metadataTopK = hasTemporalQueryIntent(state.query) ? 12 : 8;

  const batches = await Promise.all(
    searchQueries.map((q) => retrieveAllCollections(deps, q, state.mode, metadataTopK)),
  );
  for (const batch of batches) {
    metaSets.push(batch.metadata);
    bizSets.push(batch.business);
    tplSets.push(batch.templates);
  }

  let schemaContext = mergeRetrieveResults(...metaSets);
  schemaContext = await enrichSchemaContext(schemaContext, state.query, deps);
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
    examples: buildGenerationExamples(state.templateExamples, state.templateMatches),
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
    examples: buildGenerationExamples(state.templateExamples, state.templateMatches),
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

  let schemaContext = state.schemaContext;
  let columnCheck = checkColumnGrounding({ sql: state.generatedSql, schemaContext });

  if (!columnCheck.ok && columnCheck.unknownColumns?.length) {
    const enriched = await tryEnrichForUnknownColumns(
      schemaContext,
      columnCheck.unknownColumns,
      state.generatedSql,
      deps,
    );
    if (enriched.length > schemaContext.length) {
      schemaContext = enriched;
      columnCheck = checkColumnGrounding({ sql: state.generatedSql, schemaContext });
    }
  }

  if (!columnCheck.ok) {
    const detail =
      columnCheck.misassignedColumns?.join(', ') ??
      columnCheck.unknownColumns?.join(', ') ??
      '未知字段';
    const msg = columnCheck.misassignedColumns?.length
      ? `SQL 字段表引用错误：${detail}`
      : `SQL 包含知识库外的字段：${detail}`;
    deps.emit({ type: 'chunk', content: `\n⚠️ ${msg}\n` });
    if (state.validateRetryCount < state.maxValidateRetries) {
      return {
        ...schemaContextPatch(schemaContext, state),
        lastError: msg,
        validateRetryCount: state.validateRetryCount + 1,
        currentNode: 'ValidateResult',
      };
    }
    return {
      ...schemaContextPatch(schemaContext, state),
      refuseReason: `SQL 校验未通过：${msg}`,
      intent: 'refuse',
      currentNode: 'ValidateResult',
    };
  }

  const datasourceId = deps.datasourceId;
  if (!datasourceId) {
    return {
      ...schemaContextPatch(schemaContext, state),
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
          ...schemaContextPatch(schemaContext, state),
          refuseReason: DATASOURCE_SETUP_HINT,
          intent: 'refuse',
          currentNode: 'ValidateResult',
        };
      }
      const rawMsg = errors.map((e: { message: string }) => e.message).join('; ') || 'SQL 校验失败';
      const msg = rawMsg.includes('Unknown column')
        ? formatUnknownColumnFeedback(rawMsg, schemaContext)
        : rawMsg;
      deps.emit({ type: 'chunk', content: `\n⚠️ 校验失败：${msg}\n` });
      if (state.validateRetryCount < state.maxValidateRetries) {
        return {
          ...schemaContextPatch(schemaContext, state),
          lastError: msg,
          validateRetryCount: state.validateRetryCount + 1,
          currentNode: 'ValidateResult',
        };
      }
      return {
        ...schemaContextPatch(schemaContext, state),
        refuseReason: `SQL 校验未通过：${msg}`,
        intent: 'refuse',
        currentNode: 'ValidateResult',
      };
    }
  } catch {
    // report-service 不可用时跳过预检
  }

  return {
    ...schemaContextPatch(schemaContext, state),
    lastError: undefined,
    currentNode: 'ValidateResult',
  };
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
    state.mode === 'report' && state.chartConfig?.chartType && state.outputFormat === 'inline'
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

export async function analyzeReportNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (state.mode !== 'report') {
    return { currentNode: 'AnalyzeReport' };
  }

  const rows = (state.executionResult?.rows as Record<string, unknown>[] | undefined) ?? [];
  const rowCount = (state.executionResult?.rowCount as number | undefined) ?? rows.length;

  emitStep(deps, '分析报表数据');
  deps.emit({ type: 'chunk', content: '正在综合分析数据…\n' });

  const outputFormat = state.outputFormat ?? 'inline';

  if (outputFormat === 'dashboard') {
    const dashboardAnalysis = await deps.llm.analyzeDashboardLayout({
      query: state.query,
      sql: state.generatedSql,
      rows: rows.slice(0, 50),
      rowCount,
      schemaContext: state.schemaContext,
      businessKnowledge: state.businessKnowledge,
      chartType: state.chartConfig?.chartType ? String(state.chartConfig.chartType) : undefined,
      chartConfig: state.chartConfig as Record<string, string> | undefined,
    });

    const chartCount = dashboardAnalysis.recommendedCharts.length;
    const validation = validateDashboardLayout(dashboardAnalysis.layout, chartCount);
    const layout = validation.normalized ?? dashboardAnalysis.layout ?? createDefaultDashboardLayout(chartCount, dashboardAnalysis.title);

    return {
      reportAnalysis: {
        title: dashboardAnalysis.title,
        summary: dashboardAnalysis.summary,
        insights: dashboardAnalysis.insights,
        dataSources: dashboardAnalysis.dataSources,
        caveats: dashboardAnalysis.caveats,
        recommendedCharts: dashboardAnalysis.recommendedCharts,
        layout,
      },
      summaryText: dashboardAnalysis.summary,
      currentNode: 'AnalyzeReport',
    };
  }

  const analysis = await deps.llm.analyzeReportData({
    query: state.query,
    outputFormat,
    sql: state.generatedSql,
    rows: rows.slice(0, 50),
    rowCount,
    schemaContext: state.schemaContext,
    businessKnowledge: state.businessKnowledge,
    chartType: state.chartConfig?.chartType ? String(state.chartConfig.chartType) : undefined,
    chartConfig: state.chartConfig as Record<string, string> | undefined,
  });

  return {
    reportAnalysis: analysis,
    summaryText: analysis.summary,
    currentNode: 'AnalyzeReport',
  };
}

export async function composeSpecNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (state.mode !== 'report' || !state.generatedSql || !deps.datasourceId) {
    return { currentNode: 'ComposeSpec' };
  }

  const rows = (state.executionResult?.rows as Record<string, unknown>[] | undefined) ?? [];
  const rowCount = (state.executionResult?.rowCount as number | undefined) ?? rows.length;
  const analysis = state.reportAnalysis;
  const primaryChartType = (state.chartConfig?.chartType as ReportChartSpec['chartType']) ?? 'table';
  const primaryConfig = {
    xField: String(state.chartConfig?.xField ?? 'x'),
    yField: String(state.chartConfig?.yField ?? 'y'),
    seriesField: state.chartConfig?.seriesField ? String(state.chartConfig.seriesField) : undefined,
    title: analysis?.title,
  };

  const charts: ReportChartSpec[] =
    analysis?.recommendedCharts?.map((chart) => ({
      chartType: chart.chartType,
      chartConfig: {
        xField: chart.chartConfig.xField ?? primaryConfig.xField,
        yField: chart.chartConfig.yField ?? primaryConfig.yField,
        seriesField: chart.chartConfig.seriesField,
        title: chart.chartConfig.title,
      },
    })) ?? [{ chartType: primaryChartType, chartConfig: primaryConfig }];

  const reportId = state.reportSpec?.id ?? randomUUID();
  const outputFormat = state.outputFormat ?? 'inline';
  const spec: ReportSpec = {
    id: reportId,
    title: analysis?.title ?? state.query.slice(0, 48),
    userQuery: state.query,
    sql: state.generatedSql,
    datasourceId: deps.datasourceId,
    userId: state.userId,
    data: {
      rows: rows.slice(0, 500),
      rowCount,
      truncated: rowCount > rows.length,
    },
    charts,
    narrative: {
      summary: analysis?.summary ?? state.summaryText ?? '',
      insights: analysis?.insights,
      dataSources: analysis?.dataSources,
      caveats: analysis?.caveats,
      sections: analysis?.sections,
    },
    outputFormat,
    layout: outputFormat === 'dashboard' ? analysis?.layout : undefined,
    createdAt: new Date().toISOString(),
  };

  if (outputFormat === 'dashboard' && spec.layout) {
    const validation = validateDashboardLayout(spec.layout, charts.length);
    if (validation.normalized) {
      spec.layout = validation.normalized;
    }
  }

  return { reportSpec: spec, currentNode: 'ComposeSpec' };
}

export async function renderArtifactNode(state: WorkflowGraphState, deps: WorkflowDeps): Promise<NodeResult> {
  const hit = interrupted(state, deps);
  if (hit) return hit;

  if (state.mode !== 'report' || !state.reportSpec) {
    return { currentNode: 'RenderArtifact' };
  }

  const format = state.reportSpec.outputFormat;
  if (format === 'web') {
    deps.emit({ type: 'chunk', content: '正在生成网页报告…\n' });
  } else if (format === 'word') {
    deps.emit({ type: 'chunk', content: '正在生成 Word 文档…\n' });
  } else if (format === 'dashboard') {
    deps.emit({ type: 'chunk', content: '正在生成数据大屏…\n' });
  }

  emitStep(deps, '渲染报表', format);

  try {
    const gatewayBaseUrl = process.env.GATEWAY_PUBLIC_URL ?? 'http://localhost:4000';
    const result = await deps.report.renderReport({
      spec: state.reportSpec,
      gatewayBaseUrl,
    });

    deps.emit({ type: 'report_preview', spec: state.reportSpec });

    if (result.artifact.status === 'ready') {
      deps.emit({ type: 'artifact_ready', artifact: result.artifact });
      const artifactNote =
        format === 'web'
          ? `\n\n网页报告已生成，可预览或分享。`
          : format === 'word'
            ? `\n\nWord 文档已生成，可下载。`
            : '';
      if (artifactNote) {
        deps.emit({ type: 'chunk', content: artifactNote });
      }
    } else if (result.artifact.errorMessage) {
      deps.emit({ type: 'chunk', content: `\n\n⚠️ 报表渲染失败：${result.artifact.errorMessage}\n` });
    }

    const previewContent = `${state.generatedContent ?? ''}${format !== 'inline' ? `\n\n[报表 ID: ${state.reportSpec.id}]` : ''}`;

    return {
      reportArtifact: result.artifact,
      generatedContent: previewContent,
      streamBuffer: state.streamBuffer + previewContent,
      currentNode: 'RenderArtifact',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '报表渲染失败';
    deps.emit({ type: 'chunk', content: `\n\n⚠️ ${msg}\n` });
    return { lastError: msg, currentNode: 'RenderArtifact' };
  }
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
    const detail = check.misassignedColumns?.length
      ? `字段表引用错误：${check.misassignedColumns.join(', ')}`
      : check.unknownColumns?.length
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

export function routeAfterSummarize(state: WorkflowGraphState): string {
  if (state.mode === 'report' && state.executionResult) return 'analyze_report';
  return 'grounding_check';
}

export function routeAfterGrounding(state: WorkflowGraphState): string {
  if (state.intent === 'refuse') return 'refuse';
  return 'stream_output';
}
