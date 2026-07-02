import type { OpenAiCompatibleClient } from './openai-compatible-client.js';
import { createMockLlmProvider } from './mock-provider.js';
import type { LlmProvider } from './types.js';

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  return JSON.parse(raw);
}

function contextSummary(items: unknown[]): string {
  if (!items.length) return '（无）';
  return items
    .slice(0, 8)
    .map((item, i) => {
      if (typeof item === 'string') return `${i + 1}. ${item}`;
      if (item && typeof item === 'object' && 'content' in item) {
        return `${i + 1}. ${String((item as { content: unknown }).content)}`;
      }
      return `${i + 1}. ${JSON.stringify(item)}`;
    })
    .join('\n');
}

export function createOpenAiStyleLlmProvider(client: OpenAiCompatibleClient): LlmProvider {
  const fallback = createMockLlmProvider();

  return {
    async classifyIntent(input) {
      try {
        const content = await client.chat([
          {
            role: 'system',
            content:
              '你是意图分类器。仅返回 JSON：{"intent":"direct_answer"|"needs_generation"|"refuse","reason?":"string","answer?":"string"}。' +
              '闲聊或可直接回答的简单问题用 direct_answer；需要查数/SQL/报表用 needs_generation；不安全或无法理解用 refuse。',
          },
          {
            role: 'user',
            content: `模式: ${input.mode}\n问题: ${input.query}\n历史: ${JSON.stringify(input.history.slice(-4))}`,
          },
        ]);

        const parsed = extractJson(content) as {
          intent?: 'direct_answer' | 'needs_generation' | 'refuse';
          reason?: string;
          answer?: string;
        };

        if (
          parsed.intent === 'direct_answer' ||
          parsed.intent === 'needs_generation' ||
          parsed.intent === 'refuse'
        ) {
          return {
            intent: parsed.intent,
            reason: parsed.reason,
            answer: parsed.answer,
          };
        }
        throw new Error('invalid intent json');
      } catch (err) {
        console.warn('[llm] classifyIntent fallback to mock:', err instanceof Error ? err.message : err);
        return fallback.classifyIntent(input);
      }
    },

    async generateSql(input) {
      try {
        const content = await client.chat([
          {
            role: 'system',
            content:
              '你是 SQL 生成助手。仅返回 JSON：{"sql":"string","explanation":"string"}。SQL 须为 MySQL 方言，不要 markdown。',
          },
          {
            role: 'user',
            content: [
              `用户问题: ${input.query}`,
              `模式: ${input.mode}`,
              `Schema:\n${contextSummary(input.schemaContext)}`,
              `业务知识:\n${contextSummary(input.businessKnowledge)}`,
              `示例:\n${contextSummary(input.examples)}`,
              input.errorFeedback ? `上次错误: ${input.errorFeedback}` : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ]);

        const parsed = extractJson(content) as { sql?: string; explanation?: string };
        if (!parsed.sql) throw new Error('missing sql field');
        return {
          sql: parsed.sql,
          explanation: parsed.explanation ?? '已生成 SQL。',
        };
      } catch (err) {
        console.warn('[llm] generateSql fallback to mock:', err instanceof Error ? err.message : err);
        return fallback.generateSql(input);
      }
    },

    async generateReport(input) {
      try {
        const content = await client.chat([
          {
            role: 'system',
            content:
              '你是报表生成助手。仅返回 JSON：{"sql":"string","chartType":"line"|"bar"|"table","chartConfig":{},"explanation":"string"}。' +
              'chartConfig 使用 xField/yField 字符串键。',
          },
          {
            role: 'user',
            content: [
              `用户问题: ${input.query}`,
              `Schema:\n${contextSummary(input.schemaContext)}`,
              `业务知识:\n${contextSummary(input.businessKnowledge)}`,
              `示例:\n${contextSummary(input.examples)}`,
              input.errorFeedback ? `上次错误: ${input.errorFeedback}` : '',
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ]);

        const parsed = extractJson(content) as {
          sql?: string;
          chartType?: 'line' | 'bar' | 'table';
          chartConfig?: Record<string, string>;
          explanation?: string;
        };
        if (!parsed.sql) throw new Error('missing sql field');
        return {
          sql: parsed.sql,
          chartType: parsed.chartType ?? 'line',
          chartConfig: parsed.chartConfig ?? { xField: 'dt', yField: 'cnt' },
          explanation: parsed.explanation ?? '已生成报表查询。',
        };
      } catch (err) {
        console.warn('[llm] generateReport fallback to mock:', err instanceof Error ? err.message : err);
        return fallback.generateReport(input);
      }
    },
  };
}
