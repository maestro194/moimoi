import React from 'react';
import { PageWrapper } from '@/components/page-wrapper';
import { BookOpen, Search, Target, Play, List, RefreshCw } from 'lucide-react';

export default function DocsPage() {
  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-start">
        {/* Desktop Table of Contents Sidebar */}
        <div className="hidden md:flex flex-col sticky top-24 w-56 shrink-0 border-r border-white/10 pr-6 py-2">
          <div className="text-xs font-bold text-white/50 mb-4 uppercase tracking-wider">Contents</div>
          <nav className="flex flex-col gap-1.5">
            <a href="#intro" className="text-sm text-white/70 hover:text-white py-1 transition-colors">Introduction</a>
            <a href="#songs" className="text-sm text-white/70 hover:text-white py-1 transition-colors">Songs & Filtering</a>
            <a href="#board" className="text-sm text-white/70 hover:text-white py-1 transition-colors">The Board (Tracker)</a>
            <a href="#sync" className="text-sm text-white/70 hover:text-white py-1 transition-colors">Syncing Data</a>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 pb-32">
          <header className="mb-12 border-b border-white/10 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <BookOpen size={24} />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Documentation</h1>
            </div>
            <p className="text-white/60 text-lg max-w-2xl leading-relaxed">
              Welcome to the official documentation for moimoi. Learn how to navigate the app, track your scores, and push your rating to the next level.
            </p>
          </header>

          <section id="intro" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
            <div className="text-white/70 space-y-4 leading-relaxed">
              <p>
                <strong>moimoi</strong> is a modern, fast, and completely customizable tracker for maimai DX. It is designed to act as your ultimate companion for planning your sessions, analyzing your performance, and chasing your dream rating.
              </p>
              <p>
                Instead of simply showing you a list of your scores, moimoi is built around the concept of <em>actionable tracking</em>. Every song can be tagged, added to custom lists, or queued up for your next arcade visit.
              </p>
            </div>
          </section>

          <section id="songs" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Search className="text-blue-400" size={24} /> Songs & Filtering
            </h2>
            <div className="text-white/70 space-y-6 leading-relaxed">
              <p>
                The <strong>Songs</strong> page contains the entire maimai DX database. It is optimized to feel completely seamless, utilizing concurrent background rendering so you can mash your keyboard to search without the browser ever freezing.
              </p>
              
              <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-white font-bold">Using Tags</h3>
                <p>
                  Tags are a core part of moimoi. There are two types of tags:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong className="text-white">Community Tags:</strong> Curated globally (e.g., "Tech", "Stamina", "Gimmick"). These load automatically.</li>
                  <li><strong className="text-white">Personal Tags:</strong> Custom tags you can create (e.g., "Needs Practice", "Comfort Pick"). You can add these directly in the Song Details modal.</li>
                </ul>
                <p>
                  Click the <strong>Tags</strong> dropdown in the filter bar to select tags. Selecting multiple tags will only show charts that match <em>all</em> selected tags (AND logic).
                </p>
              </div>

              <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-white font-bold">Chart Actions</h3>
                <p>
                  Clicking the <strong>Level Number</strong> (e.g., 14.8) on any song row opens the Chart Action Modal. From here you can:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Add to Goal:</strong> Set a specific accuracy target (like SSS+) for the chart.</li>
                  <li><strong>Add to Session:</strong> Queue the chart into today's play session.</li>
                  <li><strong>Add to List...:</strong> Send the chart into a custom list (like "Sightreads").</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="board" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Target className="text-purple-400" size={24} /> The Board (Tracker)
            </h2>
            <div className="text-white/70 space-y-6 leading-relaxed">
              <p>
                The <strong>Board</strong> page is your central command station. It is split into three main tabs:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-white font-bold mb-2">
                    <Target size={16} className="text-purple-400" /> Goals
                  </div>
                  <p className="text-sm">
                    Tracks the specific target scores you've set for charts. It calculates your current accuracy vs your target, and shows you exactly how much rating (+X) you will gain if you hit the goal.
                  </p>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-white font-bold mb-2">
                    <Play size={16} className="text-blue-400" /> Session
                  </div>
                  <p className="text-sm">
                    A temporary queue for your current arcade visit. Add songs to your Session while on the train, and check them off as "Played" when you clear them at the arcade.
                  </p>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 md:col-span-2">
                  <div className="flex items-center gap-2 text-white font-bold mb-2">
                    <List size={16} className="text-amber-400" /> Lists
                  </div>
                  <p className="text-sm">
                    Create permanent custom folders with custom names and emojis. Useful for tracking specific sets of charts (e.g., "Level 14+ Clears", "Vocaloid Bangers"). Items in a list can be individually toggled as "Achieved".
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="sync" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <RefreshCw className="text-green-400" size={24} /> Syncing Data
            </h2>
            <div className="text-white/70 space-y-4 leading-relaxed">
              <p>
                moimoi is designed to stay up-to-date with your official maimai net account. 
              </p>
              <div className="p-4 border-l-4 border-amber-500 bg-amber-500/10 rounded-r-xl">
                <p className="text-amber-200 text-sm font-semibold">
                  Note: Automatic background syncing is configured via your preferred maimai DX data fetcher. Refer to the Settings page for instructions on connecting your API key or data source.
                </p>
              </div>
              <p>
                Once synced, your Best Scores, Recent Plays, and Rating automatically populate the Dashboard and analysis pages.
              </p>
            </div>
          </section>

        </div>
      </div>
    </PageWrapper>
  );
}
