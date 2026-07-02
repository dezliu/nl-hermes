'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/datasources', label: '数据源管理' },
  { href: '/metadata', label: '元数据管理' },
  { href: '/business-knowledge', label: '业务知识' },
  { href: '/templates', label: '模板管理' },
  { href: '/prompts', label: '系统 Prompt' },
  { href: '/search-test', label: '向量检索测试' },
  { href: '/eval', label: '离线评估' },
  { href: '/alerts', label: '告警信息' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
      <aside
        style={{
          width: 220,
          background: '#1E293B',
          color: '#CBD5E1',
          padding: '16px 8px',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '8px 12px', marginBottom: 12, fontWeight: 600, color: '#F1F5F9' }}>
          管理后台
        </div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 4,
                color: active ? '#93C5FD' : '#CBD5E1',
                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                textDecoration: 'none',
                fontSize: 13,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </aside>
      <main style={{ flex: 1, padding: 24, background: '#F8FAFC' }}>{children}</main>
    </div>
  );
}
