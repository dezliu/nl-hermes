import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from './logger.js';
import { redact } from './redact.js';

describe('createLogger', () => {
  it('emits structured JSON log entries', () => {
    const sink = vi.fn();
    const logger = createLogger({ service: 'test-svc', sink });

    logger.info('test.operation', { userId: 'u1' });

    expect(sink).toHaveBeenCalledOnce();
    const entry = sink.mock.calls[0][0];
    expect(entry.level).toBe('info');
    expect(entry.operation).toBe('test.operation');
    expect(entry.service).toBe('test-svc');
    expect(entry.fields.userId).toBe('u1');
    expect(entry.timestamp).toBeTruthy();
  });

  it('serializes errors and redacts sensitive body fields', () => {
    const sink = vi.fn();
    const logger = createLogger({ service: 'test-svc', sink });

    logger.error('test.failed', {
      err: new Error('boom'),
      body: { username: 'alice', password: 'secret' },
    });

    const entry = sink.mock.calls[0][0];
    expect(entry.fields.error).toEqual({ name: 'Error', message: 'boom' });
    expect(entry.fields.body).toEqual({ username: 'alice', password: '[REDACTED]' });
  });

  it('child logger inherits bindings', () => {
    const sink = vi.fn();
    const parent = createLogger({ service: 'svc', bindings: { traceId: 't1' }, sink });
    parent.child({ userId: 'u1' }).info('child.op');

    expect(sink.mock.calls[0][0].fields).toMatchObject({ traceId: 't1', userId: 'u1' });
  });
});

describe('redact', () => {
  it('redacts keys matching sensitive patterns', () => {
    const result = redact({
      apiKey: 'abc',
      nested: { authorization: 'Bearer x' },
      safe: 'ok',
    });
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.nested).toEqual({ authorization: '[REDACTED]' });
    expect(result.safe).toBe('ok');
  });
});
