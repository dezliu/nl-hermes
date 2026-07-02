import { describe, it, expect } from 'vitest';
import { isSelectOnly, substituteParameters, buildRowLimitError } from '../lib/sql-utils.js';

describe('sql-utils', () => {
  it('substitutes parameters', () => {
    const sql = 'SELECT * FROM orders WHERE region = {{region}}';
    expect(substituteParameters(sql, { region: '华东' })).toContain('华东');
  });

  it('allows select only', () => {
    expect(isSelectOnly('SELECT 1')).toBe(true);
    expect(isSelectOnly('DELETE FROM orders')).toBe(false);
  });

  it('builds row limit error', () => {
    const err = buildRowLimitError(1000);
    expect(err.code).toBe('ROW_LIMIT_EXCEEDED');
    expect(err.suggestion).toBeTruthy();
  });
});
