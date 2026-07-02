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

export async function testDatasourceConnection(ds: Pick<DatasourceModel, 'host' | 'port' | 'username' | 'passwordEncrypted' | 'databaseName'>): Promise<ConnectionTestResult> {
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

export type SyncResult = { tablesSynced: number; fieldsSynced: number };

export async function syncDatasourceMetadata(
  datasource: DatasourceModel,
  metaRepo: MetaRepository,
  dsRepo: DatasourceRepository,
  auditRepo: AuditRepository,
  logger: Logger,
  traceId?: string,
): Promise<SyncResult> {
  const password = decryptSecret(datasource.passwordEncrypted);
  const conn = await mysql.createConnection({
    host: datasource.host,
    port: datasource.port,
    user: datasource.username,
    password,
    database: datasource.databaseName,
  });

  const [tables] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT TABLE_NAME AS tableName, TABLE_COMMENT AS tableComment
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [datasource.databaseName],
  );

  let fieldsSynced = 0;
  const tableNames: string[] = [];

  for (const row of tables) {
    tableNames.push(row.tableName as string);
    const existing = await MetaTableModel.query()
      .findOne({ datasource_id: datasource.id, physical_name: row.tableName as string });

    let tableId: string;
    if (existing) {
      await MetaTableModel.query().patchAndFetchById(existing.id, {
        sourceStatus: 'active',
        businessName: (row.tableComment as string) || existing.businessName,
      });
      tableId = existing.id;
    } else {
      const inserted = await metaRepo.insertTable({
        id: crypto.randomUUID(),
        datasourceId: datasource.id,
        physicalName: row.tableName as string,
        businessName: (row.tableComment as string) || null,
        source: 'sync',
        sourceStatus: 'active',
        inQueryLibrary: false,
      });
      tableId = inserted.id;
    }

    const [fields] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME AS columnName, DATA_TYPE AS dataType, COLUMN_COMMENT AS columnComment
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [datasource.databaseName, row.tableName],
    );

    for (const field of fields) {
      fieldsSynced += 1;
      const existingField = await MetaFieldModel.query().findOne({
        table_id: tableId,
        physical_name: field.columnName as string,
      });
      if (existingField) {
        await MetaFieldModel.query().patchAndFetchById(existingField.id, {
          sourceStatus: 'active',
          dataType: field.dataType as string,
          businessName: (field.columnComment as string) || existingField.businessName,
        });
      } else {
        await metaRepo.insertField({
          id: crypto.randomUUID(),
          tableId,
          physicalName: field.columnName as string,
          businessName: (field.columnComment as string) || null,
          dataType: field.dataType as string,
          source: 'sync',
          sourceStatus: 'active',
          inQueryLibrary: false,
          isSensitive: false,
        });
      }
    }
  }

  await conn.end();
  await metaRepo.markRemovedTables(datasource.id, tableNames);
  await dsRepo.patch(datasource.id, {
    lastSyncedAt: new Date().toISOString().slice(0, 23).replace('T', ' '),
    connectionStatus: 'ok',
  });
  await auditRepo.create({
    action: 'datasource.sync',
    resourceType: 'datasource',
    resourceId: datasource.id,
    afterSnapshot: { tablesSynced: tableNames.length, fieldsSynced },
    traceId,
  });

  logger.info('datasource.sync.completed', {
    traceId,
    datasourceId: datasource.id,
    tablesSynced: tableNames.length,
    fieldsSynced,
  });

  return { tablesSynced: tableNames.length, fieldsSynced };
}
