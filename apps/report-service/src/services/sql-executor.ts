import mysql from 'mysql2/promise';
import type { ExecuteQueryResponse, StructuredError, ValidateSqlResponse } from '@hermes/contracts';
import { buildRowLimitError, buildSyntaxError, isSelectOnly, substituteParameters } from '../lib/sql-utils.js';

export type DatasourceConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  databaseName: string;
};

export class SqlExecutor {
  async execute(
    sql: string,
    ds: DatasourceConfig,
    options: { parameters?: Record<string, string>; maxRows?: number } = {},
  ): Promise<ExecuteQueryResponse> {
    const maxRows = options.maxRows ?? 1000;
    const finalSql = substituteParameters(sql, options.parameters);

    if (!isSelectOnly(finalSql)) {
      return {
        ok: false,
        error: {
          code: 'FORBIDDEN_STATEMENT',
          message: '仅允许 SELECT 查询',
          suggestion: '请移除数据修改类语句',
        },
      };
    }

    try {
      const conn = await mysql.createConnection({
        host: ds.host,
        port: ds.port,
        user: ds.username,
        password: ds.password,
        database: ds.databaseName,
      });

      const limitedSql = finalSql.replace(/;\s*$/, '');
      const [rows] = await conn.query(`${limitedSql} LIMIT ${maxRows + 1}`);
      await conn.end();

      const resultRows = rows as Record<string, unknown>[];
      const truncated = resultRows.length > maxRows;
      const outputRows = truncated ? resultRows.slice(0, maxRows) : resultRows;

      if (truncated) {
        return {
          ok: false,
          rows: outputRows,
          rowCount: outputRows.length,
          truncated: true,
          error: buildRowLimitError(maxRows),
        };
      }

      return { ok: true, rows: outputRows, rowCount: outputRows.length, truncated: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'SQL 执行失败';
      const fieldMatch = message.match(/Unknown column '([^']+)'/i);
      const error: StructuredError = fieldMatch
        ? { code: 'UNKNOWN_FIELD', field: fieldMatch[1], message, suggestion: '请检查字段名是否在权限范围内' }
        : buildSyntaxError(message);
      return { ok: false, error };
    }
  }

  async validate(
    sql: string,
    ds: DatasourceConfig,
    maxRows = 1000,
    lightweight = false,
  ): Promise<ValidateSqlResponse> {
    const errors: StructuredError[] = [];
    if (!isSelectOnly(sql)) {
      errors.push({
        code: 'FORBIDDEN_STATEMENT',
        message: '仅允许 SELECT 查询',
      });
      return { valid: false, errors };
    }

    try {
      const conn = await mysql.createConnection({
        host: ds.host,
        port: ds.port,
        user: ds.username,
        password: ds.password,
        database: ds.databaseName,
      });
      await conn.query(`EXPLAIN ${sql.replace(/;\s*$/, '')}`);
      if (!lightweight) {
        const countSql = `SELECT COUNT(*) AS cnt FROM (${sql.replace(/;\s*$/, '')}) AS _hermes_sub`;
        const [countRows] = await conn.query(countSql);
        const cnt = Number((countRows as { cnt: number }[])[0]?.cnt ?? 0);
        if (cnt > maxRows) {
          errors.push(buildRowLimitError(maxRows));
        }
      }
      await conn.end();
      return { valid: errors.length === 0, errors };
    } catch (err) {
      errors.push(buildSyntaxError(err instanceof Error ? err.message : '校验失败'));
      return { valid: false, errors };
    }
  }
}
