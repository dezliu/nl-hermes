import { describe, it, expect } from 'vitest';
import {
  extractPlaceholders,
  fillTemplateParameters,
  validateTemplateParameters,
} from './template-utils.js';

describe('template-utils', () => {
  it('extracts placeholders from sql body', () => {
    expect(extractPlaceholders('SELECT * FROM orders WHERE dt >= {{start_date}} AND region = {{region}}')).toEqual([
      'start_date',
      'region',
    ]);
  });

  it('fills template parameters', () => {
    const sql = 'SELECT * FROM orders WHERE dt >= {{start_date}}';
    expect(fillTemplateParameters(sql, { start_date: '2026-01-01' })).toBe(
      'SELECT * FROM orders WHERE dt >= 2026-01-01',
    );
  });

  it('throws when parameter missing', () => {
    expect(() => fillTemplateParameters('WHERE id = {{id}}', {})).toThrow('缺少模板参数');
  });

  it('validates required placeholders', () => {
    expect(validateTemplateParameters(['start_date', 'region'], { start_date: '2026-01-01' })).toEqual({
      ok: false,
      missing: ['region'],
    });
    expect(validateTemplateParameters(['start_date'], { start_date: '2026-01-01' })).toEqual({ ok: true });
  });
});
