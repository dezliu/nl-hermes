import type { Metadata } from 'next';
import { AppShell } from '@hermes/ui-shared';
import '@hermes/ui-shared/theme.css';

export const metadata: Metadata = {
  title: '管理后台',
  description: '灵析 LingAnalytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell variant="admin">{children}</AppShell>
      </body>
    </html>
  );
}
