'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ADMIN_NAV, ADMIN_NAV_SECTIONS, adminPageLabel } from '../lib/admin-nav';

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageLabel = adminPageLabel(pathname);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">灵</div>
          <div>
            <div className="admin-brand-text">灵析 LingAnalytics</div>
            <div className="admin-brand-sub">管理后台</div>
          </div>
        </div>
        <nav className="admin-nav" aria-label="管理后台导航">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div key={section}>
              <div className="admin-nav-section">{section}</div>
              {ADMIN_NAV.filter((item) => item.section === section).map((item) => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`admin-nav-item${active ? ' active' : ''}`}
                  >
                    <span className="admin-nav-icon" aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-chip">
            <div className="admin-avatar">管</div>
            <div>
              <div style={{ color: '#E2E8F0', fontSize: 12 }}>管理员</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>数据管理员</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            管理后台 / <strong>{pageLabel}</strong>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
