import type { Logger } from '@hermes/shared';
import type { Repositories } from '../repositories/index.js';
import { newId } from '../lib/crypto.js';

export class MetaService {
  constructor(
    private readonly repos: Repositories,
    private readonly logger: Logger,
  ) {}

  listTables(datasourceId: string, inQueryLibrary?: boolean) {
    return this.repos.meta.listTables(datasourceId, inQueryLibrary);
  }

  async getTable(id: string) {
    return this.repos.meta.findTable(id);
  }

  async updateTable(
    id: string,
    input: Partial<{ businessName: string; description: string; inQueryLibrary: boolean }>,
    actorId?: string,
    traceId?: string,
  ) {
    const row = await this.repos.meta.patchTable(id, input);
    if (row) {
      await this.repos.audit.create({
        actorId,
        action: 'meta_table.update',
        resourceType: 'meta_table',
        resourceId: id,
        afterSnapshot: input,
        traceId,
      });
    }
    return row;
  }

  async createManualTable(
    datasourceId: string,
    input: { physicalName: string; businessName?: string; description?: string; inQueryLibrary?: boolean },
    actorId?: string,
    traceId?: string,
  ) {
    const row = await this.repos.meta.insertTable({
      id: newId(),
      datasourceId,
      physicalName: input.physicalName,
      businessName: input.businessName ?? null,
      description: input.description ?? null,
      source: 'manual',
      sourceStatus: 'active',
      inQueryLibrary: input.inQueryLibrary ?? false,
    });
    await this.repos.audit.create({
      actorId,
      action: 'meta_table.create_manual',
      resourceType: 'meta_table',
      resourceId: row.id,
      afterSnapshot: input,
      traceId,
    });
    return row;
  }

  async updateField(
    id: string,
    input: Partial<{
      businessName: string;
      description: string;
      inQueryLibrary: boolean;
      isSensitive: boolean;
      synonyms: string[];
    }>,
    actorId?: string,
    traceId?: string,
  ) {
    const { synonyms, ...fieldPatch } = input;
    const row = await this.repos.meta.patchField(id, fieldPatch);
    if (synonyms) {
      await this.repos.meta.replaceSynonyms(id, synonyms);
    }
    if (row) {
      await this.repos.audit.create({
        actorId,
        action: 'meta_field.update',
        resourceType: 'meta_field',
        resourceId: id,
        afterSnapshot: input,
        traceId,
      });
      this.logger.info('meta_field.updated', { traceId, fieldId: id });
    }
    return this.repos.meta.findTable(row?.tableId ?? '');
  }

  listQueryLibraryFields() {
    return this.repos.meta.listFieldsForLibrary();
  }
}
