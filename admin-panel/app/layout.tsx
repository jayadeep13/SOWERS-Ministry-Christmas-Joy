// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sowers Ministry — Admin Panel',
  description: 'Christmas Joy Programme — Admin Dashboard',
  icons: { icon: '/logo.webp', shortcut: '/logo.webp' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
