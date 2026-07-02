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

  for (const schema of SCHEMAS) {
    await migrateSchema(schema.name, schema.config);
  }
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
