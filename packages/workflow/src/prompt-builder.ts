import type { RolePrompt } from '@hermes/contracts';

const BASE_SYSTEM_CONSTRAINTS =
  '安全约束：仅生成 SELECT 查询；禁止 DDL/DML；仅引用上下文中出现的表与字段；不得编造未列出的结构。';

export function buildSystemPrompt(rolePrompt?: RolePrompt | null): string {
  const parts: string[] = [BASE_SYSTEM_CONSTRAINTS];
  if (rolePrompt?.persona) parts.push(`角色设定: ${rolePrompt.persona}`);
  if (rolePrompt?.constraints) parts.push(`系统限制: ${rolePrompt.constraints}`);
  return parts.join('\n\n');
}
