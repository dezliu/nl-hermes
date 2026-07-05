import { describe, it, expect, vi } from 'vitest';
import { createInitialState } from './state.js';
import { analyzeReportNode, composeSpecNode } from './nodes.js';
import type { WorkflowDeps } from './types.js';
import { createLogger } from '@hermes/shared';
import { createMockLlmProvider } from '@hermes/llm-tools';
import { createDefaultDashboardLayout } from '@hermes/contracts';

function mockDeps(overrides: Partial<WorkflowDeps> = {}): WorkflowDeps {
  const events: unknown[] = [];
  return {
    rag: {} as WorkflowDeps['rag'],
    report: {
      matchTemplates: vi.fn(),
      executeQuery: vi.fn(),
      validateSql: vi.fn(),
      renderReport: vi.fn(),
    } as WorkflowDeps['report'],
    metadata: {} as WorkflowDeps['metadata'],
    llm: createMockLlmProvider(),
    logger: createLogger({ service: 'workflow-dashboard-test' }),
    emit: (e) => events.push(e),
    signal: { isInterrupted: () => false },
    datasourceId: 'ds1',
    ...overrides,
  };
}

describe('dashboard workflow nodes', () => {
  it('analyzeReportNode uses analyzeDashboardLayout for dashboard format', async () => {
    const llm = createMockLlmProvider();
    const analyzeDashboardLayout = vi.spyOn(llm, 'analyzeDashboardLayout');
    const deps = mockDeps({ llm });

    const state = createInitialState({
      sessionId: 's1',
      runId: 'r1',
      userId: 'u1',
      mode: 'report',
      query: '近7日资金流水大屏',
      checkpointId: 'c1',
      outputFormat: 'dashboard',
    });
    state.mode = 'report';
    state.generatedSql = 'SELECT 1';
    state.executionResult = {
      rows: [{ dt: '2026-01-01', amount: 100 }],
      rowCount: 1,
    };
    state.chartConfig = { chartType: 'line', xField: 'dt', yField: 'amount' };

    const result = await analyzeReportNode(state, deps);
    expect(analyzeDashboardLayout).toHaveBeenCalled();
    expect(result.reportAnalysis?.layout).toBeDefined();
    expect(result.reportAnalysis?.recommendedCharts?.length).toBeGreaterThan(0);
  });

  it('composeSpecNode attaches layout for dashboard output', async () => {
    const deps = mockDeps();
    const layout = createDefaultDashboardLayout(2, '测试大屏');

    const state = createInitialState({
      sessionId: 's1',
      runId: 'r1',
      userId: 'u1',
      mode: 'report',
      query: '测试大屏',
      checkpointId: 'c1',
      outputFormat: 'dashboard',
    });
    state.mode = 'report';
    state.generatedSql = 'SELECT 1';
    state.executionResult = { rows: [{ amount: 1 }], rowCount: 1 };
    state.reportAnalysis = {
      title: '测试大屏',
      summary: '摘要',
      insights: [],
      dataSources: [],
      recommendedCharts: [
        { chartType: 'line', chartConfig: { xField: 'dt', yField: 'amount' } },
        { chartType: 'bar', chartConfig: { xField: 'dt', yField: 'amount' } },
      ],
      layout,
    };

    const result = await composeSpecNode(state, deps);
    expect(result.reportSpec?.outputFormat).toBe('dashboard');
    expect(result.reportSpec?.layout?.panels.length).toBeGreaterThan(0);
    expect(result.reportSpec?.charts).toHaveLength(2);
  });
});
