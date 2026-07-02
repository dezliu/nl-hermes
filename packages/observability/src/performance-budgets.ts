/** PRD 5.1 / 架构 Phase 9 性能验收预算（毫秒） */
export const PERF_BUDGETS = {
  /** RAG 检索管线单次上限 */
  ragRetrieveMaxMs: 5_000,
  /** 流式首字/首阶段事件上限 */
  firstTokenMaxMs: 3_000,
  /** 100 条离线评估跑批上限（30 分钟） */
  eval100CasesMaxMs: 30 * 60 * 1_000,
  /** 单条评估用例建议上限（用于并发推算） */
  evalCaseMaxMs: 18_000,
} as const;

export type PerfBudgetKey = keyof typeof PERF_BUDGETS;

export class PerformanceBudgetError extends Error {
  readonly label: string;
  readonly durationMs: number;
  readonly budgetMs: number;

  constructor(label: string, durationMs: number, budgetMs: number) {
    super(`${label} exceeded budget: ${durationMs}ms > ${budgetMs}ms`);
    this.name = 'PerformanceBudgetError';
    this.label = label;
    this.durationMs = durationMs;
    this.budgetMs = budgetMs;
  }
}

export function assertWithinBudget(
  durationMs: number,
  budgetMs: number,
  label: string,
): void {
  if (durationMs > budgetMs) {
    throw new PerformanceBudgetError(label, durationMs, budgetMs);
  }
}

/** 根据并发度估算 100 条评估是否能在预算内完成 */
export function estimateEvalBatchDurationMs(caseCount: number, avgCaseMs: number, concurrency: number): number {
  const workers = Math.max(1, concurrency);
  const batches = Math.ceil(caseCount / workers);
  return batches * avgCaseMs;
}

export function assertEvalBatchWithinBudget(
  caseCount: number,
  avgCaseMs: number,
  concurrency: number,
): void {
  const estimated = estimateEvalBatchDurationMs(caseCount, avgCaseMs, concurrency);
  assertWithinBudget(estimated, PERF_BUDGETS.eval100CasesMaxMs, 'eval.batch.100cases');
}
