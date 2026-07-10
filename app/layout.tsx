import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

// Apple風の洗練された無地サンセリフに近い Inter を自己ホストで読み込む
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
});

export const metadata: Metadata = {
  title: 'AIO Article Generation AI',
  description: 'AI-powered AIO article generation, scoring, and publishing engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
