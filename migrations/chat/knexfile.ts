import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER ?? 'hermes',
    password: process.env.MYSQL_PASSWORD ?? 'hermes_dev',
    database: 'hermes_chat',
  },
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
};

export default config;
