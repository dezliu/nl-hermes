import type { ReactNode } from 'react';

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #eee', background: '#fff' }}>
        <strong style={{ color: '#F97316' }}>灵析</strong>
        <span style={{ marginLeft: 12, color: '#666' }}>{title}</span>
      </header>
      {children}
    </div>
  );
}
