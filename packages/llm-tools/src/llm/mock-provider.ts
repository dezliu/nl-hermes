import type { LlmProvider } from './types.js';

const JAILBREAK_PATTERNS = [/ignore\s+(all\s+)?previous\s+instructions/i, /you\s+are\s+now/i, /扮演/i, /忽略系统/];

function emitThinkingChunks(text: string, onThinking?: (chunk: string) => void): void {
  if (!onThinking) return;
  const chunkSize = 12;
  for (let i = 0; i < text.length; i += chunkSize) {
    onThinking(text.slice(i, i + chunkSize));
  }
}

function resolveTable(schemaContext: unknown[]): string {
  const content = (schemaContext[0] as { content?: string } | undefined)?.content ?? '';
  if (/fund_flow/i.test(content) || schemaContext.some((item) => String((item as { content?: string }).content ?? '').includes('fund_flow'))) {
    return 'fund_flow';
  }
  return content.match(/(\w+)/)?.[1] ?? 'orders';
}

function hasField(schemaContext: unknown[], field: string): boolean {
  return schemaContext.some((item) => String((item as { content?: string }).content ?? '').toLowerCase().includes(field));
}

function resolveDateField(schemaContext: unknown[]): string | null {
  for (const field of ['gmt_create', 'finish_time', 'business_time', 'upload_date']) {
    if (hasField(schemaContext, field)) return field;
  }
  return null;
}

export function createMockLlmProvider(): LlmProvider {
  return {
    async classifyIntent({ query }) {
      if (JAILBREAK_PATTERNS.some((p) => p.test(query))) {
        return { intent: 'refuse', confidence: 0.95, reason: '检测到不安全指令，已拒绝处理。' };
      }
      if (/^(你好|hello|hi)[!！。.]?$/i.test(query.trim())) {
        return {
          intent: 'direct_answer',
          confidence: 0.95,
          answer: '你好！我是灵析智能助手，可以帮你生成 SQL 或报表，请描述你的数据需求。',
        };
      }
      if (query.length < 2) {
        return { intent: 'refuse', confidence: 0.9, reason: '问题过短，请补充更具体的业务描述。' };
      }
      if (/^(查|看|统计)/.test(query) && query.length < 6) {
        return {
          intent: 'needs_generation',
          confidence: 0.6,
          clarifyQuestion: '请补充更具体的信息：需要查询哪张表、什么时间范围或哪些指标？',
        };
      }
      return { intent: 'needs_generation', confidence: 0.9 };
    },

    async rewriteQueries({ query }) {
      return [query, `${query} 相关表字段`, `${query} 统计汇总`];
    },

    async generateHydeDraft({ query, mode }) {
      return `假设查询方案：针对「${query}」，可能涉及 fund_flow 表的 amount、gmt_create 字段，按日期汇总（${mode} 模式）。`;
    },

    async summarizeResult({ query, rowCount, rows }) {
      const preview = rows.slice(0, 3).map((r) => JSON.stringify(r)).join('; ');
      return `针对「${query}」共返回 ${rowCount} 行。样例：${preview || '无数据'}。`;
    },

    async generateSql({ query, schemaContext, errorFeedback, mode, rolePrompt, onThinking }) {
      const table = resolveTable(schemaContext);
      const dateField = resolveDateField(schemaContext);
      const timeFilter = dateField && /近?\s*\d+\s*天|最近/.test(query)
        ? `\nWHERE ${dateField} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
        : '\nWHERE 1=1';
      const sql = `SELECT *\nFROM ${table}${timeFilter} -- ${query.slice(0, 40)}`;
      const roleHint = rolePrompt?.persona ? `（${rolePrompt.persona}）` : '';
      const explanation = errorFeedback
        ? `已根据错误反馈重试生成 SQL${roleHint}，使用上下文中的字段。`
        : `根据检索到的 schema 上下文生成查询${roleHint}（${mode === 'sql' ? 'SQL 模式' : '报表模式'}）。`;
      emitThinkingChunks(JSON.stringify({ sql, explanation }), onThinking);
      return { sql, explanation };
    },

    async generateReport({ query, schemaContext, errorFeedback, rolePrompt, onThinking }) {
      const table = resolveTable(schemaContext);
      const dateField = resolveDateField(schemaContext);
      const sql = dateField
        ? `SELECT DATE(${dateField}) AS dt, COUNT(*) AS cnt\nFROM ${table}\nGROUP BY 1`
        : `SELECT COUNT(*) AS cnt\nFROM ${table}`;
      const roleHint = rolePrompt?.persona ? `（${rolePrompt.persona}）` : '';
      const explanation = errorFeedback
        ? `已根据执行错误重试生成报表查询${roleHint}。`
        : `为问题「${query.slice(0, 30)}」生成报表查询${roleHint}。`;
      emitThinkingChunks(JSON.stringify({ sql, explanation, chartType: 'line' }), onThinking);
      return {
        sql,
        chartType: 'line',
        chartConfig: { xField: 'dt', yField: 'cnt' },
        explanation,
      };
    },
  };
}
