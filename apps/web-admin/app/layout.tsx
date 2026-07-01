import type { Metadata } from 'next';
import { AppShell } from '@hermes/ui-shared';

export const metadata: Metadata = {
  title: '管理后台',
  description: '灵析 LingAnalytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell title="管理后台">{children}</AppShell>
      </body>
    </html>
  );
}
