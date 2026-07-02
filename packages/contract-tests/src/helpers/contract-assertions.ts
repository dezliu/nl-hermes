import { expect } from 'vitest';
import type { RetrieveResponse, ScoreResponse, ExecuteQueryResponse, TemplateMatchResult } from '@hermes/contracts';

export function assertRetrieveResponse(body: unknown): asserts body is RetrieveResponse {
  expect(body).toMatchObject({
    query: expect.any(String),
    collection: expect.any(String),
    results: expect.any(Array),
  });
  for (const item of (body as RetrieveResponse).results) {
    expect(item).toMatchObject({
      id: expect.any(String),
      content: expect.any(String),
      score: expect.any(Number),
    });
  }
}

export function assertScoreResponse(body: unknown): asserts body is ScoreResponse {
  expect(body).toMatchObject({
    score: expect.any(Number),
    level: expect.stringMatching(/^(high|medium|low)$/),
    details: expect.any(Array),
  });
}

export function assertTemplateMatchResults(results: unknown): asserts results is TemplateMatchResult[] {
  expect(results).toBeInstanceOf(Array);
  for (const item of results as TemplateMatchResult[]) {
    expect(item).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      scenarioDescription: expect.any(String),
      score: expect.any(Number),
      type: expect.stringMatching(/^(sql|report)$/),
    });
  }
}

export function assertExecuteQueryResponse(body: unknown): asserts body is ExecuteQueryResponse {
  expect(body).toMatchObject({ ok: expect.any(Boolean) });
}

export function assertHealthPayload(body: unknown, service: string): void {
  expect(body).toMatchObject({
    status: 'ok',
    service,
  });
}
