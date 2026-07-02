import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveLlmConfig } from './config.js';

describe('resolveLlmConfig', () => {
  it('defaults to openai provider', () => {
    const config = resolveLlmConfig({});
    expect(config.provider).toBe('openai');
    expect(config.baseUrl).toBe('https://api.openai.com/v1');
    expect(config.model).toBe('gpt-4o');
  });

  it('resolves aliyun config', () => {
    const config = resolveLlmConfig({
      LLM_PROVIDER: 'aliyun',
      ALIYUN_API_KEY: 'sk-ali',
      ALIYUN_MODEL: 'qwen-max',
    });
    expect(config.provider).toBe('aliyun');
    expect(config.apiKey).toBe('sk-ali');
    expect(config.model).toBe('qwen-max');
    expect(config.baseUrl).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
  });

  it('resolves zhipu config with custom base url', () => {
    const config = resolveLlmConfig({
      LLM_PROVIDER: 'zhipu',
      ZHIPU_API_KEY: 'sk-zp',
      ZHIPU_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4/',
      ZHIPU_MODEL: 'glm-4-plus',
    });
    expect(config.provider).toBe('zhipu');
    expect(config.apiKey).toBe('sk-zp');
    expect(config.baseUrl).toBe('https://open.bigmodel.cn/api/paas/v4');
    expect(config.model).toBe('glm-4-plus');
  });

  it('falls back to openai for unknown provider', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = resolveLlmConfig({ LLM_PROVIDER: 'unknown-vendor' });
    expect(config.provider).toBe('openai');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
