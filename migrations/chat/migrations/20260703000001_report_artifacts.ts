import type { Knex } from 'knex';
import { addTimestamps, uuidPrimaryKey } from '../../_shared/schema-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('report_artifacts', (table) => {
    uuidPrimaryKey(table);
    table.string('message_id', 36).nullable();
    table.string('user_id', 36).notNullable();
    table.json('spec_json').notNullable();
    table.enum('output_format', ['inline', 'web', 'word']).notNullable();
    table.string('storage_key', 512).nullable();
    table.string('share_token', 64).nullable();
    table.timestamp('share_expires_at', { useTz: false, precision: 3 }).nullable();
    table.enum('status', ['pending', 'ready', 'failed']).notNullable().defaultTo('pending');
    table.json('artifact_json').nullable();
    addTimestamps(table, knex);
    table.unique(['share_token']);
    table.index(['user_id', 'created_at']);
    table.index(['message_id']);
  });

  await knex.schema.createTable('published_queries', (table) => {
    uuidPrimaryKey(table);
    table.string('report_id', 36).notNullable();
    table.text('sql_template').notNullable();
    table.string('datasource_id', 36).notNullable();
    table.json('parameters_schema').nullable();
    table.enum('auth_mode', ['owner', 'token', 'api_key']).notNullable().defaultTo('token');
    table.string('share_token', 64).nullable();
    addTimestamps(table, knex);
    table.index(['report_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('published_queries');
  await knex.schema.dropTableIfExists('report_artifacts');
}
