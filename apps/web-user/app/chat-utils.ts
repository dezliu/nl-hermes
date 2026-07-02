import type { TemplateMatchResult } from '@hermes/contracts';

export const PHASE_LABEL = {
  understanding: '正在理解问题…',
  retrieving: '正在检索相关数据表…',
  generating: '正在生成结果…',
} as const;

export type Phase = keyof typeof PHASE_LABEL | 'idle';

export type WorkflowStep = {
  step: string;
  detail?: string;
};

export const TEMPLATE_MATCH_DEBOUNCE_MS = 2000;

export function buildTemplatePrompt(mode: 'sql' | 'report'): string {
  return mode === 'sql'
    ? '检测到已有相似 SQL 模板，是否直接套用？'
    : '检测到已有相似报表模板，是否直接套用？';
}

export function parseSseEvent(raw: string): unknown {
  const line = raw.trim();
  if (!line.startsWith('data:')) return null;
  return JSON.parse(line.slice(5).trim());
}

export function toTemplateParameters(items: { key: string; value: string }[]): Record<string, string> {
  return items.reduce<Record<string, string>>((acc, item) => {
    if (item.key.trim()) acc[item.key.trim()] = item.value;
    return acc;
  }, {});
}

export function pickTopTemplate(results: TemplateMatchResult[]): TemplateMatchResult | null {
  return results[0] ?? null;
}

export function formatConversationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
