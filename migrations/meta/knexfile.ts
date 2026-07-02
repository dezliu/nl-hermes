import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Knex } from 'knex';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: Number(process.env.MYSQL_PORT ?? 3307),
    user: process.env.MYSQL_USER ?? 'hermes',
    password: process.env.MYSQL_PASSWORD ?? 'hermes_dev',
    database: 'hermes_meta',
  },
  migrations: {
    directory: join(__dirname, 'migrations'),
    extension: 'ts',
  },
};

export default config;
