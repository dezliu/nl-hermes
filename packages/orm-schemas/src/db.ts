import knex, { type Knex } from 'knex';
import { Model } from 'objection';

export type MetaDbConfig = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
};

let metaKnex: Knex | null = null;

export function createMetaKnex(config: MetaDbConfig = {}): Knex {
  return knex({
    client: 'mysql2',
    connection: {
      host: config.host ?? process.env.MYSQL_HOST ?? 'localhost',
      port: Number(config.port ?? process.env.MYSQL_PORT ?? 3306),
      user: config.user ?? process.env.MYSQL_USER ?? 'hermes',
      password: config.password ?? process.env.MYSQL_PASSWORD ?? 'hermes_dev',
      database: config.database ?? 'hermes_meta',
    },
    pool: { min: 0, max: 10 },
  });
}

export function bindMetaDb(knexInstance?: Knex): Knex {
  metaKnex = knexInstance ?? createMetaKnex();
  Model.knex(metaKnex);
  return metaKnex;
}

export function getMetaKnex(): Knex {
  if (!metaKnex) {
    return bindMetaDb();
  }
  return metaKnex;
}

export async function destroyMetaDb(): Promise<void> {
  if (metaKnex) {
    await metaKnex.destroy();
    metaKnex = null;
  }
}
