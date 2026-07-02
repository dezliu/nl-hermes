import { describe, it, expect } from 'vitest';
import { formatPercent, trendDirection, adminAlertUrl } from './lib/api';

describe('monitor utils', () => {
  it('formats percent', () => {
    expect(formatPercent(0.256)).toBe('25.6%');
  });

  it('detects trend direction', () => {
    expect(trendDirection(0.3, 0.2)).toBe('up');
    expect(trendDirection(0.2, 0.3)).toBe('down');
    expect(trendDirection(0.2, 0.2)).toBe('flat');
  });

  it('builds admin alert url with basePath', () => {
    expect(adminAlertUrl('abc-123')).toBe('http://localhost:3002/admin/alerts?id=abc-123');
  });
});
