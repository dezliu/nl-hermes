import type { RetrieveResponse, ScoreResponse } from '@hermes/contracts';
import { withServiceAuth } from '@hermes/shared';

const RAG_URL = process.env.RAG_SERVICE_URL ?? 'http://localhost:4020';

export type CaseRunOutput = {
  retrievalHit: boolean;
  generateSuccess: boolean;
  score: number;
  actualOutput: Record<string, unknown>;
  diffNotes: string;
  durationMs: number;
};

export class EvalCaseRunner {
  async runCase(input: {
    question: string;
    mode: 'sql' | 'report';
    expectedTables?: string[] | null;
    expectedPoints?: string | null;
    traceId?: string;
  }): Promise<CaseRunOutput> {
    const started = Date.now();
    const headers = withServiceAuth(
      {
        'Content-Type': 'application/json',
        ...(input.traceId ? { 'x-trace-id': input.traceId } : {}),
      },
      'eval-service',
    );

    const retrieveRes = await fetch(`${RAG_URL}/v1/retrieve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: input.question,
        collection: 'metadata',
        mode: input.mode,
      }),
    });

    let retrieve: RetrieveResponse = { results: [], query: input.question, collection: 'metadata' };
    if (retrieveRes.ok) {
      retrieve = (await retrieveRes.json()) as RetrieveResponse;
    }

    const scoreRes = await fetch(`${RAG_URL}/v1/score`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: input.question,
        collection: 'metadata',
        results: retrieve.results,
      }),
    });

    let scorePayload: ScoreResponse = { score: 0, level: 'low', details: [] };
    if (scoreRes.ok) {
      scorePayload = (await scoreRes.json()) as ScoreResponse;
    }

    const retrievedTables = extractTableNames(retrieve.results.map((r) => r.content));
    const expected = (input.expectedTables ?? []).map(normalizeName);
    const retrievalHit =
      expected.length === 0
        ? scorePayload.score >= 0.35
        : expected.some((t) => retrievedTables.some((r) => r.includes(t) || t.includes(r)));

    const pointsMatch = matchExpectedPoints(input.expectedPoints, retrieve.results, scorePayload.score);
    const generateSuccess = retrievalHit && pointsMatch;
    const diffNotes = buildDiffNotes({
      expectedTables: input.expectedTables,
      retrievedTables,
      expectedPoints: input.expectedPoints,
      score: scorePayload.score,
      retrievalHit,
      generateSuccess,
    });

    return {
      retrievalHit,
      generateSuccess,
      score: scorePayload.score,
      actualOutput: {
        retrieveResults: retrieve.results.slice(0, 5),
        score: scorePayload,
        retrievedTables,
      },
      diffNotes,
      durationMs: Date.now() - started,
    };
  }
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function extractTableNames(contents: string[]): string[] {
  const names = new Set<string>();
  for (const content of contents) {
    const physical = content.match(/physical[_\s]?name[:：]\s*([a-z0-9_]+)/i)?.[1];
    const table = content.match(/table[:：]\s*([a-z0-9_]+)/i)?.[1];
    if (physical) names.add(normalizeName(physical));
    if (table) names.add(normalizeName(table));
    const tokens = content.toLowerCase().match(/[a-z][a-z0-9_]{2,}/g) ?? [];
    tokens.slice(0, 3).forEach((t) => names.add(t));
  }
  return [...names];
}

function matchExpectedPoints(
  expectedPoints: string | null | undefined,
  results: RetrieveResponse['results'],
  score: number,
): boolean {
  if (!expectedPoints?.trim()) return score >= 0.35;
  const keywords = expectedPoints
    .split(/[,，;；\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (keywords.length === 0) return score >= 0.35;
  const blob = results.map((r) => r.content).join('\n').toLowerCase();
  const hitCount = keywords.filter((k) => blob.includes(k.toLowerCase())).length;
  return hitCount / keywords.length >= 0.5;
}

function buildDiffNotes(input: {
  expectedTables?: string[] | null;
  retrievedTables: string[];
  expectedPoints?: string | null;
  score: number;
  retrievalHit: boolean;
  generateSuccess: boolean;
}): string {
  const parts: string[] = [];
  if (!input.retrievalHit && input.expectedTables?.length) {
    parts.push(`期望表 ${input.expectedTables.join('、')}，检索到 ${input.retrievedTables.join('、') || '无'}`);
  }
  if (input.expectedPoints) {
    parts.push(`期望要点：${input.expectedPoints}`);
  }
  parts.push(`检索评分 ${input.score.toFixed(2)}`);
  if (!input.generateSuccess) parts.push('生成/匹配未达预期');
  return parts.join('；');
}
