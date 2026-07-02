import Link from 'next/link';
import { AdminLayout } from '../components/AdminLayout';

export default function HomePage() {
  return (
    <AdminLayout>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>灵析管理后台</h1>
      <p style={{ color: '#64748B', marginBottom: 20 }}>
        Phase 2–3 基础能力：数据源、元数据、Prompt 与语义检索测试。
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {[
          { href: '/datasources', title: '数据源管理', desc: '配置连接、测试与同步元数据' },
          { href: '/metadata', title: '表元数据', desc: '编辑业务描述与智能查询库' },
          { href: '/prompts', title: '系统 Prompt', desc: '按角色配置与版本管理' },
          { href: '/search-test', title: '向量检索测试', desc: '验证语义检索效果' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              display: 'block',
              padding: 16,
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{card.title}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{card.desc}</div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
