import { describe, it, expect, vi } from 'vitest';
import { TemplateApplyService } from '../services/template-apply-service.js';
import type { MetadataTemplateClient } from '../lib/metadata-template-client.js';

describe('TemplateApplyService', () => {
  it('generates sql output when applying sql template', async () => {
    const metadataTemplates = {
      getTemplate: vi.fn().mockResolvedValue({
        id: 'tpl-1',
        name: '订单趋势',
        scenarioDescription: '近7天订单',
        type: 'sql',
        sqlBody: 'SELECT * FROM orders WHERE dt >= {{start_date}}',
        placeholders: ['start_date'],
      }),
    } as unknown as MetadataTemplateClient;

    const svc = new TemplateApplyService(metadataTemplates);
    const events: unknown[] = [];
    const result = await svc.run(
      {
        mode: 'sql',
        query: '近7天订单',
        templateId: 'tpl-1',
        templateType: 'sql',
        templateParameters: { start_date: '2026-01-01' },
      },
      (event) => events.push(event),
    );

    expect(result.sql).toContain('2026-01-01');
    expect(result.content).toContain('```sql');
    expect(events.some((e) => (e as { type?: string }).type === 'phase')).toBe(true);
  });
});
