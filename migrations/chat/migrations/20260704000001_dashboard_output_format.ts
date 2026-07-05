import type { Knex } from 'knex';

/** Extend report_artifacts.output_format enum to include dashboard */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    "ALTER TABLE report_artifacts MODIFY COLUMN output_format ENUM('inline', 'web', 'word', 'dashboard') NOT NULL",
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex('report_artifacts').where('output_format', 'dashboard').update({ output_format: 'inline' });
  await knex.raw(
    "ALTER TABLE report_artifacts MODIFY COLUMN output_format ENUM('inline', 'web', 'word') NOT NULL",
  );
}
