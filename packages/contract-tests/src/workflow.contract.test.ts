import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  createMockLlmProvider,
  runWorkflow,
} from '../../workflow/src/index.js';
import type { WorkflowDeps } from '../../workflow/src/types.js';
import { createLogger } from '@hermes/shared';
import { vi } from 'vitest';
import {
  securityGuardNode,
  loadContextNode,
  intentClassifyNode,
  templateMatchNode,
  ragPrepareNode,
  ragRetrieveNode,
  ragQualityGateNode,
  generateSqlNode,
  generateReportNode,
  validateResultNode,
  executeReportNode,
  summarizeResultNode,
  groundingCheckNode,
  clarifyNode,
  refuseNode,
  directAnswerNode,
  routeAfterSecurity,
  routeAfterIntent,
  routeAfterValidate,
  routeAfterExecute,
  routeAfterGrounding,
} from '../../workflow/src/nodes.js';
import { checkSecurityGuard } from '../../workflow/src/security-guard.js';

function mockDeps(overrides: Partial<WorkflowDeps> = {}): WorkflowDeps {
  const events: unknown[] = [];
  return {
    rag: {
      retrieve: vi.fn().mockResolvedValue({
        results: [{ id: 't1', content: 'orders 订单表 amount', score: 0.85 }],
        query: 'q',
        collection: 'metadata',
      }),
    } as WorkflowDeps['rag'],
    report: {
      matchTemplates: vi.fn().mockResolvedValue({
        results: [{ id: 'tpl1', name: '销售模板', scenarioDescription: '销售', score: 0.8, type: 'sql' }],
      }),
      executeQuery: vi.fn().mockResolvedValue({ ok: true, rows: [{ cnt: 1 }], rowCount: 1 }),
      validateSql: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
    } as WorkflowDeps['report'],
    metadata: {
      getActivePrompt: vi.fn().mockResolvedValue({ roleId: null, persona: '分析师', constraints: '', version: 1 }),
      getUserPermissions: vi.fn().mockResolvedValue({
        userId: 'u1',
        roleId: 'r1',
        allowedTables: [],
        allowedFields: [],
      }),
      listQueryLibrary: vi.fn().mockResolvedValue({ items: [] }),
    } as WorkflowDeps['metadata'],
    llm: createMockLlmProvider(),
    logger: createLogger({ service: 'workflow-nodes-test' }),
    emit: (e) => events.push(e),
    signal: { isInterrupted: () => false },
    datasourceId: 'ds1',
    ...overrides,
  };
}

function baseState(mode: 'sql' | 'report' = 'sql') {
  return createInitialState({
    sessionId: 's1',
    runId: 'r1',
    userId: 'u1',
    mode,
    query: '近7天销售额',
    checkpointId: 'c1',
  });
}

describe('security guard', () => {
  it('should_block_drop_table', () => {
    const r = checkSecurityGuard('DROP TABLE users');
    expect(r.blocked).toBe(true);
  });
});

describe('workflow node unit tests', () => {
  it('should_block_dangerous_query_in_security_guard_node', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.query = 'DROP TABLE orders';
    const result = await securityGuardNode(state, deps);
    expect(result.intent).toBe('refuse');
    expect(routeAfterSecurity({ ...state, ...result })).toBe('refuse');
  });

  it('should_load_context_without_permissions', async () => {
    const deps = mockDeps();
    const result = await loadContextNode(baseState(), deps);
    expect(result.rolePrompt?.persona).toBe('分析师');
    expect(deps.metadata.getUserPermissions).not.toHaveBeenCalled();
    expect(result.currentPhase).toBe('understanding');
  });

  it('should_classify_intent_via_llm', async () => {
    const deps = mockDeps();
    const result = await intentClassifyNode(baseState(), deps);
    expect(result.intent).toBeTruthy();
    expect(result.intentConfidence).toBeGreaterThan(0);
  });

  it('should_clarify_when_low_confidence', async () => {
    const deps = mockDeps({
      llm: {
        ...createMockLlmProvider(),
        classifyIntent: vi.fn().mockResolvedValue({
          intent: 'needs_generation',
          confidence: 0.6,
          clarifyQuestion: '请补充时间范围',
        }),
      },
    });
    const result = await intentClassifyNode(baseState(), deps);
    expect(result.intent).toBe('clarify');
    expect(routeAfterIntent({ ...baseState(), ...result })).toBe('clarify');
  });

  it('should_emit_template_cards_when_matches_found', async () => {
    const events: unknown[] = [];
    const deps = mockDeps({ emit: (e) => events.push(e) });
    await templateMatchNode(baseState(), deps);
    expect(events.some((e) => (e as { type?: string }).type === 'templates')).toBe(true);
  });

  it('should_rewrite_queries_in_rag_prepare', async () => {
    const deps = mockDeps();
    const result = await ragPrepareNode(baseState(), deps);
    expect(result.ragQueries?.length).toBe(3);
  });

  it('should_retrieve_three_collections_per_query', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.ragQueries = ['q1', 'q2', 'q3'];
    await ragRetrieveNode(state, deps);
    expect(deps.rag.retrieve).toHaveBeenCalledTimes(9);
  });

  it('should_refuse_when_rag_score_low_and_hyde_exhausted', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.schemaContext = [{ id: '1', content: 'x', score: 0.1 }];
    state.businessKnowledge = [{ id: '2', content: 'y', score: 0.1 }];
    state.ragLoopCount = state.maxRagLoops;
    state.hydeUsed = true;
    const result = await ragQualityGateNode(state, deps);
    expect(result.intent).toBe('refuse');
  });

  it('should_trigger_hyde_when_rag_score_low', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.schemaContext = [{ id: '1', content: 'x', score: 0.1 }];
    state.businessKnowledge = [{ id: '2', content: 'y', score: 0.1 }];
    const result = await ragQualityGateNode(state, deps);
    expect(result.hydeUsed).toBe(true);
    expect(result.ragSearchQuery).toBeTruthy();
  });

  it('should_generate_sql_with_explanation', async () => {
    const deps = mockDeps();
    const state = baseState('sql');
    state.schemaContext = [{ id: '1', content: 'orders amount', score: 0.9 }];
    const result = await generateSqlNode(state, deps);
    expect(result.generatedSql).toContain('SELECT');
    expect(result.currentPhase).toBe('generating');
  });

  it('should_validate_sql_in_both_modes', async () => {
    const deps = mockDeps({
      report: {
        matchTemplates: vi.fn().mockResolvedValue({ results: [] }),
        executeQuery: vi.fn().mockResolvedValue({ ok: true, rows: [], rowCount: 0 }),
        validateSql: vi.fn().mockResolvedValue({
          valid: false,
          errors: [{ message: 'unknown column' }],
        }),
      } as WorkflowDeps['report'],
    });
    const state = baseState('sql');
    state.generatedSql = 'SELECT bad_col FROM orders';
    state.maxValidateRetries = 2;
    const result = await validateResultNode(state, deps);
    expect(result.lastError).toContain('unknown');
    expect(routeAfterValidate({ ...state, ...result })).toBe('generate_sql');
  });

  it('should_execute_report_after_validate', async () => {
    const deps = mockDeps();
    const state = baseState('report');
    state.generatedSql = 'SELECT 1';
    const result = await executeReportNode(state, deps);
    expect(deps.report.executeQuery).toHaveBeenCalled();
    expect(result.executionResult).toBeTruthy();
    expect(routeAfterExecute({ ...state, ...result })).toBe('summarize');
  });

  it('should_retry_report_when_execute_fails', async () => {
    const deps = mockDeps({
      report: {
        matchTemplates: vi.fn().mockResolvedValue({ results: [] }),
        executeQuery: vi.fn().mockResolvedValue({
          ok: false,
          error: { code: 'syntax_error', message: 'SQL 语法错误' },
        }),
        validateSql: vi.fn().mockResolvedValue({ valid: true, errors: [] }),
      } as WorkflowDeps['report'],
    });
    const state = baseState('report');
    state.generatedSql = 'SELECT 1';
    const result = await executeReportNode(state, deps);
    expect(result.lastError).toBeTruthy();
    expect(routeAfterExecute({ ...state, ...result })).toBe('generate_report');
  });

  it('should_refuse_grounding_when_unknown_table', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.schemaContext = [{ id: '1', content: 'orders amount', score: 0.9 }];
    state.generatedSql = 'SELECT * FROM phantom_table';
    const result = await groundingCheckNode(state, deps);
    expect(result.intent).toBe('refuse');
    expect(routeAfterGrounding({ ...state, ...result })).toBe('refuse');
  });

  it('should_summarize_report_results', async () => {
    const deps = mockDeps();
    const state = baseState('report');
    state.generatedSql = 'SELECT 1';
    state.generatedContent = '报表说明';
    state.executionResult = { rows: [{ cnt: 1 }], rowCount: 1 };
    const result = await summarizeResultNode(state, deps);
    expect(result.generatedContent).toContain('报表说明');
  });

  it('should_stream_clarify_question', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.clarifyQuestion = '请补充时间范围';
    const result = await clarifyNode(state, deps);
    expect(result.status).toBe('completed');
    expect(result.generatedContent).toContain('时间范围');
  });

  it('should_refuse_with_reason_in_refuse_node', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.refuseReason = '越权访问';
    const result = await refuseNode(state, deps);
    expect(result.status).toBe('failed');
    expect(result.generatedContent).toContain('越权');
  });

  it('should_stream_direct_answer', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.directAnswer = '您好，我是灵析助手。';
    const result = await directAnswerNode(state, deps);
    expect(result.status).toBe('completed');
    expect(result.generatedContent).toContain('灵析');
  });

  it('should_interrupt_when_signal_set', async () => {
    const deps = mockDeps({ signal: { isInterrupted: () => true } });
    const result = await loadContextNode(baseState(), deps);
    expect(result.status).toBe('interrupted');
  });
});

describe('workflow end-to-end contract', () => {
  it('should_complete_report_mode_when_execution_succeeds', async () => {
    const deps = mockDeps();
    const initial = baseState('report');
    const final = await runWorkflow(initial, deps);
    expect(final.status).toBe('completed');
    expect(final.executionResult).toBeTruthy();
  });

  it('should_complete_sql_mode_without_execute', async () => {
    const deps = mockDeps();
    const initial = baseState('sql');
    const final = await runWorkflow(initial, deps);
    expect(final.status).toBe('completed');
    expect(final.generatedSql).toContain('SELECT');
    expect(deps.report.executeQuery).not.toHaveBeenCalled();
  });
});
