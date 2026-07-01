import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS } from './registry.js';

describe('TOOL_DEFINITIONS', () => {
  it('defines core tools', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('execute_report_query');
    expect(names).toContain('retrieve_metadata');
  });
});
