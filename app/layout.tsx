import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '产品毛利率分析平台',
  description: '通过财务报表和产品数据分析你的毛利策略',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
