export const ADMIN_NAV = [
  { href: '/datasources', label: '数据源管理', desc: '配置连接、测试与同步元数据' },
  { href: '/metadata', label: '元数据管理', desc: '编辑业务描述与智能查询库' },
  { href: '/business-knowledge', label: '业务知识', desc: '维护业务术语与知识条目' },
  { href: '/templates', label: '模板管理', desc: '维护 SQL 与报表模板，收入库后可被检索' },
  { href: '/generation-closed-loop', label: '生成闭环', desc: '审核候选模板与用户失败反馈' },
  { href: '/prompts', label: '系统 Prompt', desc: '按角色配置与版本管理' },
  { href: '/search-test', label: '向量检索测试', desc: '验证语义检索效果' },
  { href: '/eval', label: '离线评估', desc: '批量评估生成质量' },
  { href: '/alerts', label: '告警信息', desc: '查看系统告警与异常' },
] as const;
