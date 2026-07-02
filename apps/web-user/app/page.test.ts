import { describe, it, expect } from 'vitest';

const PHASE_LABEL = {
  understanding: '正在理解问题…',
  retrieving: '正在检索相关数据表…',
  generating: '正在生成结果…',
} as const;

describe('web-user chat phases', () => {
  it('maps all PRD stream phases', () => {
    expect(Object.keys(PHASE_LABEL)).toEqual(['understanding', 'retrieving', 'generating']);
  });

  it('parses sse payload', () => {
    const raw = 'data: {"type":"phase","phase":"understanding"}\n\n';
    const event = JSON.parse(raw.replace('data: ', '').trim());
    expect(event.type).toBe('phase');
    expect(event.phase).toBe('understanding');
  });
});
