import { describe, it, expect } from 'vitest';
import { scoreLabel } from '../lib/api';

describe('web-admin api helpers', () => {
  it('maps score labels', () => {
    expect(scoreLabel(0.8)).toBe('高');
    expect(scoreLabel(0.4)).toBe('中');
    expect(scoreLabel(0.1)).toBe('低');
  });
});
