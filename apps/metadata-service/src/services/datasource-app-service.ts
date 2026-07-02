import type { Logger } from '@hermes/shared';
import type { Repositories } from '../repositories/index.js';
import { encryptSecret, newId } from '../lib/crypto.js';
import { syncDatasourceMetadata, testDatasourceConnection } from './datasource-service.js';

export class DatasourceService {
  constructor(
    private readonly repos: Repositories,
    private readonly logger: Logger,
  ) {}

  list() {
    return this.repos.datasource.findAll();
  }

  async get(id: string) {
    const ds = await this.repos.datasource.findById(id);
    if (!ds) return null;
    const { passwordEncrypted: _, ...safe } = ds;
    return safe;
  }

  async create(input: {
    name: string;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    password: string;
    createdBy?: string;
  }, traceId?: string) {
    const row = await this.repos.datasource.insert({
      id: newId(),
      name: input.name,
      host: input.host,
      port: input.port,
      databaseName: input.databaseName,
      username: input.username,
      passwordEncrypted: encryptSecret(input.password),
      connectionStatus: 'unknown',
      createdBy: input.createdBy ?? null,
    });
    await this.repos.audit.create({
      actorId: input.createdBy,
      action: 'datasource.create',
      resourceType: 'datasource',
      resourceId: row.id,
      afterSnapshot: { name: input.name, host: input.host },
      traceId,
    });
    const { passwordEncrypted: _, ...safe } = row;
    return safe;
  }

  async update(id: string, input: Partial<{
    name: string;
    host: string;
    port: number;
    databaseName: string;
    username: string;
    password: string;
  }>, actorId?: string, traceId?: string) {
    const patch: Record<string, unknown> = { ...input };
    if (input.password) {
      patch.passwordEncrypted = encryptSecret(input.password);
      delete patch.password;
    }
    const row = await this.repos.datasource.patch(id, patch);
    if (!row) return null;
    await this.repos.audit.create({
      actorId,
      action: 'datasource.update',
      resourceType: 'datasource',
      resourceId: id,
      afterSnapshot: patch,
      traceId,
    });
    const { passwordEncrypted: _, ...safe } = row;
    return safe;
  }

  async remove(id: string, actorId?: string, traceId?: string) {
    const deleted = await this.repos.datasource.delete(id);
    if (deleted) {
      await this.repos.audit.create({
        actorId,
        action: 'datasource.delete',
        resourceType: 'datasource',
        resourceId: id,
        traceId,
      });
    }
    return deleted > 0;
  }

  async testConnection(id: string, traceId?: string) {
    const ds = await this.repos.datasource.findById(id);
    if (!ds) return null;
    const result = await testDatasourceConnection(ds);
    await this.repos.datasource.patch(id, {
      connectionStatus: result.ok ? 'ok' : 'failed',
      lastTestedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    });
    this.logger.info('datasource.test', { traceId, datasourceId: id, ok: result.ok });
    return result;
  }

  async sync(id: string, traceId?: string) {
    const ds = await this.repos.datasource.findById(id);
    if (!ds) return null;
    const test = await testDatasourceConnection(ds);
    if (!test.ok) {
      await this.repos.datasource.patch(id, { connectionStatus: 'failed' });
      throw new Error(`连接失败: ${test.message}`);
    }
    return syncDatasourceMetadata(ds, this.repos.meta, this.repos.datasource, this.repos.audit, this.logger, traceId);
  }
}
