import { describe, it, expect } from 'vitest';
import { sanitizePrompt, summarizeOutput } from './sanitize-prompt.js';

describe('sanitizePrompt', () => {
  it('should_mask_email_and_phone_in_prompt', () => {
    const result = sanitizePrompt('联系 user@test.com 手机 13800138000 查询销售额');
    expect(result).not.toContain('user@test.com');
    expect(result).not.toContain('13800138000');
    expect(result).toContain('[email]');
    expect(result).toContain('[phone]');
  });

  it('should_truncate_long_prompt', () => {
    const long = 'a'.repeat(600);
    const result = sanitizePrompt(long);
    expect(result.length).toBeLessThan(600);
    expect(result).toContain('[truncated]');
  });
});

describe('summarizeOutput', () => {
  it('should_truncate_long_string_output', () => {
    const result = summarizeOutput('x'.repeat(400));
    expect(String(result).length).toBeLessThan(400);
  });
});
