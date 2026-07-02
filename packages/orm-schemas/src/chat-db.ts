import knex, { type Knex } from 'knex';
import { Model } from 'objection';
import { loadEnv } from '@hermes/shared';

loadEnv();

export type ChatDbConfig = {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
};

let chatKnex: Knex | null = null;

export function createChatKnex(config: ChatDbConfig = {}): Knex {
  return knex({
    client: 'mysql2',
    connection: {
      host: config.host ?? process.env.MYSQL_HOST ?? 'localhost',
      port: Number(config.port ?? process.env.MYSQL_PORT ?? 3307),
      user: config.user ?? process.env.MYSQL_USER ?? 'hermes',
      password: config.password ?? process.env.MYSQL_PASSWORD ?? 'hermes_dev',
      database: config.database ?? 'hermes_chat',
    },
    pool: { min: 0, max: 10 },
  });
}

export function bindChatDb(knexInstance?: Knex): Knex {
  chatKnex = knexInstance ?? createChatKnex();
  Model.knex(chatKnex);
  return chatKnex;
}

export function getChatKnex(): Knex {
  if (!chatKnex) {
    return bindChatDb();
  }
  return chatKnex;
}

export async function destroyChatDb(): Promise<void> {
  if (chatKnex) {
    await chatKnex.destroy();
    chatKnex = null;
  }
}
