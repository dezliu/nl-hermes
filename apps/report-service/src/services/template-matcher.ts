import type { Logger } from '@hermes/shared';
import { getServiceAuthHeaders } from '@hermes/shared';
import type { TemplateMatchRequest, TemplateMatchResult } from '@hermes/contracts';
import { cosineSimilarity, embedText } from '../lib/embedding.js';

type TemplateRecord = {
  id: string;
  name: string;
  scenarioDescription: string;
  sqlBody?: string;
  inLibrary?: boolean;
  score?: number | null;
};

export class TemplateMatcher {
  constructor(
    private readonly logger: Logger,
    private readonly metadataUrl = process.env.METADATA_SERVICE_URL ?? 'http://localhost:4050',
  ) {}

  private async fetchTemplates(mode: 'sql' | 'report'): Promise<TemplateRecord[]> {
    try {
      const path = mode === 'sql' ? '/v1/templates/sql' : '/v1/templates/report';
      const res = await fetch(`${this.metadataUrl}${path}?status=active`, {
        headers: getServiceAuthHeaders('report-service'),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { items: TemplateRecord[] };
      return (data.items ?? []).filter((t) => t.inLibrary !== false);
    } catch {
      return [];
    }
  }

  async match(req: TemplateMatchRequest, traceId?: string): Promise<TemplateMatchResult[]> {
    const templates = await this.fetchTemplates(req.mode);
    const topK = req.topK ?? 5;
    const threshold = req.threshold ?? 0.3;
    const queryVec = embedText(req.query);

    const scored = templates.map((t) => {
      const text = [t.name, t.scenarioDescription, t.sqlBody].filter(Boolean).join(' ');
      const score = cosineSimilarity(queryVec, embedText(text));
      return {
        id: t.id,
        name: t.name,
        scenarioDescription: t.scenarioDescription,
        sqlBody: t.sqlBody,
        score: Number(score.toFixed(4)),
        type: req.mode,
      };
    });

    const results = scored
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    this.logger.info('report.template.match', {
      traceId,
      mode: req.mode,
      candidateCount: templates.length,
      matchCount: results.length,
    });

    return results;
  }
}

export { embedText, cosineSimilarity };
