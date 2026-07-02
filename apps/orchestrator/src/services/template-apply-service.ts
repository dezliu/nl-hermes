import type { ChatStreamEvent, TemplateDetail } from '@hermes/contracts';
import { createReportClient } from '@hermes/llm-tools';
import { fillTemplateParameters, validateTemplateParameters } from '../lib/template-utils.js';
import type { MetadataTemplateClient } from '../lib/metadata-template-client.js';

export type TemplateApplyInput = {
  mode: 'sql' | 'report';
  query: string;
  templateId: string;
  templateType: 'sql' | 'report';
  templateParameters: Record<string, string>;
  traceId?: string;
  datasourceId?: string;
};

export class TemplateApplyService {
  constructor(private readonly metadataTemplates: MetadataTemplateClient) {}

  async loadTemplate(type: 'sql' | 'report', id: string): Promise<TemplateDetail | null> {
    return this.metadataTemplates.getTemplate(type, id);
  }

  async run(
    input: TemplateApplyInput,
    emit: (event: ChatStreamEvent) => void,
  ): Promise<{ content: string; sql?: string; chartConfig?: Record<string, unknown> }> {
    const template = await this.loadTemplate(input.templateType, input.templateId);
    if (!template) {
      throw Object.assign(new Error('模板不存在或已下线'), { code: 'TEMPLATE_NOT_FOUND' });
    }

    const validation = validateTemplateParameters(template.placeholders, input.templateParameters);
    if (!validation.ok) {
      throw Object.assign(new Error(`请填写模板参数: ${validation.missing.join(', ')}`), {
        code: 'MISSING_TEMPLATE_PARAM',
      });
    }

    const filledSql = fillTemplateParameters(template.sqlBody, input.templateParameters);

    emit({ type: 'phase', phase: 'understanding' });
    emit({ type: 'chunk', content: `已套用模板「${template.name}」，正在生成结果…\n` });

    if (input.mode === 'sql') {
      emit({ type: 'phase', phase: 'generating' });
      const content = `基于模板「${template.name}」生成 SQL：\n\n\`\`\`sql\n${filledSql}\n\`\`\``;
      emit({ type: 'chunk', content });
      return { content, sql: filledSql };
    }

    emit({ type: 'phase', phase: 'generating' });
    const report = createReportClient(process.env.REPORT_SERVICE_URL, input.traceId);
    const exec = await report.executeQuery({
      sql: filledSql,
      datasourceId: input.datasourceId ?? 'default',
      parameters: input.templateParameters,
    });

    if (!exec.ok || exec.error) {
      throw Object.assign(new Error(exec.error?.message ?? '报表执行失败'), { code: exec.error?.code ?? 'REPORT_FAILED' });
    }

    const chartConfig = template.chartConfig ?? { type: template.chartType ?? 'table' };
    const summary = `已生成报表「${template.name}」，共 ${exec.rowCount ?? exec.rows?.length ?? 0} 行数据。`;
    const content = `${summary}\n\n\`\`\`json\n${JSON.stringify({ rows: exec.rows, chartConfig }, null, 2)}\n\`\`\``;
    emit({ type: 'chunk', content });
    return { content, sql: filledSql, chartConfig };
  }
}

export function createTemplateApplyService(metadataTemplates: MetadataTemplateClient): TemplateApplyService {
  return new TemplateApplyService(metadataTemplates);
}
