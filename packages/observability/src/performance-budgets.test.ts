import { describe, it, expect } from 'vitest';
import {
  PERF_BUDGETS,
  assertWithinBudget,
  assertEvalBatchWithinBudget,
  estimateEvalBatchDurationMs,
  PerformanceBudgetError,
} from './performance-budgets.js';

describe('performance budgets', () => {
  it('should_pass_when_duration_within_rag_budget', () => {
    expect(() => assertWithinBudget(4800, PERF_BUDGETS.ragRetrieveMaxMs, 'rag.retrieve')).not.toThrow();
  });

  it('should_throw_when_duration_exceeds_first_token_budget', () => {
    expect(() => assertWithinBudget(3500, PERF_BUDGETS.firstTokenMaxMs, 'chat.first_token')).toThrow(
      PerformanceBudgetError,
    );
  });

  it('should_estimate_eval_batch_with_concurrency', () => {
    const duration = estimateEvalBatchDurationMs(100, 15000, 5);
    expect(duration).toBe(300_000);
    expect(() => assertEvalBatchWithinBudget(100, 15000, 5)).not.toThrow();
  });

  it('should_fail_eval_batch_when_too_slow', () => {
    expect(() => assertEvalBatchWithinBudget(100, 20000, 1)).toThrow(PerformanceBudgetError);
  });
});
