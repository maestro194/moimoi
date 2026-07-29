import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import {
  LayoutDashboard,
  Music2,
  Trophy,
  BarChart3,
  Settings2,
  Clock,
  Target,
} from 'lucide-react';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

import { Navigation } from '@/components/navigation';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 0.75,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: { default: 'moimoi — maimai Tracker', template: '%s · moimoi' },
  description: 'Personal maimai DX score tracker with DX Rating calculator and auto-sync from maimai NET',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="bg-mesh h-dvh overflow-hidden flex">
        <Navigation />

        {/* ── Main content ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-auto md:pt-0 pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}
