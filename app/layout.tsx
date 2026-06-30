import type { Metadata } from 'next';
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
} from 'lucide-react';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: { default: 'moimoi — maimai Tracker', template: '%s · moimoi' },
  description: 'Personal maimai DX score tracker with DX Rating calculator and auto-sync from maimai NET',
  icons: { icon: '/favicon.ico' },
};

const navItems = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/songs',     label: 'Songs',     icon: Music2 },
  { href: '/scores',    label: 'Scores',    icon: Trophy },
  { href: '/recent',    label: 'Recent',    icon: Clock },
  { href: '/analysis',  label: 'Analysis',  icon: BarChart3 },
  { href: '/settings',  label: 'Settings',  icon: Settings2 },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="bg-mesh min-h-dvh flex">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside
          id="sidebar"
          className="hidden md:flex flex-col w-56 shrink-0 border-r"
          style={{ borderColor: 'var(--border)', background: 'rgba(10,9,20,0.85)', backdropFilter: 'blur(20px)' }}
        >
          {/* Logo */}
          <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
              moimoi
            </span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-subtle)' }}>
              maimai DX Tracker
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                id={`nav-${label.toLowerCase()}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group"
                style={{ color: 'var(--foreground-muted)' }}
              >
                <Icon
                  size={16}
                  className="transition-all group-hover:scale-110"
                />
                {label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--foreground-subtle)' }}>
            Powered by otoge-db
          </div>
        </aside>

        {/* ── Mobile top bar ────────────────────────────────────────── */}
        <div
          className="md:hidden fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 h-14 border-b"
          style={{ background: 'rgba(7,6,14,0.9)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}
        >
          <span className="text-lg font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
            moimoi
          </span>
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                id={`mobile-nav-${label.toLowerCase()}`}
                className="p-2 rounded-lg transition-all"
                style={{ color: 'var(--foreground-muted)' }}
                title={label}
              >
                <Icon size={18} />
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 overflow-auto md:pt-0 pt-14">
          {children}
        </main>
      </body>
    </html>
  );
}
