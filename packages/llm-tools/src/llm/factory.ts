import { resolveLlmConfig } from './config.js';
import { createMockLlmProvider } from './mock-provider.js';
import { OpenAiCompatibleClient } from './openai-compatible-client.js';
import { createOpenAiStyleLlmProvider } from './openai-style-provider.js';
import type { LlmProvider } from './types.js';

export { createMockLlmProvider } from './mock-provider.js';
export { resolveLlmConfig } from './config.js';

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

  console.info(`[llm] using provider=${config.provider} model=${config.model} baseUrl=${config.baseUrl}`);
  return createOpenAiStyleLlmProvider(client);
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
