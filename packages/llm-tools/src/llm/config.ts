import type { LlmProviderName, ResolvedLlmConfig } from './types.js';

const PROVIDER_DEFAULTS: Record<
  LlmProviderName,
  { apiKeyEnv: string; baseUrlEnv: string; modelEnv: string; defaultBaseUrl: string; defaultModel: string }
> = {
  openai: {
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrlEnv: 'OPENAI_BASE_URL',
    modelEnv: 'OPENAI_MODEL',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
  },
  aliyun: {
    apiKeyEnv: 'ALIYUN_API_KEY',
    baseUrlEnv: 'ALIYUN_BASE_URL',
    modelEnv: 'ALIYUN_MODEL',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-max',
  },
  zhipu: {
    apiKeyEnv: 'ZHIPU_API_KEY',
    baseUrlEnv: 'ZHIPU_BASE_URL',
    modelEnv: 'ZHIPU_MODEL',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-plus',
  },
};

function normalizeProvider(raw: string | undefined): LlmProviderName {
  const value = (raw ?? 'openai').trim().toLowerCase();
  if (value === 'openai' || value === 'aliyun' || value === 'zhipu') return value;
  console.warn(`[llm] unknown LLM_PROVIDER "${raw}", falling back to openai`);
  return 'openai';
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export function resolveLlmConfig(env: NodeJS.ProcessEnv = process.env): ResolvedLlmConfig {
  const provider = normalizeProvider(env.LLM_PROVIDER);
  const defaults = PROVIDER_DEFAULTS[provider];

  return {
    provider,
    apiKey: (env[defaults.apiKeyEnv] ?? '').trim(),
    baseUrl: trimTrailingSlash(env[defaults.baseUrlEnv] ?? defaults.defaultBaseUrl),
    model: (env[defaults.modelEnv] ?? defaults.defaultModel).trim(),
  };
}
