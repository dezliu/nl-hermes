import type { Knex } from 'knex';
import { addTimestamps, uuidPrimaryKey } from '../../_shared/schema-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('eval_sets', (table) => {
    uuidPrimaryKey(table);
    table.string('name', 256).notNullable();
    table.text('description').nullable();
    table.boolean('is_preset').notNullable().defaultTo(false);
    addTimestamps(table, knex);
    table.index(['is_preset']);
  });

  await knex.schema.createTable('eval_cases', (table) => {
    uuidPrimaryKey(table);
    table.string('eval_set_id', 36).notNullable().references('id').inTable('eval_sets');
    table.text('question').notNullable();
    table.enum('mode', ['sql', 'report']).notNullable();
    table.json('expected_tables').nullable();
    table.text('expected_points').nullable();
    table.integer('sort_order').unsigned().notNullable().defaultTo(0);
    addTimestamps(table, knex);
    table.index(['eval_set_id', 'sort_order']);
  });

  await knex.schema.createTable('eval_runs', (table) => {
    uuidPrimaryKey(table);
    table.string('eval_set_id', 36).notNullable().references('id').inTable('eval_sets');
    table.enum('status', ['pending', 'running', 'completed', 'cancelled', 'failed']).notNullable().defaultTo('pending');
    table.decimal('progress', 5, 2).notNullable().defaultTo(0);
    table.json('summary').nullable();
    table.string('started_by', 36).nullable();
    table.timestamp('started_at', { useTz: false, precision: 3 }).nullable();
    table.timestamp('finished_at', { useTz: false, precision: 3 }).nullable();
    addTimestamps(table, knex);
    table.index(['eval_set_id', 'status']);
  });

  await knex.schema.createTable('eval_results', (table) => {
    uuidPrimaryKey(table);
    table.string('eval_run_id', 36).notNullable().references('id').inTable('eval_runs');
    table.string('eval_case_id', 36).notNullable().references('id').inTable('eval_cases');
    table.boolean('retrieval_hit').nullable();
    table.boolean('generate_success').nullable();
    table.decimal('score', 5, 2).nullable();
    table.json('actual_output').nullable();
    table.text('diff_notes').nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.unique(['eval_run_id', 'eval_case_id']);
    table.index(['eval_run_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('eval_results');
  await knex.schema.dropTableIfExists('eval_runs');
  await knex.schema.dropTableIfExists('eval_cases');
  await knex.schema.dropTableIfExists('eval_sets');
}
