import type { OpenAiCompatibleClient } from './openai-compatible-client.js';
import { createMockLlmProvider } from './mock-provider.js';
import type { LlmProvider, RolePromptInput } from './types.js';

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

function buildSystemPrompt(rolePrompt?: RolePromptInput): string {
  const parts = ['安全约束：仅生成 SELECT 查询；禁止 DDL/DML；仅引用上下文中的表与字段。'];
  if (rolePrompt?.persona) parts.push(`角色设定: ${rolePrompt.persona}`);
  if (rolePrompt?.constraints) parts.push(`系统限制: ${rolePrompt.constraints}`);
  return parts.join('\n\n');
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
              '你是意图分类器。仅返回 JSON：{"intent":"direct_answer"|"needs_generation"|"refuse","confidence":0-1,"reason?":"string","answer?":"string","clarifyQuestion?":"string"}。' +
              '闲聊用 direct_answer；需要查数/SQL/报表用 needs_generation；不安全用 refuse；意图不明确时 needs_generation 且 confidence<0.8 并给出 clarifyQuestion。',
          },
          {
            role: 'user',
            content: `模式: ${input.mode}\n问题: ${input.query}\n历史: ${JSON.stringify(input.history.slice(-4))}`,
          },
        ]);

        const parsed = extractJson(content) as {
          intent?: 'direct_answer' | 'needs_generation' | 'refuse';
          confidence?: number;
          reason?: string;
          answer?: string;
          clarifyQuestion?: string;
        };

        if (
          parsed.intent === 'direct_answer' ||
          parsed.intent === 'needs_generation' ||
          parsed.intent === 'refuse'
        ) {
          return {
            intent: parsed.intent,
            confidence: parsed.confidence ?? 0.85,
            reason: parsed.reason,
            answer: parsed.answer,
            clarifyQuestion: parsed.clarifyQuestion,
          };
        }
        throw new Error('invalid intent json');
      } catch (err) {
        console.warn('[llm] classifyIntent fallback to mock:', err instanceof Error ? err.message : err);
        return fallback.classifyIntent(input);
      }
    },

    async rewriteQueries(input) {
      try {
        const content = await client.chat([
          {
            role: 'system',
            content: '生成 3 条语义检索改写查询。仅返回 JSON：{"queries":["string","string","string"]}。',
          },
          { role: 'user', content: `模式: ${input.mode}\n问题: ${input.query}` },
        ]);
        const parsed = extractJson(content) as { queries?: string[] };
        if (parsed.queries?.length) return parsed.queries.slice(0, 3);
        throw new Error('missing queries');
      } catch {
        return fallback.rewriteQueries(input);
      }
    },

    async generateHydeDraft(input) {
      try {
        const content = await client.chat([
          {
            role: 'system',
            content: '为检索生成一段假设性业务分析草稿（含可能涉及的表/字段/指标），纯文本，100字内。',
          },
          { role: 'user', content: `模式: ${input.mode}\n问题: ${input.query}` },
        ]);
        return content.trim() || (await fallback.generateHydeDraft(input));
      } catch {
        return fallback.generateHydeDraft(input);
      }
    },

    async summarizeResult(input) {
      try {
        const preview = input.rows.slice(0, 50);
        const content = await client.chat([
          {
            role: 'system',
            content: '根据查询结果生成简短自然语言解读，80字内，不要编造上下文中没有的字段。',
          },
          {
            role: 'user',
            content: `问题: ${input.query}\n行数: ${input.rowCount}\n数据样例: ${JSON.stringify(preview.slice(0, 5))}`,
          },
        ]);
        return content.trim();
      } catch {
        return fallback.summarizeResult(input);
      }
    },

    async generateSql(input) {
      try {
        const content = await client.chat([
          {
            role: 'system',
            content:
              `${buildSystemPrompt(input.rolePrompt)}\n\n你是 SQL 生成助手。仅返回 JSON：{"sql":"string","explanation":"string"}。SQL 须为 MySQL 方言，不要 markdown。`,
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
              `${buildSystemPrompt(input.rolePrompt)}\n\n你是报表生成助手。仅返回 JSON：{"sql":"string","chartType":"line"|"bar"|"table","chartConfig":{},"explanation":"string"}。chartConfig 使用 xField/yField 字符串键。`,
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
