import type { StructuredError } from '@hermes/contracts';

export function substituteParameters(sql: string, parameters: Record<string, string> = {}): string {
  let result = sql;
  for (const [key, value] of Object.entries(parameters)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value);
    result = result.replace(new RegExp(`:\\s*${key}\\b`, 'g'), `'${value.replace(/'/g, "''")}'`);
  }
  return result;
}

export function isSelectOnly(sql: string): boolean {
  const trimmed = sql.trim().replace(/^\/\*[\s\S]*?\*\//, '').replace(/^--.*$/m, '').trim();
  return /^select\b/i.test(trimmed) && !/\b(insert|update|delete|drop|alter|truncate|create)\b/i.test(trimmed);
}

export function buildRowLimitError(maxRows: number): StructuredError {
  return {
    code: 'ROW_LIMIT_EXCEEDED',
    message: `查询结果超过 ${maxRows} 行上限`,
    suggestion: '请添加时间范围或筛选条件以缩小结果集',
  };
}

export function buildSyntaxError(message: string): StructuredError {
  return {
    code: 'SQL_SYNTAX_ERROR',
    message,
    suggestion: '请检查 SQL 语法与字段名是否正确',
  };
}

export function buildFieldError(field: string): StructuredError {
  return {
    code: 'UNKNOWN_FIELD',
    field,
    message: `字段 ${field} 不存在或无权限访问`,
    suggestion: '请仅使用 schema_context 中列出的表与字段',
  };
}
