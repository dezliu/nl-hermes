import { loadEnv } from '@hermes/shared';
import knex, { type Knex } from 'knex';
import metaConfig from '../migrations/meta/knexfile.js';
import chatConfig from '../migrations/chat/knexfile.js';
import evalConfig from '../migrations/eval/knexfile.js';

loadEnv();

const SCHEMAS = [
  { name: 'hermes_meta', config: metaConfig },
  { name: 'hermes_chat', config: chatConfig },
  { name: 'hermes_eval', config: evalConfig },
] as const;

async function migrateSchema(name: string, config: Knex.Config): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c04ef'},body:JSON.stringify({sessionId:'9c04ef',location:'scripts/migrate.ts:migrateSchema',message:'migrate schema start',data:{name,host:process.env.MYSQL_HOST,port:process.env.MYSQL_PORT},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  const db = knex(config);
  try {
    const [batch, migrations] = await db.migrate.latest();
    if (migrations.length === 0) {
      console.log(`[migrate] ${name}: already up to date`);
    } else {
      console.log(`[migrate] ${name}: batch ${batch} -> ${migrations.join(', ')}`);
    }
  } finally {
    await db.destroy();
  }
}

async function main(): Promise<void> {
  loadEnv();
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c04ef'},body:JSON.stringify({sessionId:'9c04ef',location:'scripts/migrate.ts:main',message:'migrate main start',data:{host:process.env.MYSQL_HOST,port:process.env.MYSQL_PORT,schemaCount:SCHEMAS.length},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
  // #endregion

  for (const schema of SCHEMAS) {
    await migrateSchema(schema.name, schema.config);
  }
}

main().catch((err) => {
  // #region agent log
  fetch('http://127.0.0.1:7876/ingest/a10af35d-fe0f-499b-a73b-d9b447f06006',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'9c04ef'},body:JSON.stringify({sessionId:'9c04ef',location:'scripts/migrate.ts:main.catch',message:'migrate failed',data:{code:(err as NodeJS.ErrnoException).code,message:String(err)},timestamp:Date.now(),hypothesisId:'A',runId:'post-fix'})}).catch(()=>{});
  // #endregion
  console.error('[migrate] failed:', err);
  process.exit(1);
});
