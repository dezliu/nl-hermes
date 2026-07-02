const DANGEROUS_SQL_PATTERNS = [
  /\bdrop\s+(table|database|index|view)\b/i,
  /\btruncate\s+table\b/i,
  /\balter\s+table\b/i,
  /\bcreate\s+(table|database|index|view)\b/i,
  /\binsert\s+into\b/i,
  /\bupdate\s+\w+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /\bgrant\s+/i,
  /\brevoke\s+/i,
];

const SENSITIVE_BLOCKLIST = ['密码', 'passwd', 'secret', 'api_key', '私钥', 'credential'];

export function checkSecurityGuard(query: string): { blocked: boolean; reason?: string } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { blocked: true, reason: '输入为空，请描述您的数据需求。' };
  }

  for (const pattern of DANGEROUS_SQL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        blocked: true,
        reason: '检测到危险操作指令（如 DROP/TRUNCATE 等），已拒绝处理。仅支持数据查询类需求。',
      };
    }
  }

  const lower = trimmed.toLowerCase();
  for (const word of SENSITIVE_BLOCKLIST) {
    if (lower.includes(word.toLowerCase())) {
      return { blocked: true, reason: '输入包含敏感内容，已拒绝处理。' };
    }
  }

  return { blocked: false };
}
