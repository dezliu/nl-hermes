import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS, createRagClient, createReportClient, createMetadataClient } from './index.js';

describe('llm-tools', () => {
  it('defines core tools', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('execute_report_query');
    expect(names).toContain('retrieve_metadata');
    expect(names).toContain('validate_sql');
  });

  it('creates HTTP clients', () => {
    const rag = createRagClient('http://localhost:4020');
    const report = createReportClient('http://localhost:4030');
    const metadata = createMetadataClient('http://localhost:4050');
    expect(rag).toBeTruthy();
    expect(report).toBeTruthy();
    expect(metadata).toBeTruthy();
  });
});
