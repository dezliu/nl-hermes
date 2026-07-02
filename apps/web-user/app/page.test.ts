import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PHASE_LABEL,
  TEMPLATE_MATCH_DEBOUNCE_MS,
  buildTemplatePrompt,
  parseSseEvent,
  pickTopTemplate,
  toTemplateParameters,
} from './chat-utils';
import { loadStoredDatasourceId, storeDatasourceId } from './api';

describe('web-user chat-utils', () => {
  it('maps all PRD stream phases', () => {
    expect(Object.keys(PHASE_LABEL)).toEqual(['understanding', 'retrieving', 'generating']);
  });

  it('parses sse payload', () => {
    const raw = 'data: {"type":"phase","phase":"understanding"}\n\n';
    const event = parseSseEvent(raw) as { type: string; phase: string };
    expect(event.type).toBe('phase');
    expect(event.phase).toBe('understanding');
  });

  it('parses thinking and step sse events', () => {
    const thinking = parseSseEvent('data: {"type":"thinking","content":"分析中"}') as {
      type: string;
      content: string;
    };
    expect(thinking.type).toBe('thinking');
    expect(thinking.content).toBe('分析中');

    const step = parseSseEvent('data: {"type":"step","step":"校验 SQL","detail":"EXPLAIN"}') as {
      type: string;
      step: string;
    };
    expect(step.type).toBe('step');
    expect(step.step).toBe('校验 SQL');
  });

  it('uses 2s debounce for template recommendation', () => {
    expect(TEMPLATE_MATCH_DEBOUNCE_MS).toBe(2000);
  });

  it('builds mode-specific template prompt', () => {
    expect(buildTemplatePrompt('sql')).toContain('SQL 模板');
    expect(buildTemplatePrompt('report')).toContain('报表模板');
  });

  it('converts parameter list to record', () => {
    expect(toTemplateParameters([{ key: 'start_date', value: '2026-01-01' }])).toEqual({
      start_date: '2026-01-01',
    });
  });

  it('picks top template recommendation', () => {
    expect(
      pickTopTemplate([
        { id: '1', name: 'A', scenarioDescription: 'x', score: 0.9, type: 'sql' },
        { id: '2', name: 'B', scenarioDescription: 'y', score: 0.8, type: 'sql' },
      ])?.id,
    ).toBe('1');
  });
});

describe('datasource preference storage', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and loads datasource id', () => {
    storeDatasourceId('ds-abc');
    expect(loadStoredDatasourceId()).toBe('ds-abc');
    storeDatasourceId(undefined);
    expect(loadStoredDatasourceId()).toBeUndefined();
  });
});
