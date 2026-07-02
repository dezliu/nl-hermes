import type { Logger } from '@hermes/shared';
import {
  AuditLogModel,
  DatasourceModel,
  FieldSynonymModel,
  MetaFieldModel,
  MetaTableModel,
  PromptVersionModel,
  ReportTemplateModel,
  RoleModel,
  SqlTemplateModel,
  SystemSettingModel,
  BusinessKnowledgeModel,
} from '@hermes/orm-schemas';
import type { Knex } from 'knex';

export class AuditRepository {
  async create(
    data: {
      actorId?: string;
      action: string;
      resourceType: string;
      resourceId?: string;
      beforeSnapshot?: unknown;
      afterSnapshot?: unknown;
      traceId?: string;
    },
    trx?: Knex.Transaction,
  ): Promise<void> {
    await AuditLogModel.query(trx).insert({
      id: crypto.randomUUID(),
      ...data,
    });
  }
}

export class DatasourceRepository {
  findAll() {
    return DatasourceModel.query().select(
      'id',
      'name',
      'host',
      'port',
      'database_name as databaseName',
      'username',
      'connection_status as connectionStatus',
      'last_tested_at as lastTestedAt',
      'last_synced_at as lastSyncedAt',
      'created_at as createdAt',
      'updated_at as updatedAt',
    );
  }

  findById(id: string) {
    return DatasourceModel.query().findById(id);
  }

  insert(data: Partial<DatasourceModel>, trx?: Knex.Transaction) {
    return DatasourceModel.query(trx).insert(data);
  }

  patch(id: string, data: Partial<DatasourceModel>, trx?: Knex.Transaction) {
    return DatasourceModel.query(trx).patchAndFetchById(id, data);
  }

  delete(id: string, trx?: Knex.Transaction) {
    return DatasourceModel.query(trx).deleteById(id);
  }
}

export class MetaRepository {
  listTables(datasourceId: string, inQueryLibrary?: boolean) {
    let q = MetaTableModel.query()
      .where('datasource_id', datasourceId)
      .select('id', 'physical_name as physicalName', 'business_name as businessName', 'description', 'source', 'source_status as sourceStatus', 'in_query_library as inQueryLibrary');
    if (inQueryLibrary !== undefined) q = q.where('in_query_library', inQueryLibrary);
    return q.orderBy('physical_name');
  }

  findTable(id: string) {
    return MetaTableModel.query()
      .findById(id)
      .withGraphFetched('fields.synonyms');
  }

  insertTable(data: Partial<MetaTableModel>, trx?: Knex.Transaction) {
    return MetaTableModel.query(trx).insert(data);
  }

  patchTable(id: string, data: Partial<MetaTableModel>, trx?: Knex.Transaction) {
    return MetaTableModel.query(trx).patchAndFetchById(id, data);
  }

  listFieldsForLibrary() {
    return MetaFieldModel.query()
      .alias('f')
      .join('meta_tables as t', 't.id', 'f.table_id')
      .where('f.in_query_library', true)
      .where('t.in_query_library', true)
      .where('f.source_status', 'active')
      .where('t.source_status', 'active')
      .select(
        'f.id',
        'f.table_id as tableId',
        'f.physical_name as physicalName',
        'f.business_name as businessName',
        'f.description',
        'f.data_type as dataType',
        't.physical_name as tablePhysicalName',
        't.business_name as tableBusinessName',
      )
      .withGraphFetched('synonyms');
  }

  insertField(data: Partial<MetaFieldModel>, trx?: Knex.Transaction) {
    return MetaFieldModel.query(trx).insert(data);
  }

  patchField(id: string, data: Partial<MetaFieldModel>, trx?: Knex.Transaction) {
    return MetaFieldModel.query(trx).patchAndFetchById(id, data);
  }

  replaceSynonyms(fieldId: string, synonyms: string[], trx?: Knex.Transaction) {
    return FieldSynonymModel.transaction(async (t) => {
      const trxConn = trx ?? t;
      await FieldSynonymModel.query(trxConn).delete().where('field_id', fieldId);
      if (synonyms.length === 0) return [];
      return FieldSynonymModel.query(trxConn).insert(
        synonyms.map((synonym) => ({ id: crypto.randomUUID(), fieldId, synonym })),
      );
    });
  }

  markRemovedTables(datasourceId: string, activeNames: string[], trx?: Knex.Transaction) {
    return MetaTableModel.query(trx)
      .where('datasource_id', datasourceId)
      .where('source', 'sync')
      .whereNotIn('physical_name', activeNames.length ? activeNames : ['__none__'])
      .patch({ sourceStatus: 'removed_at_source' });
  }

  markRemovedFields(tableId: string, activeNames: string[], trx?: Knex.Transaction) {
    return MetaFieldModel.query(trx)
      .where('table_id', tableId)
      .where('source', 'sync')
      .whereNotIn('physical_name', activeNames.length ? activeNames : ['__none__'])
      .patch({ sourceStatus: 'removed_at_source' });
  }
}

export class PromptRepository {
  listRoles() {
    return RoleModel.query().select('id', 'code', 'name', 'description');
  }

  listVersions(roleId?: string | null) {
    let q = PromptVersionModel.query().orderBy('version', 'desc');
    if (roleId === null) q = q.whereNull('role_id');
    else if (roleId) q = q.where('role_id', roleId);
    return q;
  }

  findActive(roleId?: string | null) {
    let q = PromptVersionModel.query().where('is_active', true);
    if (roleId === null || roleId === undefined) q = q.whereNull('role_id');
    else q = q.where('role_id', roleId);
    return q.first();
  }

  async createVersion(
    data: { roleId?: string | null; persona: string; constraints: string; createdBy?: string },
    trx?: Knex.Transaction,
  ) {
    const run = async (t: Knex.Transaction) => {
      const q = PromptVersionModel.query(t);
      if (data.roleId) q.where('role_id', data.roleId);
      else q.whereNull('role_id');
      const latest = await q.max('version as maxVersion').first();
      const version = Number((latest as { maxVersion?: number })?.maxVersion ?? 0) + 1;

      const deactivate = PromptVersionModel.query(t);
      if (data.roleId) deactivate.where('role_id', data.roleId);
      else deactivate.whereNull('role_id');
      await deactivate.patch({ isActive: false });
      return PromptVersionModel.query(t).insert({
        id: crypto.randomUUID(),
        roleId: data.roleId ?? null,
        persona: data.persona,
        constraints: data.constraints,
        version,
        isActive: true,
        createdBy: data.createdBy ?? null,
      });
    };
    return trx ? run(trx) : PromptVersionModel.transaction(run);
  }

  async activateVersion(id: string, trx?: Knex.Transaction) {
    const version = await PromptVersionModel.query(trx).findById(id);
    if (!version) return null;
    const deactivate = PromptVersionModel.query(trx);
    if (version.roleId) deactivate.where('role_id', version.roleId);
    else deactivate.whereNull('role_id');
    await deactivate.patch({ isActive: false });
    return PromptVersionModel.query(trx).patchAndFetchById(id, { isActive: true });
  }
}

export class SettingsRepository {
  findAll(category?: string) {
    let q = SystemSettingModel.query();
    if (category) q = q.where('category', category);
    return q;
  }

  findByKey(category: string, settingKey: string) {
    return SystemSettingModel.query().findOne({ category, setting_key: settingKey });
  }

  upsert(data: {
    category: SystemSettingModel['category'];
    settingKey: string;
    settingValue: unknown;
    updatedBy?: string;
  }) {
    return SystemSettingModel.query()
      .insert({
        id: crypto.randomUUID(),
        category: data.category,
        settingKey: data.settingKey,
        settingValue: data.settingValue,
        updatedBy: data.updatedBy ?? null,
      })
      .onConflict(['category', 'setting_key'])
      .merge({
        settingValue: data.settingValue,
        updatedBy: data.updatedBy ?? null,
        updatedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
      });
  }
}

export class BusinessKnowledgeRepository {
  list(filters?: { status?: string; category?: string }) {
    let q = BusinessKnowledgeModel.query().orderBy('updated_at', 'desc');
    if (filters?.status) q = q.where('status', filters.status);
    if (filters?.category) q = q.where('category', filters.category);
    return q;
  }

  findById(id: string) {
    return BusinessKnowledgeModel.query().findById(id);
  }

  insert(data: Partial<BusinessKnowledgeModel>, trx?: Knex.Transaction) {
    return BusinessKnowledgeModel.query(trx).insert(data);
  }

  patch(id: string, data: Partial<BusinessKnowledgeModel>, trx?: Knex.Transaction) {
    return BusinessKnowledgeModel.query(trx).patchAndFetchById(id, data);
  }
}

export class TemplateRepository {
  listSql(status?: string) {
    let q = SqlTemplateModel.query().orderBy('updated_at', 'desc');
    if (status) q = q.where('status', status);
    return q;
  }

  listReport(status?: string) {
    let q = ReportTemplateModel.query().orderBy('updated_at', 'desc');
    if (status) q = q.where('status', status);
    return q;
  }

  findSql(id: string) {
    return SqlTemplateModel.query().findById(id);
  }

  findReport(id: string) {
    return ReportTemplateModel.query().findById(id);
  }

  insertSql(data: Partial<SqlTemplateModel>, trx?: Knex.Transaction) {
    return SqlTemplateModel.query(trx).insert(data);
  }

  insertReport(data: Partial<ReportTemplateModel>, trx?: Knex.Transaction) {
    return ReportTemplateModel.query(trx).insert(data);
  }

  patchSql(id: string, data: Partial<SqlTemplateModel>, trx?: Knex.Transaction) {
    return SqlTemplateModel.query(trx).patchAndFetchById(id, data);
  }

  patchReport(id: string, data: Partial<ReportTemplateModel>, trx?: Knex.Transaction) {
    return ReportTemplateModel.query(trx).patchAndFetchById(id, data);
  }

  listInLibrary(mode: 'sql' | 'report') {
    if (mode === 'sql') {
      return SqlTemplateModel.query().where('in_library', true).where('status', 'active');
    }
    return ReportTemplateModel.query().where('in_library', true).where('status', 'active');
  }
}

export type Repositories = {
  audit: AuditRepository;
  datasource: DatasourceRepository;
  meta: MetaRepository;
  prompt: PromptRepository;
  settings: SettingsRepository;
  businessKnowledge: BusinessKnowledgeRepository;
  template: TemplateRepository;
};

export function createRepositories(_logger?: Logger): Repositories {
  return {
    audit: new AuditRepository(),
    datasource: new DatasourceRepository(),
    meta: new MetaRepository(),
    prompt: new PromptRepository(),
    settings: new SettingsRepository(),
    businessKnowledge: new BusinessKnowledgeRepository(),
    template: new TemplateRepository(),
  };
}
