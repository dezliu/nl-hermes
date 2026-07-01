import type { Knex } from 'knex';
import { addTimestamps, uuidPrimaryKey } from '../../_shared/schema-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('conversations', (table) => {
    uuidPrimaryKey(table);
    table.string('user_id', 36).notNullable();
    table.string('title', 256).notNullable();
    table.enum('mode', ['sql', 'report']).notNullable();
    addTimestamps(table, knex);
    table.timestamp('last_active_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.index(['user_id', 'last_active_at']);
  });

  await knex.schema.createTable('messages', (table) => {
    uuidPrimaryKey(table);
    table.string('conversation_id', 36).notNullable().references('id').inTable('conversations');
    table.enum('role', ['user', 'assistant', 'system']).notNullable();
    table.specificType('content', 'MEDIUMTEXT').notNullable();
    table.enum('mode', ['sql', 'report']).notNullable();
    table.string('template_id', 36).nullable();
    table.enum('template_type', ['sql', 'report']).nullable();
    table.enum('status', ['completed', 'interrupted', 'failed']).notNullable().defaultTo('completed');
    table.json('metadata').nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.index(['conversation_id', 'created_at']);
  });

  await knex.schema.createTable('workflow_checkpoints', (table) => {
    uuidPrimaryKey(table);
    table.string('conversation_id', 36).notNullable().references('id').inTable('conversations');
    table.string('run_id', 36).notNullable();
    table.json('graph_state').nullable();
    table.string('redis_ref', 256).nullable();
    table.enum('status', ['running', 'interrupted', 'completed', 'failed']).notNullable().defaultTo('running');
    addTimestamps(table, knex);
    table.unique(['conversation_id', 'run_id']);
    table.index(['status']);
  });

  await knex.schema.createTable('message_feedback', (table) => {
    uuidPrimaryKey(table);
    table.string('message_id', 36).notNullable().references('id').inTable('messages');
    table.string('user_id', 36).notNullable();
    table.enum('rating', ['up', 'down']).notNullable();
    table.string('reason', 512).nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.unique(['message_id', 'user_id']);
  });

  await knex.schema.createTable('generation_audit', (table) => {
    uuidPrimaryKey(table);
    table.string('user_id', 36).notNullable();
    table.enum('mode', ['sql', 'report']).notNullable();
    table.boolean('used_template').notNullable().defaultTo(false);
    table.boolean('interrupted').notNullable().defaultTo(false);
    table.string('trace_id', 64).nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.index(['user_id', 'created_at']);
    table.index(['trace_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('generation_audit');
  await knex.schema.dropTableIfExists('message_feedback');
  await knex.schema.dropTableIfExists('workflow_checkpoints');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversations');
}
