import type { Knex } from 'knex';

export function uuidPrimaryKey(table: Knex.CreateTableBuilder, name = 'id'): void {
  table.string(name, 36).primary();
}

export function addTimestamps(table: Knex.CreateTableBuilder, knex: Knex): void {
  table
    .timestamp('created_at', { useTz: false, precision: 3 })
    .notNullable()
    .defaultTo(knex.fn.now(3));
  table
    .timestamp('updated_at', { useTz: false, precision: 3 })
    .notNullable()
    .defaultTo(knex.fn.now(3));
}

export const SOURCE_ENUM = ['sync', 'manual'] as const;
export const SOURCE_STATUS_ENUM = ['active', 'removed_at_source'] as const;
