import { resolveLlmConfig } from './config.js';
import { createMockLlmProvider } from './mock-provider.js';
import { OpenAiCompatibleClient } from './openai-compatible-client.js';
import { createOpenAiStyleLlmProvider } from './openai-style-provider.js';
import type { LlmProvider } from './types.js';

export { createMockLlmProvider } from './mock-provider.js';
export { resolveLlmConfig } from './config.js';

export async function verifyLlmConnection(env: NodeJS.ProcessEnv = process.env): Promise<{
  ok: boolean;
  provider: string;
  model: string;
  error?: string;
}> {
  const config = resolveLlmConfig(env);
  if (!config.apiKey) {
    return { ok: false, provider: config.provider, model: config.model, error: 'API key missing' };
  }

  try {
    const client = new OpenAiCompatibleClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
    });
    await client.chat(
      [
        { role: 'system', content: 'Reply with JSON only: {"pong":true}' },
        { role: 'user', content: 'ping' },
      ],
      { maxTokens: 16 },
    );
    return { ok: true, provider: config.provider, model: config.model };
  } catch (err) {
    return {
      ok: false,
      provider: config.provider,
      model: config.model,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function createLlmProviderFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const config = resolveLlmConfig(env);

  if (!config.apiKey) {
    console.warn(`[llm] no API key for provider "${config.provider}", using mock LLM`);
    return createMockLlmProvider();
  }

  const client = new OpenAiCompatibleClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
  });

  const fastClient =
    config.fastModel && config.fastModel !== config.model
      ? new OpenAiCompatibleClient({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.fastModel,
        })
      : undefined;

  console.info(`[llm] using provider=${config.provider} model=${config.model} baseUrl=${config.baseUrl}`);
  if (fastClient) {
    console.info(`[llm] fast model=${config.fastModel} for classify/rewrite`);
  }

  if (env.LLM_HEALTHCHECK === 'true') {
    void verifyLlmConnection(env).then((result) => {
      if (result.ok) {
        console.info(`[llm] healthcheck ok provider=${result.provider} model=${result.model}`);
      } else {
        console.error(`[llm] healthcheck failed provider=${result.provider}: ${result.error}`);
      }
    });
  }

  return createOpenAiStyleLlmProvider(client, fastClient);
}

/** @deprecated Use createLlmProviderFromEnv() */
export function createOpenAiLlmProvider(apiKey: string, model: string): LlmProvider {
  if (!apiKey) return createMockLlmProvider();
  const client = new OpenAiCompatibleClient({
    apiKey,
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    model,
  });
  return createOpenAiStyleLlmProvider(client);
}
