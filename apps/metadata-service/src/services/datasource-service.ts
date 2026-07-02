import mysql from 'mysql2/promise';
import type { Logger } from '@hermes/shared';
import { MetaTableModel, MetaFieldModel, type DatasourceModel } from '@hermes/orm-schemas';
import { decryptSecret } from '../lib/crypto.js';
import type { MetaRepository, DatasourceRepository, AuditRepository } from '../repositories/index.js';

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
  latencyMs?: number;
};

export type SchemaFieldPreview = {
  physicalName: string;
  dataType: string;
  columnComment?: string;
};

export type SchemaTablePreview = {
  physicalName: string;
  tableComment?: string;
  fields: SchemaFieldPreview[];
};

export type SyncTableSelection = {
  physicalName: string;
  fields?: string[];
};

export type SyncOptions = {
  mode?: 'full' | 'selective';
  tables?: SyncTableSelection[];
  defaultInQueryLibrary?: boolean;
};

export type SyncResult = { tablesSynced: number; fieldsSynced: number };

export async function testDatasourceConnection(
  ds: Pick<DatasourceModel, 'host' | 'port' | 'username' | 'passwordEncrypted' | 'databaseName'>,
): Promise<ConnectionTestResult> {
  const start = Date.now();
  try {
    const password = decryptSecret(ds.passwordEncrypted);
    const conn = await mysql.createConnection({
      host: ds.host,
      port: ds.port,
      user: ds.username,
      password,
      database: ds.databaseName,
      connectTimeout: 5000,
    });
    await conn.ping();
    await conn.end();
    return { ok: true, message: '连接成功', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : '连接失败',
      latencyMs: Date.now() - start,
    };
  }
}

async function createSourceConnection(datasource: DatasourceModel) {
  const password = decryptSecret(datasource.passwordEncrypted);
  return mysql.createConnection({
    host: datasource.host,
    port: datasource.port,
    user: datasource.username,
    password,
    database: datasource.databaseName,
  });
}

export async function fetchSchemaFromSource(datasource: DatasourceModel): Promise<SchemaTablePreview[]> {
  const conn = await createSourceConnection(datasource);
  try {
    const [tables] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName, TABLE_COMMENT AS tableComment
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [datasource.databaseName],
    );

    const result: SchemaTablePreview[] = [];
    for (const row of tables) {
      const [fields] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT COLUMN_NAME AS columnName, DATA_TYPE AS dataType, COLUMN_COMMENT AS columnComment
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [datasource.databaseName, row.tableName],
      );

      result.push({
        physicalName: row.tableName as string,
        tableComment: (row.tableComment as string) || undefined,
        fields: fields.map((f) => ({
          physicalName: f.columnName as string,
          dataType: f.dataType as string,
          columnComment: (f.columnComment as string) || undefined,
        })),
      });
    }
    return result;
  } finally {
    await conn.end();
  }
}

export function filterSchemaForSelective(
  allTables: SchemaTablePreview[],
  selection?: SyncTableSelection[],
): SchemaTablePreview[] {
  if (!selection?.length) return allTables;

  const selected: SchemaTablePreview[] = [];
  for (const sel of selection) {
    const table = allTables.find((t) => t.physicalName === sel.physicalName);
    if (!table) continue;
    if (!sel.fields?.length) {
      selected.push(table);
      continue;
    }
    const fieldSet = new Set(sel.fields);
    selected.push({
      ...table,
      fields: table.fields.filter((f) => fieldSet.has(f.physicalName)),
    });
  }
  return selected;
}

export async function previewDatasourceSchema(
  datasource: DatasourceModel,
): Promise<{ tables: SchemaTablePreview[] }> {
  const tables = await fetchSchemaFromSource(datasource);
  return { tables };
}

async function upsertTableFromSource(
  metaRepo: MetaRepository,
  datasourceId: string,
  table: SchemaTablePreview,
  defaultInQueryLibrary: boolean,
): Promise<string> {
  const existing = await MetaTableModel.query().findOne({
    datasource_id: datasourceId,
    physical_name: table.physicalName,
  });

  if (existing) {
    await MetaTableModel.query().patchAndFetchById(existing.id, {
      sourceStatus: 'active',
      businessName: table.tableComment || existing.businessName,
    });
    return existing.id;
  }

  const inserted = await metaRepo.insertTable({
    id: crypto.randomUUID(),
    datasourceId,
    physicalName: table.physicalName,
    businessName: table.tableComment ?? null,
    source: 'sync',
    sourceStatus: 'active',
    inQueryLibrary: defaultInQueryLibrary,
  });
  return inserted.id;
}

async function upsertFieldFromSource(
  metaRepo: MetaRepository,
  tableId: string,
  field: SchemaFieldPreview,
  defaultInQueryLibrary: boolean,
): Promise<void> {
  const existingField = await MetaFieldModel.query().findOne({
    table_id: tableId,
    physical_name: field.physicalName,
  });

  if (existingField) {
    await MetaFieldModel.query().patchAndFetchById(existingField.id, {
      sourceStatus: 'active',
      dataType: field.dataType,
      businessName: field.columnComment || existingField.businessName,
    });
    return;
  }

  await metaRepo.insertField({
    id: crypto.randomUUID(),
    tableId,
    physicalName: field.physicalName,
    businessName: field.columnComment ?? null,
    dataType: field.dataType,
    source: 'sync',
    sourceStatus: 'active',
    inQueryLibrary: defaultInQueryLibrary,
    isSensitive: false,
  });
}

export async function syncDatasourceMetadata(
  datasource: DatasourceModel,
  metaRepo: MetaRepository,
  dsRepo: DatasourceRepository,
  auditRepo: AuditRepository,
  logger: Logger,
  traceId?: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const mode = options.mode ?? 'full';
  const defaultInQueryLibrary = options.defaultInQueryLibrary ?? false;
  const allTables = await fetchSchemaFromSource(datasource);

  const tablesToSync =
    mode === 'selective' ? filterSchemaForSelective(allTables, options.tables) : allTables;

  let fieldsSynced = 0;
  const syncedTableNames: string[] = [];

  for (const table of tablesToSync) {
    syncedTableNames.push(table.physicalName);
    const tableId = await upsertTableFromSource(
      metaRepo,
      datasource.id,
      table,
      defaultInQueryLibrary,
    );

    const activeFieldNames: string[] = [];
    for (const field of table.fields) {
      fieldsSynced += 1;
      activeFieldNames.push(field.physicalName);
      await upsertFieldFromSource(metaRepo, tableId, field, defaultInQueryLibrary);
    }
  }

  if (mode === 'full') {
    await metaRepo.markRemovedTables(
      datasource.id,
      allTables.map((t) => t.physicalName),
    );
    for (const table of allTables) {
      const metaTable = await MetaTableModel.query().findOne({
        datasource_id: datasource.id,
        physical_name: table.physicalName,
      });
      if (metaTable) {
        await metaRepo.markRemovedFields(
          metaTable.id,
          table.fields.map((f) => f.physicalName),
        );
      }
    }
  }

  await dsRepo.patch(datasource.id, {
    lastSyncedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    connectionStatus: 'ok',
  });
  await auditRepo.create({
    action: 'datasource.sync',
    resourceType: 'datasource',
    resourceId: datasource.id,
    afterSnapshot: {
      mode,
      tablesSynced: syncedTableNames.length,
      fieldsSynced,
      defaultInQueryLibrary,
    },
    traceId,
  });

  logger.info('datasource.sync.completed', {
    traceId,
    datasourceId: datasource.id,
    mode,
    tablesSynced: syncedTableNames.length,
    fieldsSynced,
  });

  return { tablesSynced: syncedTableNames.length, fieldsSynced };
}
