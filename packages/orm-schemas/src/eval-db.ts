import knex, { type Knex } from 'knex';
import { Model } from 'objection';
import { loadEnv } from '@hermes/shared';

loadEnv();

export type EvalDbConfig = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
};

let evalKnex: Knex | null = null;

export function createEvalKnex(config: EvalDbConfig = {}): Knex {
  return knex({
    client: 'mysql2',
    connection: {
      host: config.host ?? process.env.MYSQL_HOST ?? 'localhost',
      port: Number(config.port ?? process.env.MYSQL_PORT ?? 3307),
      user: config.user ?? process.env.MYSQL_USER ?? 'hermes',
      password: config.password ?? process.env.MYSQL_PASSWORD ?? 'hermes_dev',
      database: config.database ?? 'hermes_eval',
    },
    pool: { min: 0, max: 10 },
  });
}

export function bindEvalDb(knexInstance?: Knex): Knex {
  evalKnex = knexInstance ?? createEvalKnex();
  Model.knex(evalKnex);
  return evalKnex;
}

export function getEvalKnex(): Knex {
  if (!evalKnex) {
    return bindEvalDb();
  }
  return evalKnex;
}

export async function destroyEvalDb(): Promise<void> {
  if (evalKnex) {
    await evalKnex.destroy();
    evalKnex = null;
  }
}
