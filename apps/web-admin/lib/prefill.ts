export type TemplatePrefillPayload = {
  name?: string;
  scenarioDescription?: string;
  sqlBody?: string;
  chartType?: 'line' | 'bar' | 'table';
  chartConfig?: { xField?: string; yField?: string };
  sourceFeedbackId?: string;
  sourceCandidateId?: string;
};

export function encodePrefill(payload: TemplatePrefillPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodePrefill(raw: string | null): TemplatePrefillPayload | null {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(raw)))) as TemplatePrefillPayload;
  } catch {
    return null;
  }
}
