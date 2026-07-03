import type { ReactNode } from 'react';

export type AppShellVariant = 'admin' | 'user' | 'monitor';

type AppShellProps = {
  variant: AppShellVariant;
  children: ReactNode;
};

function UserTopNav() {
  return (
    <header className="user-topnav">
      <div className="user-nav-brand">
        <div className="user-nav-mark">灵</div>
        <div>
          <div className="user-nav-title">灵析</div>
          <div className="user-nav-subtitle">用大白话，灵活取数</div>
        </div>
      </div>
      <nav className="user-nav-links" aria-label="主导航">
        <span className="user-nav-link active">对话</span>
        <span className="user-nav-link">模板中心</span>
        <span className="user-nav-link">帮助</span>
      </nav>
      <div className="user-menu">
        <span>演示用户</span>
        <div className="user-avatar">演</div>
      </div>
    </header>
  );
}

const VARIANT_CLASS: Record<AppShellVariant, string> = {
  admin: 'hermes-admin',
  user: 'hermes-user',
  monitor: 'hermes-monitor',
};

export function AppShell({ variant, children }: AppShellProps) {
  const rootClass = VARIANT_CLASS[variant];

  if (variant === 'user') {
    return (
      <div className={rootClass}>
        <UserTopNav />
        {children}
      </div>
    );
  }

  return <div className={rootClass}>{children}</div>;
}
