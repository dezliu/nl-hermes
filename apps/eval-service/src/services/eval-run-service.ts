import type { Logger } from '@hermes/shared';
import type {
  EvalResultRecord,
  EvalRunRecord,
  EvalRunSummary,
  StartEvalRunRequest,
} from '@hermes/contracts';
import {
  EvalCaseRepository,
  EvalResultRepository,
  EvalRunRepository,
  EvalSetRepository,
} from '../repositories/eval-repository.js';
import { EvalCaseRunner } from './eval-case-runner.js';

type RunState = {
  cancelled: boolean;
};

export class EvalRunService {
  private readonly activeRuns = new Map<string, RunState>();

  constructor(
    private readonly sets: EvalSetRepository,
    private readonly cases: EvalCaseRepository,
    private readonly runs: EvalRunRepository,
    private readonly results: EvalResultRepository,
    private readonly runner: EvalCaseRunner,
    private readonly logger: Logger,
  ) {}

  async startRun(body: StartEvalRunRequest, traceId?: string): Promise<EvalRunRecord> {
    const set = await this.sets.findById(body.evalSetId);
    if (!set) throw new Error('eval_set_not_found');
    const caseList = set.cases ?? [];
    if (caseList.length === 0) throw new Error('eval_set_empty');

    const run = await this.runs.insert({
      evalSetId: body.evalSetId,
      status: 'running',
      progress: 0,
      startedBy: body.startedBy ?? null,
      startedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });

    this.activeRuns.set(run.id, { cancelled: false });
    void this.executeRun(run.id, caseList, body.concurrency ?? 3, traceId);
    return this.toRunRecord(run);
  }

  async cancelRun(runId: string): Promise<boolean> {
    const state = this.activeRuns.get(runId);
    if (state) state.cancelled = true;
    const run = await this.runs.findById(runId);
    if (!run || run.status !== 'running') return false;
    await this.runs.patch(runId, {
      status: 'cancelled',
      finishedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });
    return true;
  }

  async getRun(runId: string): Promise<(EvalRunRecord & { results: EvalResultRecord[] }) | null> {
    const run = await this.runs.findById(runId);
    if (!run) return null;
    const caseMap = new Map((await this.cases.listBySet(run.evalSetId)).map((c) => [c.id, c]));
    return {
      ...this.toRunRecord(run),
      results: (run.results ?? []).map((r) => {
        const c = caseMap.get(r.evalCaseId);
        return {
          id: r.id,
          evalRunId: r.evalRunId,
          evalCaseId: r.evalCaseId,
          question: c?.question,
          mode: c?.mode,
          retrievalHit: r.retrievalHit,
          generateSuccess: r.generateSuccess,
          score: r.score != null ? Number(r.score) : null,
          actualOutput: r.actualOutput as Record<string, unknown> | null,
          expectedPoints: c?.expectedPoints,
          diffNotes: r.diffNotes,
        };
      }),
    };
  }

  async listRuns(evalSetId: string): Promise<EvalRunRecord[]> {
    const items = await this.runs.listBySet(evalSetId);
    return items.map((r) => this.toRunRecord(r));
  }

  exportReport(runId: string): Promise<string> {
    return this.buildExport(runId);
  }

  private async executeRun(
    runId: string,
    caseList: { id: string; question: string; mode: 'sql' | 'report'; expectedTables?: string[] | null; expectedPoints?: string | null }[],
    concurrency: number,
    traceId?: string,
  ): Promise<void> {
    const durations: number[] = [];
    let completed = 0;
    const queue = [...caseList];

    const worker = async () => {
      while (queue.length > 0) {
        const state = this.activeRuns.get(runId);
        if (state?.cancelled) return;
        const current = queue.shift();
        if (!current) return;

        try {
          const output = await this.runner.runCase({
            question: current.question,
            mode: current.mode,
            expectedTables: current.expectedTables,
            expectedPoints: current.expectedPoints,
            traceId,
          });
          durations.push(output.durationMs);
          await this.results.insert({
            evalRunId: runId,
            evalCaseId: current.id,
            retrievalHit: output.retrievalHit,
            generateSuccess: output.generateSuccess,
            score: output.score,
            actualOutput: output.actualOutput,
            diffNotes: output.diffNotes,
          });
        } catch (err) {
          await this.results.insert({
            evalRunId: runId,
            evalCaseId: current.id,
            retrievalHit: false,
            generateSuccess: false,
            score: 0,
            actualOutput: { error: err instanceof Error ? err.message : 'run_failed' },
            diffNotes: '执行异常',
          });
        }

        completed += 1;
        const progress = Math.round((completed / caseList.length) * 10000) / 100;
        await this.runs.patch(runId, { progress });
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(concurrency, caseList.length) }, () => worker()));
      const state = this.activeRuns.get(runId);
      if (state?.cancelled) return;

      const resultRows = await this.results.listByRun(runId);
      const summary = this.buildSummary(resultRows, durations);
      await this.runs.patch(runId, {
        status: 'completed',
        progress: 100,
        summary,
        finishedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
      });
      this.logger.info('eval_run.completed', { runId, summary });
    } catch (err) {
      await this.runs.patch(runId, {
        status: 'failed',
        finishedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
        summary: { error: err instanceof Error ? err.message : 'failed' },
      });
      this.logger.error('eval_run.failed', { runId, err: err instanceof Error ? err.message : String(err) });
    } finally {
      this.activeRuns.delete(runId);
    }
  }

  private buildSummary(
    rows: { retrievalHit?: boolean | null; generateSuccess?: boolean | null; score?: number | null }[],
    durations: number[],
  ): EvalRunSummary {
    const total = rows.length;
    const retrievalHits = rows.filter((r) => r.retrievalHit).length;
    const generateSuccess = rows.filter((r) => r.generateSuccess).length;
    const scores = rows.map((r) => Number(r.score ?? 0));
    const averageScore = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
    const lowScoreCount = scores.filter((s) => s < 0.35).length;
    const avgCaseDurationMs =
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return {
      retrievalHitRate: total > 0 ? retrievalHits / total : 0,
      generateSuccessRate: total > 0 ? generateSuccess / total : 0,
      averageScore: Math.round(averageScore * 100) / 100,
      lowScoreCount,
      totalCases: total,
      domainSummary:
        lowScoreCount > total * 0.5 ? `${Math.round((lowScoreCount / total) * 100)}% 低分样本需复盘` : '整体表现稳定',
      avgCaseDurationMs,
    };
  }

  private async buildExport(runId: string): Promise<string> {
    const run = await this.getRun(runId);
    if (!run) throw new Error('not_found');
    const lines = [
      '# 灵析离线评估报告',
      '',
      `- 运行 ID: ${run.id}`,
      `- 状态: ${run.status}`,
      `- 检索命中率: ${((run.summary?.retrievalHitRate ?? 0) * 100).toFixed(1)}%`,
      `- 生成成功率: ${((run.summary?.generateSuccessRate ?? 0) * 100).toFixed(1)}%`,
      `- 平均分: ${run.summary?.averageScore ?? 0}`,
      `- 低分样本: ${run.summary?.lowScoreCount ?? 0}`,
      `- 单条平均耗时(ms): ${run.summary?.avgCaseDurationMs ?? 0}`,
      '',
      '## 样本明细',
    ];
    for (const r of run.results) {
      lines.push(
        '',
        `### ${r.question ?? r.evalCaseId}`,
        `- 模式: ${r.mode ?? '-'}`,
        `- 检索命中: ${r.retrievalHit ? '是' : '否'}`,
        `- 生成成功: ${r.generateSuccess ? '是' : '否'}`,
        `- 评分: ${r.score ?? 0}`,
        `- 差异: ${r.diffNotes ?? ''}`,
      );
    }
    return lines.join('\n');
  }

  private toRunRecord(r: {
    id: string;
    evalSetId: string;
    status: EvalRunRecord['status'];
    progress: number;
    summary?: EvalRunSummary | Record<string, unknown> | null;
    startedBy?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt?: string;
  }): EvalRunRecord {
    return {
      id: r.id,
      evalSetId: r.evalSetId,
      status: r.status,
      progress: Number(r.progress),
      summary: (r.summary as EvalRunSummary | null) ?? null,
      startedBy: r.startedBy,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      createdAt: r.createdAt,
    };
  }
}
