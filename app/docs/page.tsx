import React from 'react';
import { PageWrapper } from '@/components/page-wrapper';
import { BookOpen, Search, Target, Play, List, RefreshCw, Music2, Info, Tag } from 'lucide-react';

export default function DocsPage() {
  return (
    <PageWrapper>
      <div className="p-4 md:p-8 max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-start">
        {/* Desktop Table of Contents Sidebar */}
        <div className="hidden md:flex flex-col sticky top-24 w-56 shrink-0 border-r border-white/10 pr-6 py-2">
          <div className="text-xs font-bold text-white/50 mb-4 uppercase tracking-wider">Contents</div>
          <nav className="flex flex-col gap-1.5">
            <a href="#intro"        className="text-sm text-white/70 hover:text-white py-1 transition-colors">Introduction</a>
            <a href="#songs"        className="text-sm text-white/70 hover:text-white py-1 transition-colors">Songs & Filtering</a>
            <a href="#song-details" className="text-sm text-white/70 hover:text-white py-1 transition-colors pl-3 border-l border-white/10">Song Details</a>
            <a href="#tags"         className="text-sm text-white/70 hover:text-white py-1 transition-colors pl-3 border-l border-white/10">Tags</a>
            <a href="#board"        className="text-sm text-white/70 hover:text-white py-1 transition-colors">The Board (Tracker)</a>
            <a href="#sync"         className="text-sm text-white/70 hover:text-white py-1 transition-colors">Syncing Data</a>
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

          {/* ── Introduction ────────────────────────────────────────────── */}
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

          {/* ── Songs & Filtering ────────────────────────────────────────── */}
          <section id="songs" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Search className="text-blue-400" size={24} /> Songs & Filtering
            </h2>
            <div className="text-white/70 space-y-6 leading-relaxed">
              <p>
                The <strong>Songs</strong> page contains the entire maimai DX database. It is optimized to feel completely seamless, utilizing concurrent background rendering so you can mash your keyboard to search without the browser ever freezing.
              </p>

              <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-white font-bold">Chart Actions</h3>
                <p>
                  Clicking the <strong>Level Number</strong> (e.g. 14.8) on any song row opens the Chart Action Modal. From here you can:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Add to Goal:</strong> Set a specific accuracy target (like SSS+) for the chart.</li>
                  <li><strong>Add to Session:</strong> Queue the chart into today's play session.</li>
                  <li><strong>Add to List…:</strong> Send the chart into a custom list (like "Sightreads").</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── Song Details ─────────────────────────────────────────────── */}
          <section id="song-details" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Music2 className="text-pink-400" size={24} /> Song Details
            </h2>
            <div className="text-white/70 space-y-6 leading-relaxed">
              <p>
                Clicking the <strong>album art jacket</strong> on any chart card — on the Songs page or on any tab of the Tracker — opens the <strong>Song Details modal</strong>.
              </p>

              <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-white font-bold">What's shown</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Album jacket, title, artist, chart type badge (DX / STD), difficulty badge, and internal level</li>
                  <li>Community and personal <strong>tags</strong> — with inline add / remove controls</li>
                  <li>Song details: genre, BPM, version name, chart designer</li>
                  <li>Note counts: Tap / Hold / Slide / Touch / Break / Total</li>
                  <li>Regional availability: JP / INTL / USA / CN</li>
                </ul>
              </div>

              <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2"><Info size={15} className="text-purple-400" /> On the Tracker page</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Session & Lists tabs:</strong> click any jacket to open song details.</li>
                  <li><strong>Goals tab:</strong> click the jacket <em>or</em> hover the card to reveal the ⓘ button in the top-right corner. The card body still opens the goal detail popup as before.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── Tags ─────────────────────────────────────────────────────── */}
          <section id="tags" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Tag className="text-violet-400" size={24} /> Tags
            </h2>
            <div className="text-white/70 space-y-6 leading-relaxed">
              <p>
                Tags let you label individual charts with meaningful markers so you can filter your song list in powerful ways.
              </p>

              <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-white font-bold">Two types of tags</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-white">Community Tags:</strong> Curated globally via dxrating (e.g. "Technical", "Stamina", "Gimmick"). These load automatically and are read-only.
                  </li>
                  <li>
                    <strong className="text-white">Personal Tags:</strong> Custom tags you create yourself (e.g. "Needs Practice", "Comfort Pick"). Create them inside the Song Details modal, and organise them into colour-coded groups.
                  </li>
                </ul>
              </div>

              <div className="glass p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-white font-bold">Filtering by tags</h3>
                <p>
                  Open the <strong>Tags</strong> accordion in the Songs filter bar. Selecting multiple tags shows only charts that have <em>all</em> selected tags (AND logic). Hold <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs font-mono">Ctrl</kbd> while clicking a tag to select it exclusively.
                </p>
              </div>
            </div>
          </section>

          {/* ── The Board ────────────────────────────────────────────────── */}
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
                    Tracks the specific target scores you've set for charts. It calculates your current accuracy vs your target, and shows you exactly how much rating (+X) you will gain if you hit the goal. Click a card to open the goal detail. Click the jacket or hover ⓘ to open the song details.
                  </p>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 text-white font-bold mb-2">
                    <Play size={16} className="text-blue-400" /> Session
                  </div>
                  <p className="text-sm">
                    A temporary queue for your current arcade visit. Add songs to your Session while on the train, and check them off as "Played" when you clear them at the arcade. Click any jacket to view song details without removing it from your queue.
                  </p>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/10 md:col-span-2">
                  <div className="flex items-center gap-2 text-white font-bold mb-2">
                    <List size={16} className="text-amber-400" /> Lists
                  </div>
                  <p className="text-sm">
                    Create permanent custom folders with custom names and emojis. Useful for tracking specific sets of charts (e.g. "Level 14+ Clears", "Vocaloid Bangers"). Click any jacket in a list to view the full song details modal.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Syncing ──────────────────────────────────────────────────── */}
          <section id="sync" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <RefreshCw className="text-green-400" size={24} /> Syncing Data
            </h2>
            <div className="text-white/70 space-y-4 leading-relaxed">
              <p>
                moimoi is designed to stay up-to-date with your official maimai NET account.
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
