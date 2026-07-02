import type { TemplateMatchRequest, TemplateMatchResult } from '@hermes/contracts';
import { createReportClient } from '@hermes/llm-tools';
import { DEFAULT_WORKFLOW_LIMITS } from '@hermes/workflow';

export class TemplateRecommendationService {
  async match(req: TemplateMatchRequest, traceId?: string): Promise<TemplateMatchResult[]> {
    const report = createReportClient(process.env.REPORT_SERVICE_URL, traceId);
    const { results } = await report.matchTemplates({
      query: req.query,
      mode: req.mode,
      topK: req.topK ?? 1,
      threshold: req.threshold ?? DEFAULT_WORKFLOW_LIMITS.templateThreshold,
    });
    return results;
  }
}

export function createTemplateRecommendationService(): TemplateRecommendationService {
  return new TemplateRecommendationService();
}
