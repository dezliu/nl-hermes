import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '@hermes/shared';
import { createAiTracer } from './langfuse-client.js';
import { startTimer, createInMemoryMetrics } from './performance-timer.js';

describe('createAiTracer', () => {
  it('should_run_invoke_without_langfuse_keys', async () => {
    const logger = createLogger({ service: 'observability-test' });
    const tracer = createAiTracer(
      { traceId: 'trace-1', userId: 'u1' },
      logger,
      { enabled: false },
    );

    expect(tracer.enabled).toBe(false);
    const result = await tracer.traceGeneration({
      name: 'sql-generation',
      model: 'mock',
      prompt: '查询销售额',
      invoke: async () => ({ sql: 'SELECT 1' }),
    });
    expect(result.sql).toBe('SELECT 1');
  });

  it('should_trace_span_in_noop_mode', async () => {
    const logger = createLogger({ service: 'observability-test' });
    const tracer = createAiTracer({ traceId: 'trace-2' }, logger, { enabled: false });
    const value = await tracer.traceSpan({
      name: 'rag.retrieve',
      invoke: async () => ({ score: 0.9 }),
    });
    expect(value.score).toBe(0.9);
  });
});

describe('performance timer', () => {
  it('should_record_duration', () => {
    vi.useFakeTimers();
    const logger = createLogger({ service: 'observability-test' });
    const info = vi.spyOn(logger, 'info');
    const timer = startTimer('rag.retrieve', logger);
    vi.advanceTimersByTime(120);
    const result = timer.end(true);
    expect(result.durationMs).toBe(120);
    expect(info).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should_increment_metrics', () => {
    const metrics = createInMemoryMetrics();
    metrics.increment('report.generate.success');
    metrics.increment('report.generate.success');
    metrics.increment('report.generate.failure');
    expect(metrics.snapshot()).toEqual({
      'report.generate.success': 2,
      'report.generate.failure': 1,
    });
  });
});
