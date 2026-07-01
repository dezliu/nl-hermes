import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Phase 2: full table definitions per architecture plan
  await knex.raw('SELECT 1');
}

export async function down(knex: Knex): Promise<void> {
  // rollback placeholder
}
