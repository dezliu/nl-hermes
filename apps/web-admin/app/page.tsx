import Link from 'next/link';
import { AdminLayout } from '../components/AdminLayout';
import { ADMIN_NAV } from '../lib/admin-nav';

export default function HomePage() {
  return (
    <AdminLayout>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>灵析管理后台</h1>
      <p style={{ color: '#64748B', marginBottom: 20 }}>
        数据源、元数据、模板与生成闭环等管理能力入口。
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {ADMIN_NAV.map((card) => (
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
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>{card.desc}</div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
