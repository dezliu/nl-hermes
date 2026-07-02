import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLlmProviderFromEnv, verifyLlmConnection } from './factory.js';
import { createMockLlmProvider } from './mock-provider.js';

describe('createLlmProviderFromEnv', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mock provider when api key is missing', async () => {
    const llm = createLlmProviderFromEnv({ LLM_PROVIDER: 'openai' });
    const mock = createMockLlmProvider();
    const result = await llm.classifyIntent({ query: '你好', mode: 'sql', history: [] });
    const expected = await mock.classifyIntent({ query: '你好', mode: 'sql', history: [] });
    expect(result).toEqual(expected);
  });

  it('creates real provider when api key is present', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"intent":"needs_generation"}' } }],
      }),
    });

    const { OpenAiCompatibleClient } = await import('./openai-compatible-client.js');
    const { createOpenAiStyleLlmProvider } = await import('./openai-style-provider.js');

    const client = new OpenAiCompatibleClient({
      apiKey: 'sk-test',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const llm = createOpenAiStyleLlmProvider(client);
    const result = await llm.classifyIntent({ query: '查询销售额', mode: 'sql', history: [] });
    expect(result.intent).toBe('needs_generation');
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('selects aliyun env vars when LLM_PROVIDER=aliyun', () => {
    const llm = createLlmProviderFromEnv({
      LLM_PROVIDER: 'aliyun',
      ALIYUN_API_KEY: 'key-ali',
      ALIYUN_MODEL: 'qwen-max',
    });
    expect(llm).toBeDefined();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('provider=aliyun'),
    );
  });

  it('selects zhipu env vars when LLM_PROVIDER=zhipu', () => {
    const llm = createLlmProviderFromEnv({
      LLM_PROVIDER: 'zhipu',
      ZHIPU_API_KEY: 'key-zp',
      ZHIPU_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',
      ZHIPU_MODEL: 'glm-4-plus',
    });
    expect(llm).toBeDefined();
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('provider=zhipu'),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('baseUrl=https://open.bigmodel.cn/api/paas/v4'),
    );
  });
});

describe('verifyLlmConnection', () => {
  it('returns error when api key is missing', async () => {
    const result = await verifyLlmConnection({ LLM_PROVIDER: 'zhipu' });
    expect(result.ok).toBe(false);
    expect(result.provider).toBe('zhipu');
    expect(result.error).toContain('API key');
  });

  it('returns ok when chat succeeds', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"pong":true}' } }] }),
    });
    vi.stubGlobal('fetch', fetchImpl);

    const result = await verifyLlmConnection({
      LLM_PROVIDER: 'zhipu',
      ZHIPU_API_KEY: 'key-zp',
      ZHIPU_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',
      ZHIPU_MODEL: 'glm-4-plus',
    });

    expect(result.ok).toBe(true);
    expect(result.provider).toBe('zhipu');
    vi.unstubAllGlobals();
  });
});
