import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetadataClient } from './clients.js';

describe('MetadataClient.resolveDatasourceId', () => {
  const originalEnv = process.env.DEFAULT_DATASOURCE_ID;

  beforeEach(() => {
    delete process.env.DEFAULT_DATASOURCE_ID;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DEFAULT_DATASOURCE_ID;
    } else {
      process.env.DEFAULT_DATASOURCE_ID = originalEnv;
    }
    vi.restoreAllMocks();
  });

  it('returns preferred id when datasource exists', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/v1/datasources/ds-preferred')) {
        return { ok: true, json: async () => ({ item: { id: 'ds-preferred' } }) };
      }
      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal('fetch', fetchImpl);

    const client = new MetadataClient({ baseUrl: 'http://metadata.test' });
    await expect(client.resolveDatasourceId('ds-preferred')).resolves.toBe('ds-preferred');
  });

  it('falls back to DEFAULT_DATASOURCE_ID env', async () => {
    process.env.DEFAULT_DATASOURCE_ID = 'ds-env';
    const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/v1/datasources/ds-env')) {
        return { ok: true, json: async () => ({ item: { id: 'ds-env' } }) };
      }
      return { ok: false, text: async () => 'not found' };
    });
    vi.stubGlobal('fetch', fetchImpl);

    const client = new MetadataClient({ baseUrl: 'http://metadata.test' });
    await expect(client.resolveDatasourceId()).resolves.toBe('ds-env');
  });

  it('falls back to first listed datasource', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/v1/datasources')) {
        return { ok: true, json: async () => ({ items: [{ id: 'ds-first', name: 'demo' }] }) };
      }
      return { ok: false, text: async () => 'not found' };
    });
    vi.stubGlobal('fetch', fetchImpl);

    const client = new MetadataClient({ baseUrl: 'http://metadata.test' });
    await expect(client.resolveDatasourceId()).resolves.toBe('ds-first');
  });

  it('throws when no datasource is available', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    });
    vi.stubGlobal('fetch', fetchImpl);

    const client = new MetadataClient({ baseUrl: 'http://metadata.test' });
    await expect(client.resolveDatasourceId()).rejects.toThrow('未配置有效数据源');
  });
});
