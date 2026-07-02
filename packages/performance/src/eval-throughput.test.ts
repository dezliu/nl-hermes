import { describe, it, expect } from 'vitest';
import {
  PERF_BUDGETS,
  assertEvalBatchWithinBudget,
  estimateEvalBatchDurationMs,
} from '@hermes/observability';

describe('eval batch throughput SLA acceptance', () => {
  it('should_meet_100_cases_in_30min_with_recommended_concurrency', () => {
    const caseCount = 100;
    const avgCaseMs = 12_000;
    const concurrency = 8;

    const estimated = estimateEvalBatchDurationMs(caseCount, avgCaseMs, concurrency);
    expect(estimated).toBeLessThanOrEqual(PERF_BUDGETS.eval100CasesMaxMs);
    assertEvalBatchWithinBudget(caseCount, avgCaseMs, concurrency);
  });

  it('should_document_minimum_concurrency_for_18s_per_case', () => {
    const caseCount = 100;
    const perCaseMs = PERF_BUDGETS.evalCaseMaxMs;
    const minConcurrency = Math.ceil(
      (caseCount * perCaseMs) / PERF_BUDGETS.eval100CasesMaxMs,
    );
    expect(minConcurrency).toBeGreaterThanOrEqual(1);

    const estimated = estimateEvalBatchDurationMs(caseCount, perCaseMs, minConcurrency);
    assertEvalBatchWithinBudget(caseCount, perCaseMs, minConcurrency);
    expect(estimated).toBeLessThanOrEqual(PERF_BUDGETS.eval100CasesMaxMs);
  });
});
