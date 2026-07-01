import type { Knex } from 'knex';
import {
  addTimestamps,
  SOURCE_ENUM,
  SOURCE_STATUS_ENUM,
  uuidPrimaryKey,
} from '../../_shared/schema-helpers.js';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('roles', (table) => {
    uuidPrimaryKey(table);
    table.string('code', 32).notNullable().unique();
    table.string('name', 64).notNullable();
    table.string('description', 512).nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
  });

  await knex.schema.createTable('users', (table) => {
    uuidPrimaryKey(table);
    table.string('username', 64).notNullable().unique();
    table.string('email', 255).notNullable();
    table.string('display_name', 128).notNullable();
    table.string('role_id', 36).notNullable().references('id').inTable('roles');
    table.enum('status', ['active', 'disabled']).notNullable().defaultTo('active');
    addTimestamps(table, knex);
    table.index(['role_id']);
  });

  await knex.schema.createTable('datasources', (table) => {
    uuidPrimaryKey(table);
    table.string('name', 128).notNullable();
    table.string('host', 255).notNullable();
    table.integer('port').unsigned().notNullable();
    table.string('database_name', 128).notNullable();
    table.string('username', 128).notNullable();
    table.text('password_encrypted').notNullable();
    table.enum('connection_status', ['unknown', 'ok', 'failed']).notNullable().defaultTo('unknown');
    table.timestamp('last_tested_at', { useTz: false, precision: 3 }).nullable();
    table.timestamp('last_synced_at', { useTz: false, precision: 3 }).nullable();
    table.string('created_by', 36).nullable();
    addTimestamps(table, knex);
  });

  await knex.schema.createTable('meta_tables', (table) => {
    uuidPrimaryKey(table);
    table.string('datasource_id', 36).notNullable().references('id').inTable('datasources');
    table.string('physical_name', 128).notNullable();
    table.string('business_name', 128).nullable();
    table.text('description').nullable();
    table.enum('source', SOURCE_ENUM).notNullable().defaultTo('sync');
    table.enum('source_status', SOURCE_STATUS_ENUM).notNullable().defaultTo('active');
    table.boolean('in_query_library').notNullable().defaultTo(false);
    addTimestamps(table, knex);
    table.unique(['datasource_id', 'physical_name']);
    table.index(['in_query_library']);
  });

  await knex.schema.createTable('meta_fields', (table) => {
    uuidPrimaryKey(table);
    table.string('table_id', 36).notNullable().references('id').inTable('meta_tables');
    table.string('physical_name', 128).notNullable();
    table.string('business_name', 128).nullable();
    table.text('description').nullable();
    table.string('data_type', 64).notNullable();
    table.boolean('is_sensitive').notNullable().defaultTo(false);
    table.enum('source', SOURCE_ENUM).notNullable().defaultTo('sync');
    table.enum('source_status', SOURCE_STATUS_ENUM).notNullable().defaultTo('active');
    table.boolean('in_query_library').notNullable().defaultTo(false);
    addTimestamps(table, knex);
    table.unique(['table_id', 'physical_name']);
    table.index(['in_query_library']);
  });

  await knex.schema.createTable('field_synonyms', (table) => {
    uuidPrimaryKey(table);
    table.string('field_id', 36).notNullable().references('id').inTable('meta_fields');
    table.string('synonym', 128).notNullable();
    table.index(['field_id']);
    table.unique(['field_id', 'synonym']);
  });

  await knex.schema.createTable('role_table_permissions', (table) => {
    uuidPrimaryKey(table);
    table.string('role_id', 36).notNullable().references('id').inTable('roles');
    table.string('table_id', 36).notNullable().references('id').inTable('meta_tables');
    table.boolean('can_query').notNullable().defaultTo(false);
    table.unique(['role_id', 'table_id']);
  });

  await knex.schema.createTable('role_field_permissions', (table) => {
    uuidPrimaryKey(table);
    table.string('role_id', 36).notNullable().references('id').inTable('roles');
    table.string('field_id', 36).notNullable().references('id').inTable('meta_fields');
    table.boolean('can_query').notNullable().defaultTo(false);
    table.enum('mask_type', ['none', 'phone', 'id_card']).notNullable().defaultTo('none');
    table.unique(['role_id', 'field_id']);
  });

  await knex.schema.createTable('business_knowledge', (table) => {
    uuidPrimaryKey(table);
    table.string('title', 256).notNullable();
    table.enum('category', ['glossary', 'metric', 'rule', 'faq']).notNullable();
    table.text('content').notNullable();
    table.enum('status', ['active', 'archived']).notNullable().defaultTo('active');
    table.string('vector_id', 128).nullable();
    table.string('created_by', 36).nullable();
    addTimestamps(table, knex);
    table.index(['status', 'category']);
  });

  await knex.schema.createTable('field_samples', (table) => {
    uuidPrimaryKey(table);
    table.string('field_id', 36).notNullable().references('id').inTable('meta_fields');
    table.enum('sample_type', ['distinct_values', 'value_range', 'distribution']).notNullable();
    table.json('sample_data').notNullable();
    table.timestamp('synced_at', { useTz: false, precision: 3 }).nullable();
    table.string('vector_id', 128).nullable();
    table.index(['field_id']);
  });

  await knex.schema.createTable('prompt_versions', (table) => {
    uuidPrimaryKey(table);
    table.string('role_id', 36).nullable().references('id').inTable('roles');
    table.text('persona').notNullable();
    table.text('constraints').notNullable();
    table.integer('version').unsigned().notNullable();
    table.boolean('is_active').notNullable().defaultTo(false);
    table.string('created_by', 36).nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.index(['role_id', 'is_active']);
  });

  await knex.schema.createTable('sql_templates', (table) => {
    uuidPrimaryKey(table);
    table.string('name', 256).notNullable();
    table.text('scenario_description').notNullable();
    table.text('sql_body').notNullable();
    table.json('placeholders').nullable();
    table.decimal('score', 5, 2).nullable();
    table.integer('usage_count').unsigned().notNullable().defaultTo(0);
    table.decimal('success_rate', 5, 4).nullable();
    table.decimal('satisfaction_avg', 5, 2).nullable();
    table.boolean('in_library').notNullable().defaultTo(false);
    table.enum('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft');
    table.string('vector_id', 128).nullable();
    table.string('created_by', 36).nullable();
    addTimestamps(table, knex);
    table.index(['in_library', 'status']);
  });

  await knex.schema.createTable('report_templates', (table) => {
    uuidPrimaryKey(table);
    table.string('name', 256).notNullable();
    table.text('scenario_description').notNullable();
    table.text('sql_body').notNullable();
    table.enum('chart_type', ['line', 'bar', 'table']).notNullable();
    table.json('chart_config').nullable();
    table.json('placeholders').nullable();
    table.decimal('score', 5, 2).nullable();
    table.integer('usage_count').unsigned().notNullable().defaultTo(0);
    table.decimal('success_rate', 5, 4).nullable();
    table.decimal('satisfaction_avg', 5, 2).nullable();
    table.boolean('in_library').notNullable().defaultTo(false);
    table.enum('status', ['draft', 'active', 'archived']).notNullable().defaultTo('draft');
    table.string('vector_id', 128).nullable();
    table.string('created_by', 36).nullable();
    addTimestamps(table, knex);
    table.index(['in_library', 'status']);
  });

  await knex.schema.createTable('system_settings', (table) => {
    uuidPrimaryKey(table);
    table.enum('category', ['rag', 'sql', 'report', 'security']).notNullable();
    table.string('setting_key', 128).notNullable();
    table.json('setting_value').notNullable();
    table.string('updated_by', 36).nullable();
    table.timestamp('updated_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.unique(['category', 'setting_key']);
  });

  await knex.schema.createTable('alerts', (table) => {
    uuidPrimaryKey(table);
    table.string('type', 64).notNullable();
    table.enum('level', ['info', 'warning', 'error', 'critical']).notNullable().defaultTo('info');
    table.string('title', 256).notNullable();
    table.text('message').notNullable();
    table.string('ref_type', 64).nullable();
    table.string('ref_id', 36).nullable();
    table.enum('status', ['open', 'acknowledged', 'resolved']).notNullable().defaultTo('open');
    table.timestamp('resolved_at', { useTz: false, precision: 3 }).nullable();
    table.string('resolved_by', 36).nullable();
    addTimestamps(table, knex);
    table.index(['status', 'level']);
    table.index(['type']);
  });

  await knex.schema.createTable('audit_logs', (table) => {
    uuidPrimaryKey(table);
    table.string('actor_id', 36).nullable();
    table.string('action', 128).notNullable();
    table.string('resource_type', 64).notNullable();
    table.string('resource_id', 36).nullable();
    table.json('before_snapshot').nullable();
    table.json('after_snapshot').nullable();
    table.string('trace_id', 64).nullable();
    table.timestamp('created_at', { useTz: false, precision: 3 }).notNullable().defaultTo(knex.fn.now(3));
    table.index(['actor_id']);
    table.index(['resource_type', 'resource_id']);
    table.index(['trace_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('alerts');
  await knex.schema.dropTableIfExists('system_settings');
  await knex.schema.dropTableIfExists('report_templates');
  await knex.schema.dropTableIfExists('sql_templates');
  await knex.schema.dropTableIfExists('prompt_versions');
  await knex.schema.dropTableIfExists('field_samples');
  await knex.schema.dropTableIfExists('business_knowledge');
  await knex.schema.dropTableIfExists('role_field_permissions');
  await knex.schema.dropTableIfExists('role_table_permissions');
  await knex.schema.dropTableIfExists('field_synonyms');
  await knex.schema.dropTableIfExists('meta_fields');
  await knex.schema.dropTableIfExists('meta_tables');
  await knex.schema.dropTableIfExists('datasources');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');
}
