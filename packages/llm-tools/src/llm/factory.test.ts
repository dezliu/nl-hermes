import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLlmProviderFromEnv } from './factory.js';
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
});
