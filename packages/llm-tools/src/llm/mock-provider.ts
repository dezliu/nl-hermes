import type { LlmProvider } from './types.js';

const JAILBREAK_PATTERNS = [/ignore\s+(all\s+)?previous\s+instructions/i, /you\s+are\s+now/i, /扮演/i, /忽略系统/];

export function createMockLlmProvider(): LlmProvider {
  return {
    async classifyIntent({ query }) {
      if (JAILBREAK_PATTERNS.some((p) => p.test(query))) {
        return { intent: 'refuse', reason: '检测到不安全指令，已拒绝处理。' };
      }
      if (/^(你好|hello|hi)[!！。.]?$/i.test(query.trim())) {
        return { intent: 'direct_answer', answer: '你好！我是灵析智能助手，可以帮你生成 SQL 或报表，请描述你的数据需求。' };
      }
      if (query.length < 2) {
        return { intent: 'refuse', reason: '问题过短，请补充更具体的业务描述。' };
      }
      return { intent: 'needs_generation' };
    },

    async generateSql({ query, schemaContext, errorFeedback, mode }) {
      const table = (schemaContext[0] as { content?: string } | undefined)?.content?.match(/表[:：]\s*(\w+)/)?.[1] ?? 'orders';
      const sql = `SELECT *\nFROM ${table}\nWHERE 1=1 -- ${query.slice(0, 40)}`;
      const explanation = errorFeedback
        ? `已根据错误反馈重试生成 SQL（${mode === 'sql' ? 'SQL 模式' : '报表模式'}）。`
        : `根据检索到的 schema 上下文生成查询（${mode === 'sql' ? 'SQL 模式' : '报表模式'}）。`;
      return { sql, explanation };
    },

    async generateReport({ query, schemaContext, errorFeedback }) {
      const table = (schemaContext[0] as { content?: string } | undefined)?.content?.match(/表[:：]\s*(\w+)/)?.[1] ?? 'orders';
      const sql = `SELECT DATE(created_at) AS dt, COUNT(*) AS cnt\nFROM ${table}\nGROUP BY 1`;
      const explanation = errorFeedback
        ? '已根据执行错误重试生成报表查询。'
        : `为问题「${query.slice(0, 30)}」生成报表查询。`;
      return {
        sql,
        chartType: 'line',
        chartConfig: { xField: 'dt', yField: 'cnt' },
        explanation,
      };
    },
  };
}
