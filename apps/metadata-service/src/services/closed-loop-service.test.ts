import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClosedLoopService, type ClosedLoopRepository } from './closed-loop-service.js';
import type { Repositories } from '../repositories/index.js';
import type { Logger } from '@hermes/shared';

function createMockRepo(): ClosedLoopRepository {
  return {
    findCandidateByMessageId: vi.fn().mockResolvedValue(undefined),
    insertCandidate: vi.fn().mockImplementation(async (data) => ({ ...data, id: 'cand-1' })),
    patchCandidate: vi.fn(),
    listCandidates: vi.fn(),
    findCandidate: vi.fn(),
    listFeedback: vi.fn(),
    findFeedback: vi.fn(),
    insertFeedback: vi.fn(),
    patchFeedback: vi.fn(),
  } as unknown as ClosedLoopRepository;
}

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as Logger;
}

describe('ClosedLoopService.createCandidate', () => {
  let repo: ClosedLoopRepository;
  let service: ClosedLoopService;

  const baseInput = {
    sourceMessageId: 'msg-1',
    conversationId: 'conv-1',
    mode: 'sql' as const,
    userQuery: '查询销售额',
    sqlBody: 'SELECT 1',
    ragScore: 0.4,
  };

  beforeEach(() => {
    repo = createMockRepo();
    service = new ClosedLoopService({} as Repositories, createMockLogger(), repo);
  });

  it('creates candidate when rag score meets workflow min threshold', async () => {
    const row = await service.createCandidate(baseInput);
    expect(row).toBeTruthy();
    expect(repo.insertCandidate).toHaveBeenCalledOnce();
  });

  it('creates candidate with relaxed threshold when schema context exists', async () => {
    const row = await service.createCandidate({ ...baseInput, ragScore: 0.3, schemaContextCount: 2 });
    expect(row).toBeTruthy();
    expect(repo.insertCandidate).toHaveBeenCalledOnce();
  });

  it('skips candidate when rag score is below workflow threshold', async () => {
    const row = await service.createCandidate({ ...baseInput, ragScore: 0.2 });
    expect(row).toBeNull();
    expect(repo.insertCandidate).not.toHaveBeenCalled();
  });

  it('skips candidate when rag score is 0.3 without schema context', async () => {
    const row = await service.createCandidate({ ...baseInput, ragScore: 0.3, schemaContextCount: 0 });
    expect(row).toBeNull();
    expect(repo.insertCandidate).not.toHaveBeenCalled();
  });
});
