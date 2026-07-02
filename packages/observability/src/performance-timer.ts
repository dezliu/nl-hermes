import { createHash } from 'node:crypto';
import type { Logger } from '@hermes/shared';

export type PerformanceTimerResult = {
  label: string;
  durationMs: number;
  success: boolean;
};

export class PerformanceTimer {
  private readonly start = Date.now();

  constructor(
    private readonly label: string,
    private readonly logger?: Logger,
  ) {}

  end(success = true): PerformanceTimerResult {
    const durationMs = Date.now() - this.start;
    this.logger?.info('performance.timer', {
      operation: this.label,
      durationMs,
      success,
    });
    return { label: this.label, durationMs, success };
  }
}

export function startTimer(label: string, logger?: Logger): PerformanceTimer {
  return new PerformanceTimer(label, logger);
}

export type MetricCounter = {
  increment(name: string, value?: number): void;
  snapshot(): Record<string, number>;
};

export function createInMemoryMetrics(): MetricCounter {
  const counters = new Map<string, number>();

  return {
    increment(name: string, value = 1) {
      counters.set(name, (counters.get(name) ?? 0) + value);
    },
    snapshot() {
      return Object.fromEntries(counters.entries());
    },
  };
}

export function hashForTrace(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}
