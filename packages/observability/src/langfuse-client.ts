import Langfuse from 'langfuse';
import type { Logger } from '@hermes/shared';
import { sanitizePrompt, summarizeOutput } from './sanitize-prompt.js';

export type LangfuseConfig = {
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
  enabled?: boolean;
};

export type TraceContext = {
  traceId: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
};

export type GenerationUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type AiTracer = {
  enabled: boolean;
  traceGeneration<T>(input: {
    name: string;
    model: string;
    prompt: string;
    invoke: () => Promise<T>;
    mapOutput?: (output: T) => unknown;
    mapUsage?: (output: T) => GenerationUsage | undefined;
  }): Promise<T>;
  traceSpan<T>(input: {
    name: string;
    input?: unknown;
    invoke: () => Promise<T>;
    mapOutput?: (output: T) => unknown;
  }): Promise<T>;
  flush(): Promise<void>;
};

class NoopAiTracer implements AiTracer {
  readonly enabled = false;

  async traceGeneration<T>(input: { invoke: () => Promise<T> }): Promise<T> {
    return input.invoke();
  }

  async traceSpan<T>(input: { invoke: () => Promise<T> }): Promise<T> {
    return input.invoke();
  }

  async flush(): Promise<void> {
    /* noop */
  }
}

class LangfuseAiTracer implements AiTracer {
  readonly enabled = true;

  constructor(
    private readonly client: Langfuse,
    private readonly ctx: TraceContext,
    private readonly logger: Logger,
  ) {}

  async traceGeneration<T>(input: {
    name: string;
    model: string;
    prompt: string;
    invoke: () => Promise<T>;
    mapOutput?: (output: T) => unknown;
    mapUsage?: (output: T) => GenerationUsage | undefined;
  }): Promise<T> {
    const trace = this.client.trace({
      id: this.ctx.traceId,
      userId: this.ctx.userId,
      sessionId: this.ctx.sessionId,
      name: input.name,
      tags: this.ctx.tags,
    });

    const generation = trace.generation({
      name: input.name,
      model: input.model,
      input: sanitizePrompt(input.prompt),
    });

    const started = Date.now();
    try {
      const output = await input.invoke();
      const usage = input.mapUsage?.(output);
      generation.end({
        output: summarizeOutput(input.mapOutput?.(output) ?? output),
        usage: usage
          ? {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            }
          : undefined,
      });
      this.logger.info('langfuse.generation.succeeded', {
        traceId: this.ctx.traceId,
        operation: input.name,
        model: input.model,
        durationMs: Date.now() - started,
      });
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      generation.end({ level: 'ERROR', statusMessage: message });
      this.logger.error('langfuse.generation.failed', {
        traceId: this.ctx.traceId,
        operation: input.name,
        model: input.model,
        durationMs: Date.now() - started,
        err: message,
      });
      throw err;
    }
  }

  async traceSpan<T>(input: {
    name: string;
    input?: unknown;
    invoke: () => Promise<T>;
    mapOutput?: (output: T) => unknown;
  }): Promise<T> {
    const trace = this.client.trace({
      id: this.ctx.traceId,
      userId: this.ctx.userId,
      sessionId: this.ctx.sessionId,
      name: input.name,
      tags: this.ctx.tags,
    });

    const span = trace.span({
      name: input.name,
      input: input.input,
    });

    const started = Date.now();
    try {
      const output = await input.invoke();
      span.end({ output: summarizeOutput(input.mapOutput?.(output) ?? output) });
      this.logger.info('langfuse.span.succeeded', {
        traceId: this.ctx.traceId,
        operation: input.name,
        durationMs: Date.now() - started,
      });
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      span.end({ level: 'ERROR', statusMessage: message });
      this.logger.error('langfuse.span.failed', {
        traceId: this.ctx.traceId,
        operation: input.name,
        durationMs: Date.now() - started,
        err: message,
      });
      throw err;
    }
  }

  async flush(): Promise<void> {
    await this.client.flushAsync();
  }
}

export function createLangfuseClient(config: LangfuseConfig = {}): Langfuse | null {
  const publicKey = config.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = config.secretKey ?? process.env.LANGFUSE_SECRET_KEY;
  const baseUrl = config.baseUrl ?? process.env.LANGFUSE_HOST ?? 'http://localhost:3000';
  const enabled = config.enabled ?? Boolean(publicKey && secretKey);

  if (!enabled || !publicKey || !secretKey) {
    return null;
  }

  return new Langfuse({ publicKey, secretKey, baseUrl });
}

export function createAiTracer(
  ctx: TraceContext,
  logger: Logger,
  config?: LangfuseConfig,
): AiTracer {
  const client = createLangfuseClient(config);
  if (!client) {
    return new NoopAiTracer();
  }
  return new LangfuseAiTracer(client, ctx, logger);
}

export function loadLangfuseConfigFromEnv(): LangfuseConfig {
  return {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: process.env.LANGFUSE_HOST,
    enabled: Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY),
  };
}
