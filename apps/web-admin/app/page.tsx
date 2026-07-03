import Link from 'next/link';
import { AdminLayout } from '../components/AdminLayout';
import { ADMIN_NAV } from '../lib/admin-nav';

export default function HomePage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">灵析管理后台</h1>
        <p className="page-desc">数据源、元数据、模板与生成闭环等管理能力入口。</p>
      </div>
      <div className="admin-card-grid">
        {ADMIN_NAV.map((card) => (
          <Link key={card.href} href={card.href} className="admin-card">
            <div className="admin-card-title">
              <span style={{ marginRight: 8, opacity: 0.7 }}>{card.icon}</span>
              {card.label}
            </div>
            <div className="admin-card-desc">{card.desc}</div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
