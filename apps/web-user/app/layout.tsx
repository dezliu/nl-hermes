import type { Metadata } from 'next';
import { AppShell } from '@hermes/ui-shared';
import { AntdProvider } from './antd-provider';
import '@hermes/ui-shared/theme.css';

export const metadata: Metadata = {
  title: '用户对话平台',
  description: '灵析 LingAnalytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdProvider>
          <AppShell variant="user">{children}</AppShell>
        </AntdProvider>
      </body>
    </html>
  );
}
