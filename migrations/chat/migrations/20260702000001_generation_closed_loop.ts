import type { Knex } from 'knex';
import { uuidPrimaryKey } from '../../_shared/schema-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('generation_feedback_items', (table) => {
    uuidPrimaryKey(table);
    table.string('message_id', 36).notNullable().unique();
    table.string('conversation_id', 36).notNullable();
    table.enum('mode', ['sql', 'report']).notNullable();
    table.text('user_query').notNullable();
    table.text('assistant_content').notNullable();
    table.text('generated_sql').nullable();
    table.text('refuse_reason').nullable();
    table.decimal('rag_score', 5, 4).nullable();
    table.string('feedback_reason', 512).notNullable();
    table.enum('status', ['open', 'resolved']).notNullable().defaultTo('open');
    table.string('resolved_by', 36).nullable();
    table.timestamp('resolved_at', { useTz: false, precision: 3 }).nullable();
    table.string('result_template_id', 36).nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.index(['status', 'created_at']);
  });

  await knex.schema.alterTable('generation_audit', (table) => {
    table.string('message_id', 36).nullable().after('user_id');
    table.index(['message_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('generation_audit', (table) => {
    table.dropIndex(['message_id']);
    table.dropColumn('message_id');
  });
  await knex.schema.dropTableIfExists('generation_feedback_items');
}
