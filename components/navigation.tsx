'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Music2,
  Trophy,
  BarChart3,
  Settings2,
  Clock,
  Target,
  MoreHorizontal,
  X,
  BookOpen,
} from 'lucide-react';

// ── Nav items ─────────────────────────────────────────────────────────────────
const primaryNav = [
  { href: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { href: '/songs',    label: 'Songs',     icon: Music2 },
  { href: '/scores',   label: 'Scores',    icon: Trophy },
  { href: '/tracker',  label: 'Tracker',   icon: Target },
];

const secondaryNav = [
  { href: '/recent',   label: 'Recent',   icon: Clock },
  { href: '/analysis', label: 'Analysis', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings2 },
  { href: '/docs',     label: 'Docs',     icon: BookOpen },
];

const allNav = [...primaryNav, ...secondaryNav];

export function Navigation() {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const isSecondaryActive = secondaryNav.some(n => n.href === pathname);

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 bg-black/60 backdrop-blur-xl overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
            moimoi
          </span>
          <p className="text-xs mt-0.5 text-white/50">maimai DX Tracker</p>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {allNav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} className={`transition-all group-hover:scale-110 ${isActive ? 'text-purple-400' : ''}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 text-xs text-white/40">
          Powered by dxrating
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ────────────────────────────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* "More" slide-up panel */}
        <AnimatePresence>
          {moreOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setMoreOpen(false)}
              />
              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="absolute bottom-full inset-x-0 z-50 bg-[#0d0d12] border-t border-white/10 rounded-t-3xl overflow-hidden"
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-9 h-1 rounded-full bg-white/20" />
                </div>

                {/* Close button */}
                <button
                  onClick={() => setMoreOpen(false)}
                  className="absolute top-3 right-4 p-1.5 rounded-full bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>

                <div className="px-4 pb-4 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3 px-2">More</p>
                  <div className="space-y-1">
                    {secondaryNav.map(({ href, label, icon: Icon }) => {
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                            isActive
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'text-white/70 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isActive ? 'bg-purple-500/30' : 'bg-white/8'
                          }`}
                            style={{ backgroundColor: isActive ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)' }}
                          >
                            <Icon size={18} className={isActive ? 'text-purple-400' : 'text-white/60'} />
                          </div>
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom bar itself */}
        <div className="relative bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex items-center">
            {primaryNav.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all relative"
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-purple-400"
                    />
                  )}
                  <Icon
                    size={21}
                    className={`transition-colors ${isActive ? 'text-purple-400' : 'text-white/40'}`}
                  />
                  <span className={`text-[10px] font-semibold leading-none transition-colors ${
                    isActive ? 'text-purple-300' : 'text-white/40'
                  }`}>
                    {label}
                  </span>
                </Link>
              );
            })}

            {/* More button */}
            <button
              onClick={() => setMoreOpen(v => !v)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all relative"
            >
              {isSecondaryActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-purple-400"
                />
              )}
              <MoreHorizontal
                size={21}
                className={`transition-colors ${isSecondaryActive || moreOpen ? 'text-purple-400' : 'text-white/40'}`}
              />
              <span className={`text-[10px] font-semibold leading-none transition-colors ${
                isSecondaryActive || moreOpen ? 'text-purple-300' : 'text-white/40'
              }`}>
                More
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
