#!/usr/bin/env tsx
/**
 * 结算演示数据一键 Seed 脚本
 * Usage: pnpm seed:settle [--keep-db] [--skip-index] [--if-needed] [--force]
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { loadEnv } from '@hermes/shared';
import { QDRANT_COLLECTIONS, OPENSEARCH_INDICES } from '@hermes/shared';
import { bindMetaDb, destroyMetaDb, getMetaKnex, MetaFieldModel, MetaTableModel, BusinessKnowledgeModel, DatasourceModel, SqlTemplateModel } from '@hermes/orm-schemas';
import { createRepositories, type AuditRepository } from '../apps/metadata-service/src/repositories/index.js';
import { syncDatasourceMetadata, type SyncTableSelection } from '../apps/metadata-service/src/services/datasource-service.js';
import { encryptSecret, newId } from '../apps/metadata-service/src/lib/crypto.js';
import { createLogger } from '@hermes/shared';
import { embedText } from '../apps/rag-service/src/lib/embedding.js';
import { QdrantClient } from '../apps/rag-service/src/lib/qdrant.js';
import { OpenSearchClient } from '../apps/rag-service/src/lib/opensearch.js';

loadEnv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETTLE_DIR = join(__dirname, 'settle');
const SQL_DIR = join(SETTLE_DIR, 'sql');

const DATASOURCE_NAME = '结算演示库';
const SETTLE_DATABASE = 'hermes_settle';
const SEED_MARKER_PATH = join(process.cwd(), '.hermes/settle-seed.done');
const SEED_MARKER_VERSION = 3;

type QueryLibraryConfig = {
  tables: {
    physicalName: string;
    description?: string;
    fields: { physicalName: string; businessName?: string; description?: string; synonyms?: string[] }[];
  }[];
};

type BusinessKnowledgeEntry = {
  title: string;
  category: 'glossary' | 'metric' | 'rule' | 'faq';
  content: string;
};

type SqlTemplateEntry = {
  name: string;
  scenarioDescription: string;
  sqlBody: string;
};

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    keepDb: args.includes('--keep-db'),
    skipIndex: args.includes('--skip-index'),
    ifNeeded: args.includes('--if-needed'),
    force: args.includes('--force'),
  };
}

function readSeedMarker(): { version: number; completedAt: string } | null {
  if (!existsSync(SEED_MARKER_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SEED_MARKER_PATH, 'utf8')) as { version: number; completedAt: string };
  } catch {
    return null;
  }
}

function writeSeedMarker(summary: {
  datasourceId: string;
  tablesSynced: number;
  fieldsSynced: number;
  queryLibraryFields: number;
  businessKnowledge: number;
  metadataIndexed: number;
  businessIndexed: number;
}): void {
  mkdirSync(join(process.cwd(), '.hermes'), { recursive: true });
  writeFileSync(
    SEED_MARKER_PATH,
    `${JSON.stringify(
      {
        version: SEED_MARKER_VERSION,
        completedAt: new Date().toISOString(),
        database: SETTLE_DATABASE,
        datasourceName: DATASOURCE_NAME,
        ...summary,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`[seed:settle] marker written: ${SEED_MARKER_PATH}`);
}

function mysqlAdminConfig() {
  return {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_ROOT_USER ?? 'root',
    password: process.env.MYSQL_ROOT_PASSWORD ?? process.env.MYSQL_PASSWORD ?? 'hermes_root',
    multipleStatements: true,
  };
}

function mysqlConfig(withDatabase = false) {
  return {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'hermes',
    password: process.env.MYSQL_PASSWORD ?? 'hermes_dev',
    ...(withDatabase ? { database: SETTLE_DATABASE } : {}),
    multipleStatements: true,
  };
}

async function runSqlFile(conn: mysql.Connection, filename: string): Promise<void> {
  const sql = readFileSync(join(SQL_DIR, filename), 'utf8');
  await conn.query(sql);
  console.log(`[seed:settle] executed ${filename}`);
}

async function phase1Mysql(keepDb: boolean): Promise<void> {
  console.log('[seed:settle] Phase 1: MySQL business database');
  if (keepDb) {
    console.log('[seed:settle] --keep-db: skipping SQL execution');
    return;
  }

  const rootConn = await mysql.createConnection(mysqlAdminConfig());
  try {
    if (!keepDb) {
      await rootConn.query(`DROP DATABASE IF EXISTS \`${SETTLE_DATABASE}\``);
      console.log(`[seed:settle] dropped database ${SETTLE_DATABASE}`);
    }
    await runSqlFile(rootConn, '01-database.sql');
    await rootConn.query(
      `GRANT ALL PRIVILEGES ON \`${SETTLE_DATABASE}\`.* TO '${process.env.MYSQL_USER ?? 'hermes'}'@'%'`,
    );
    await rootConn.query('FLUSH PRIVILEGES');
    await runSqlFile(rootConn, '02-schema.sql');
    await runSqlFile(rootConn, '03-seed-data.sql');
  } finally {
    await rootConn.end();
  }

  const verifyConn = await mysql.createConnection(mysqlConfig(true));
  try {
    const [rows] = await verifyConn.query<mysql.RowDataPacket[]>(
      'SELECT COUNT(*) AS cnt FROM hst_bill',
    );
    console.log(`[seed:settle] hst_bill rows: ${(rows[0] as { cnt: number }).cnt}`);
  } finally {
    await verifyConn.end();
  }
}

async function findOrCreateDatasource(repos: ReturnType<typeof createRepositories>): Promise<string> {
  const existing = await DatasourceModel.query().findOne({ name: DATASOURCE_NAME });
  const connection = {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    databaseName: SETTLE_DATABASE,
    username: process.env.MYSQL_USER ?? 'hermes',
    passwordEncrypted: encryptSecret(process.env.MYSQL_PASSWORD ?? 'hermes_dev'),
  };

  if (existing) {
    await repos.datasource.patch(existing.id, connection);
    console.log(`[seed:settle] updated datasource: ${existing.id}`);
    return existing.id;
  }

  const id = newId();
  await repos.datasource.insert({
    id,
    name: DATASOURCE_NAME,
    ...connection,
    connectionStatus: 'unknown',
    createdBy: null,
  });
  console.log(`[seed:settle] created datasource: ${id}`);
  return id;
}

function buildSelectiveTablesFromQueryLibrary(config: QueryLibraryConfig): SyncTableSelection[] {
  return config.tables.map((table) => ({
    physicalName: table.physicalName,
    fields: table.fields.map((f) => f.physicalName),
  }));
}

function loadQueryLibraryConfig(): QueryLibraryConfig {
  return JSON.parse(readFileSync(join(SETTLE_DIR, 'query-library.json'), 'utf8')) as QueryLibraryConfig;
}

async function enableAllQueryLibrary(datasourceId: string): Promise<number> {
  const tables = await MetaTableModel.query()
    .where('datasource_id', datasourceId)
    .where('source_status', 'active')
    .select('id');

  if (tables.length === 0) return 0;

  const tableIds = tables.map((t) => t.id);
  await MetaTableModel.query().whereIn('id', tableIds).patch({ inQueryLibrary: true });

  const fieldCount = await MetaFieldModel.query()
    .whereIn('table_id', tableIds)
    .where('source_status', 'active')
    .patch({ inQueryLibrary: true });

  return fieldCount;
}

async function applyQueryLibraryEnrichment(
  datasourceId: string,
  config: QueryLibraryConfig,
): Promise<number> {
  let fieldCount = 0;
  for (const tableCfg of config.tables) {
    const table = await MetaTableModel.query().findOne({
      datasource_id: datasourceId,
      physical_name: tableCfg.physicalName,
    });
    if (!table) {
      console.warn(`[seed:settle] table not found after sync: ${tableCfg.physicalName}`);
      continue;
    }

    await MetaTableModel.query().patchAndFetchById(table.id, {
      description: tableCfg.description ?? table.description,
    });

    for (const fieldCfg of tableCfg.fields) {
      const field = await MetaFieldModel.query().findOne({
        table_id: table.id,
        physical_name: fieldCfg.physicalName,
      });
      if (!field) {
        console.warn(`[seed:settle] field not found: ${tableCfg.physicalName}.${fieldCfg.physicalName}`);
        continue;
      }

      await MetaFieldModel.query().patchAndFetchById(field.id, {
        businessName: fieldCfg.businessName ?? field.businessName,
        description: fieldCfg.description ?? field.description,
      });

      if (fieldCfg.synonyms?.length) {
        const knex = getMetaKnex();
        await knex('field_synonyms').delete().where('field_id', field.id);
        for (const synonym of fieldCfg.synonyms) {
          await knex('field_synonyms').insert({
            id: crypto.randomUUID(),
            field_id: field.id,
            synonym,
          });
        }
      }
      fieldCount += 1;
    }
  }
  return fieldCount;
}

async function upsertBusinessKnowledge(entries: BusinessKnowledgeEntry[]): Promise<number> {
  let count = 0;
  for (const entry of entries) {
    const existing = await BusinessKnowledgeModel.query().findOne({ title: entry.title });
    if (existing) {
      await BusinessKnowledgeModel.query().patchAndFetchById(existing.id, {
        category: entry.category,
        content: entry.content,
        status: 'active',
      });
    } else {
      await BusinessKnowledgeModel.query().insert({
        id: crypto.randomUUID(),
        title: entry.title,
        category: entry.category,
        content: entry.content,
        status: 'active',
        createdBy: null,
      });
    }
    count += 1;
  }
  return count;
}

async function upsertSqlTemplates(entries: SqlTemplateEntry[]): Promise<number> {
  let count = 0;
  for (const entry of entries) {
    const existing = await SqlTemplateModel.query().findOne({ name: entry.name });
    if (existing) {
      await SqlTemplateModel.query().patchAndFetchById(existing.id, {
        scenarioDescription: entry.scenarioDescription,
        sqlBody: entry.sqlBody,
        inLibrary: true,
        status: 'active',
      });
    } else {
      await SqlTemplateModel.query().insert({
        id: crypto.randomUUID(),
        name: entry.name,
        scenarioDescription: entry.scenarioDescription,
        sqlBody: entry.sqlBody,
        inLibrary: true,
        status: 'active',
        usageCount: 0,
        createdBy: null,
      });
    }
    count += 1;
  }
  return count;
}

type LibraryField = Awaited<ReturnType<ReturnType<typeof createRepositories>['meta']['listFieldsForLibrary']>>[number];

function buildMetadataDocs(fields: LibraryField[]) {
  return fields.map((f) => {
    const synonymText = (f.synonyms ?? []).map((s: { synonym: string }) => s.synonym).join(' ');
    const content = [
      f.tablePhysicalName,
      f.tableBusinessName,
      f.physicalName,
      f.businessName,
      f.description,
      f.dataType,
      synonymText,
    ].filter(Boolean).join(' ');
    return {
      id: f.id,
      content,
      metadata: {
        tableId: f.tableId,
        tableName: f.tablePhysicalName,
        fieldName: f.physicalName,
        type: 'field',
      },
    };
  });
}

async function indexMetadata(repos: ReturnType<typeof createRepositories>): Promise<number> {
  const fields = await repos.meta.listFieldsForLibrary();
  const docs = buildMetadataDocs(fields);
  const points = docs.map((d) => ({
    id: d.id,
    vector: embedText(d.content),
    payload: { content: d.content, metadata: d.metadata },
  }));

  const os = new OpenSearchClient();
  const qdrant = new QdrantClient();
  await Promise.all([
    os.bulkIndex(OPENSEARCH_INDICES.METADATA, docs),
    qdrant.upsertPoints(QDRANT_COLLECTIONS.METADATA, points),
  ]);
  return docs.length;
}

async function indexBusiness(): Promise<number> {
  const items = await BusinessKnowledgeModel.query().where('status', 'active');
  const docs = items.map((item) => ({
    id: item.id,
    content: [item.title, item.category, item.content].join(' '),
    metadata: { type: item.category, title: item.title },
  }));
  const points = docs.map((d) => ({
    id: d.id,
    vector: embedText(d.content),
    payload: { content: d.content, metadata: d.metadata },
  }));

  const os = new OpenSearchClient();
  const qdrant = new QdrantClient();
  await Promise.all([
    os.bulkIndex(OPENSEARCH_INDICES.BUSINESS, docs),
    qdrant.upsertPoints(QDRANT_COLLECTIONS.BUSINESS, points),
  ]);
  return docs.length;
}

async function indexTemplates(): Promise<number> {
  const items = await SqlTemplateModel.query().where('status', 'active').where('in_library', true);
  const docs = items.map((t) => ({
    id: t.id,
    content: [t.name, t.scenarioDescription, t.sqlBody].join(' '),
    metadata: { type: 'sql' as const, name: t.name },
  }));
  const points = docs.map((d) => ({
    id: d.id,
    vector: embedText(d.content),
    payload: { content: d.content, metadata: d.metadata },
  }));

  const os = new OpenSearchClient();
  const qdrant = new QdrantClient();
  await Promise.all([
    os.bulkIndex(OPENSEARCH_INDICES.TEMPLATES, docs),
    qdrant.upsertPoints(QDRANT_COLLECTIONS.TEMPLATES, points),
  ]);
  return docs.length;
}

async function phase2HermesMeta(
  repos: ReturnType<typeof createRepositories>,
  logger: ReturnType<typeof createLogger>,
  datasourceId: string,
): Promise<{
  tablesSynced: number;
  fieldsSynced: number;
  queryLibraryFields: number;
  businessKnowledge: number;
  sqlTemplates: number;
}> {
  console.log('[seed:settle] Phase 2: Hermes metadata');

  const ds = await DatasourceModel.query().findById(datasourceId);
  if (!ds) throw new Error(`Datasource not found: ${datasourceId}`);

  const qlConfig = loadQueryLibraryConfig();
  const noopAudit = { create: async () => {} } as unknown as AuditRepository;

  // 全量同步：写入全部表/字段，默认全部纳入查询库
  const fullSyncResult = await syncDatasourceMetadata(
    ds,
    repos.meta,
    repos.datasource,
    noopAudit,
    logger,
    `seed-${Date.now()}`,
    { mode: 'full', defaultInQueryLibrary: true },
  );
  console.log(
    `[seed:settle] full sync: tables=${fullSyncResult.tablesSynced} fields=${fullSyncResult.fieldsSynced}`,
  );

  // 选择性同步：刷新 query-library 配置中的表/字段元数据（描述、同义词等）
  const selectiveResult = await syncDatasourceMetadata(
    ds,
    repos.meta,
    repos.datasource,
    noopAudit,
    logger,
    `seed-selective-${Date.now()}`,
    {
      mode: 'selective',
      tables: buildSelectiveTablesFromQueryLibrary(qlConfig),
      defaultInQueryLibrary: true,
    },
  );
  console.log(
    `[seed:settle] selective sync (query-library): tables=${selectiveResult.tablesSynced} fields=${selectiveResult.fieldsSynced}`,
  );

  const queryLibraryFields = await enableAllQueryLibrary(datasourceId);
  console.log(`[seed:settle] query library enabled for all fields: ${queryLibraryFields}`);

  await applyQueryLibraryEnrichment(datasourceId, qlConfig);
  console.log('[seed:settle] query library enrichment applied from query-library.json');

  const bkEntries = JSON.parse(
    readFileSync(join(SETTLE_DIR, 'business-knowledge.json'), 'utf8'),
  ) as BusinessKnowledgeEntry[];
  const businessKnowledge = await upsertBusinessKnowledge(bkEntries);
  console.log(`[seed:settle] business knowledge upserted: ${businessKnowledge}`);

  const templateEntries = JSON.parse(
    readFileSync(join(SETTLE_DIR, 'sql-templates.json'), 'utf8'),
  ) as SqlTemplateEntry[];
  const sqlTemplates = await upsertSqlTemplates(templateEntries);
  console.log(`[seed:settle] sql templates upserted: ${sqlTemplates}`);

  return {
    tablesSynced: fullSyncResult.tablesSynced,
    fieldsSynced: fullSyncResult.fieldsSynced,
    queryLibraryFields,
    businessKnowledge,
    sqlTemplates,
  };
}

async function phase3Index(repos: ReturnType<typeof createRepositories>): Promise<{
  metadataIndexed: number;
  businessIndexed: number;
  templatesIndexed: number;
}> {
  console.log('[seed:settle] Phase 3: Vector index');
  const metadataIndexed = await indexMetadata(repos);
  const businessIndexed = await indexBusiness();
  const templatesIndexed = await indexTemplates();
  console.log(
    `[seed:settle] indexed metadata=${metadataIndexed} business=${businessIndexed} templates=${templatesIndexed}`,
  );
  return { metadataIndexed, businessIndexed, templatesIndexed };
}

async function main(): Promise<void> {
  const { keepDb, skipIndex, ifNeeded, force } = parseArgs();

  if (ifNeeded && !force) {
    const marker = readSeedMarker();
    if (marker && marker.version >= SEED_MARKER_VERSION) {
      console.log(
        `[seed:settle] already applied at ${marker.completedAt} (v${marker.version}), skipping (--force to re-run)`,
      );
      return;
    }
    if (marker && marker.version < SEED_MARKER_VERSION) {
      console.log(
        `[seed:settle] marker v${marker.version} < v${SEED_MARKER_VERSION}, re-running seed`,
      );
    }
  }

  console.log(`[seed:settle] start (keepDb=${keepDb}, skipIndex=${skipIndex}, force=${force})`);

  await phase1Mysql(keepDb);

  bindMetaDb();
  const logger = createLogger({ service: 'seed-settle' });
  const repos = createRepositories(logger);
  const datasourceId = await findOrCreateDatasource(repos);

  const metaResult = await phase2HermesMeta(repos, logger, datasourceId);

  let indexResult = { metadataIndexed: 0, businessIndexed: 0, templatesIndexed: 0 };
  if (!skipIndex) {
    try {
      indexResult = await phase3Index(repos);
    } catch (err) {
      console.error('[seed:settle] vector index failed:', err instanceof Error ? err.message : err);
      console.error('[seed:settle] ensure Qdrant and OpenSearch are running (make infra)');
      process.exit(1);
    }
  }

  await destroyMetaDb();

  console.log('\n[seed:settle] ===== Summary =====');
  console.log(`  Database:        ${SETTLE_DATABASE}`);
  console.log(`  Datasource ID:   ${datasourceId}`);
  console.log(`  请在 .env 设置:   DEFAULT_DATASOURCE_ID=${datasourceId}`);
  console.log(`  Tables synced:   ${metaResult.tablesSynced}`);
  console.log(`  Fields synced:   ${metaResult.fieldsSynced}`);
  console.log(`  Query library:   ${metaResult.queryLibraryFields} fields`);
  console.log(`  Business knowledge: ${metaResult.businessKnowledge} entries`);
  if (!skipIndex) {
    console.log(`  Qdrant metadata: ${indexResult.metadataIndexed} points`);
    console.log(`  Qdrant business: ${indexResult.businessIndexed} points`);
    console.log(`  Qdrant templates: ${indexResult.templatesIndexed} points`);
  }
  writeSeedMarker({
    datasourceId,
    tablesSynced: metaResult.tablesSynced,
    fieldsSynced: metaResult.fieldsSynced,
    queryLibraryFields: metaResult.queryLibraryFields,
    businessKnowledge: metaResult.businessKnowledge,
    metadataIndexed: indexResult.metadataIndexed,
    businessIndexed: indexResult.businessIndexed,
  });
  console.log('[seed:settle] done');
}

main().catch((err) => {
  console.error('[seed:settle] failed:', err);
  process.exit(1);
});
