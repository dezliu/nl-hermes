import type { Knex } from 'knex';
import { uuidPrimaryKey } from '../../_shared/schema-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('template_candidates', (table) => {
    uuidPrimaryKey(table);
    table.string('source_message_id', 36).notNullable().unique();
    table.string('conversation_id', 36).notNullable();
    table.enum('mode', ['sql', 'report']).notNullable();
    table.text('user_query').notNullable();
    table.text('scenario_description').notNullable();
    table.text('sql_body').notNullable();
    table.enum('chart_type', ['line', 'bar', 'table']).nullable();
    table.json('chart_config').nullable();
    table.decimal('rag_score', 5, 4).nullable();
    table.boolean('user_upvoted').notNullable().defaultTo(false);
    table.integer('priority').unsigned().notNullable().defaultTo(0);
    table.enum('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    table.string('template_id', 36).nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.index(['status', 'priority']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('template_candidates');
}
