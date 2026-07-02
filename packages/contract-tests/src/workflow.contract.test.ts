import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  createMockLlmProvider,
  runWorkflow,
} from '@hermes/workflow';
import type { WorkflowDeps } from '@hermes/workflow';
import { createLogger } from '@hermes/shared';
import { vi } from 'vitest';
import {
  loadContextNode,
  intentClassifyNode,
  templateMatchNode,
  ragRetrieveNode,
  ragQualityGateNode,
  generateSqlNode,
  generateReportNode,
  validateResultNode,
  refuseNode,
  directAnswerNode,
  routeAfterReport,
  routeAfterValidate,
} from '../../workflow/src/nodes.js';

function mockDeps(overrides: Partial<WorkflowDeps> = {}): WorkflowDeps {
  const events: unknown[] = [];
  return {
    rag: {
      retrieve: vi.fn().mockResolvedValue({
        results: [{ id: 't1', content: 'orders 订单表', score: 0.85 }],
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
        allowedTables: ['orders'],
        allowedFields: ['amount'],
        datasourceId: 'ds1',
      }),
      listQueryLibrary: vi.fn().mockResolvedValue({ items: [] }),
    } as WorkflowDeps['metadata'],
    llm: createMockLlmProvider(),
    logger: createLogger({ service: 'workflow-nodes-test' }),
    emit: (e) => events.push(e),
    signal: { isInterrupted: () => false },
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

describe('workflow node unit tests', () => {
  it('should_load_context_and_emit_understanding_phase', async () => {
    const deps = mockDeps();
    const result = await loadContextNode(baseState(), deps);
    expect(result.rolePrompt?.persona).toBe('分析师');
    expect(result.permissions?.userId).toBe('u1');
    expect(result.currentPhase).toBe('understanding');
  });

  it('should_classify_intent_via_llm', async () => {
    const deps = mockDeps();
    const result = await intentClassifyNode(baseState(), deps);
    expect(result.intent).toBeTruthy();
  });

  it('should_emit_template_cards_when_matches_found', async () => {
    const events: unknown[] = [];
    const deps = mockDeps({ emit: (e) => events.push(e) });
    await templateMatchNode(baseState(), deps);
    expect(events.some((e) => (e as { type?: string }).type === 'templates')).toBe(true);
  });

  it('should_retrieve_three_collections_in_rag_node', async () => {
    const deps = mockDeps();
    await ragRetrieveNode(baseState(), deps);
    expect(deps.rag.retrieve).toHaveBeenCalledTimes(3);
  });

  it('should_refuse_when_rag_score_low_and_loops_exhausted', async () => {
    const deps = mockDeps();
    const state = baseState();
    state.schemaContext = [{ id: '1', content: 'x', score: 0.1 }];
    state.businessKnowledge = [{ id: '2', content: 'y', score: 0.1 }];
    state.ragLoopCount = state.maxRagLoops;
    const result = await ragQualityGateNode(state, deps);
    expect(result.intent).toBe('refuse');
  });

  it('should_generate_sql_with_explanation', async () => {
    const deps = mockDeps();
    const state = baseState('sql');
    state.schemaContext = [{ id: '1', content: 'orders', score: 0.9 }];
    const result = await generateSqlNode(state, deps);
    expect(result.generatedSql).toContain('SELECT');
    expect(result.currentPhase).toBe('generating');
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
    state.schemaContext = [{ id: '1', content: 'orders', score: 0.9 }];
    const result = await generateReportNode(state, deps);
    expect(result.lastError).toBeTruthy();
    expect(result.reportRetryCount).toBe(1);
    expect(routeAfterReport({ ...state, ...result })).toBe('generate_report');
  });

  it('should_validate_sql_in_report_mode', async () => {
    const deps = mockDeps();
    const state = baseState('report');
    state.generatedSql = 'SELECT 1';
    const result = await validateResultNode(state, deps);
    expect(deps.report.validateSql).toHaveBeenCalled();
    expect(routeAfterValidate({ ...state, ...result })).toBe('stream_output');
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
});
