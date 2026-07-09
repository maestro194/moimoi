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
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/songs',     label: 'Songs',     icon: Music2 },
  { href: '/scores',    label: 'Scores',    icon: Trophy },
  { href: '/tracker',   label: 'Tracker',   icon: Target },
  { href: '/recent',    label: 'Recent',    icon: Clock },
  { href: '/analysis',  label: 'Analysis',  icon: BarChart3 },
  { href: '/settings',  label: 'Settings',  icon: Settings2 },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const SidebarContent = () => (
    <>
      <div className="px-5 py-6 border-b border-white/10">
        <span className="text-xl font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
          moimoi
        </span>
        <p className="text-xs mt-0.5 text-white/50">
          maimai DX Tracker
        </p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive ? 'bg-purple-500/20 text-purple-300' : 'text-white/60 hover:bg-white/5 hover:text-white'
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
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-white/10 bg-black/60 backdrop-blur-xl overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* ── Mobile Topbar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <span className="text-lg font-bold gradient-text" style={{ fontFamily: 'var(--font-display)' }}>
          moimoi
        </span>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -mr-2 text-white/60 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0914] border-r border-white/10 flex flex-col md:hidden"
            >
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
