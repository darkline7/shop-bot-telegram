import type { Metadata } from 'next';
import './globals.css';
import { AdminShell } from './admin-shell';

export const metadata: Metadata = {
  title: 'MMO Shop Admin',
  description: 'Quản trị hệ thống MMO Telegram Bot & Auto Bank ACB',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}


