'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Music2, Tag, Plus, Check, Globe,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Song } from '@/lib/types';
import { getJacketUrl } from '@/lib/song-db';
import { useTags } from '@/lib/useTags';
import type { UnifiedTag, PersonalTagGroup } from '@/lib/types';

// ── Props ──────────────────────────────────────────────────────────────────────
export interface SongDetailsModalProps {
  row: {
    song: Song;
    type: 'DX' | 'STD';
    /** lowercase dxrating key: 'master' | 'expert' | 'advanced' | 'basic' | 'remaster' */
    difficulty: string;
    /** moimoi abbreviation: 'MAS' | 'EXP' | 'ADV' | 'BAS' | 'REMAS' */
    abbr: string;
  } | null;
  onClose: () => void;
}

// ── Styling maps ───────────────────────────────────────────────────────────────
const DIFF_COLORS: Record<string, string> = {
  BAS: '#3fb950', ADV: '#d4a017', EXP: '#da3633',
  MAS: '#8957e5', REMAS: '#d2a8ff',
};
const DIFF_LABELS: Record<string, string> = {
  BAS: 'BASIC', ADV: 'ADVANCED', EXP: 'EXPERT', MAS: 'MASTER', REMAS: 'Re:MASTER',
};
const CAT_LABELS: Record<string, string> = {
  maimai: 'maimai', anime: 'POPS & Anime', 'game&variety': 'Game & Variety',
  'niconico&vocaloid': 'niconico & Vocaloid', toho: 'Touhou Project',
  'original&joypolis': 'Original & Joypolis',
};
const VERSION_NAMES: Record<string, string> = {
  '20000': 'maimai DX', '20500': 'DX PLUS', '21000': 'Splash', '21500': 'Splash PLUS',
  '22000': 'UNiVERSE', '22500': 'UNiVERSE PLUS', '23000': 'FESTiVAL', '23500': 'FESTiVAL PLUS',
  '24000': 'BUDDiES', '24500': 'BUDDiES PLUS', '25000': 'PRiSM', '25500': 'PRiSM PLUS',
  '26000': 'CiRCLE', '26500': 'CiRCLE PLUS',
};
function versionLabel(v: string) { return VERSION_NAMES[v] ?? `ver. ${v}`; }

// ── TagChip ───────────────────────────────────────────────────────────────────
function TagChip({ tag, onRemove }: { tag: UnifiedTag; onRemove?: () => void }) {
  const [tip, setTip] = useState(false);
  return (
    <span
      className="relative inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none cursor-default select-none transition-opacity"
      style={{ backgroundColor: tag.color + '30', border: `1px solid ${tag.color}60`, color: tag.color }}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      {tag.source === 'community' && <Globe size={9} className="opacity-70 shrink-0" />}
      {tag.name}
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity rounded-full"
          title="Remove"
        >
          <X size={9} />
        </button>
      )}
      {tip && tag.description && (
        <span className="absolute bottom-full left-0 mb-1 z-50 w-52 text-[10px] font-normal text-white/80 bg-zinc-800 border border-white/10 rounded-lg px-2 py-1.5 shadow-xl pointer-events-none whitespace-normal leading-relaxed">
          {tag.description}
        </span>
      )}
    </span>
  );
}

// ── AddTagPanel ───────────────────────────────────────────────────────────────
function AddTagPanel({
  songTitle, sheetType, sheetDifficulty, onClose,
}: {
  songTitle: string; sheetType: 'DX' | 'STD'; sheetDifficulty: string; onClose: () => void;
}) {
  const {
    tagsData, isLoading, getTagsForChart,
    attachPersonalTag, detachPersonalTag, createTag, createTagGroup,
  } = useTags();

  const [pending, setPending] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagGroupId, setNewTagGroupId] = useState<number | null>(null);
  const [creatingTag, setCreatingTag] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#8957e5');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);

  const currentTags = getTagsForChart(songTitle, sheetType, sheetDifficulty);
  const currentPersonalTagIds = currentTags.filter(t => t.source === 'personal').map(t => parseInt(t.key.split(':')[1]));

  const handleToggle = useCallback(async (tagId: number, isOn: boolean) => {
    setPending(tagId);
    try {
      if (isOn) await detachPersonalTag(tagId, songTitle, sheetType, sheetDifficulty);
      else await attachPersonalTag(tagId, songTitle, sheetType, sheetDifficulty);
    } catch (e) { console.error(e); }
    finally { setPending(null); }
  }, [songTitle, sheetType, sheetDifficulty, attachPersonalTag, detachPersonalTag]);

  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const tag = await createTag(newTagName.trim(), undefined, newTagGroupId ?? undefined);
      await attachPersonalTag(tag.id, songTitle, sheetType, sheetDifficulty);
      setNewTagName('');
    } catch (e) { console.error(e); }
    finally { setCreatingTag(false); }
  }, [newTagName, newTagGroupId, songTitle, sheetType, sheetDifficulty, createTag, attachPersonalTag]);

  const handleCreateGroup = useCallback(async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const g = await createTagGroup(newGroupName.trim(), newGroupColor);
      setNewTagGroupId(g.id);
      setNewGroupName('');
      setShowNewGroup(false);
    } catch (e) { console.error(e); }
    finally { setCreatingGroup(false); }
  }, [newGroupName, newGroupColor, createTagGroup]);

  if (isLoading || !tagsData) {
    return (
      <div className="flex items-center justify-center py-4 text-white/40 gap-2 text-sm">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    );
  }

  const personalGroups = tagsData.personal.tagGroups;

  return (
    <div className="flex flex-col gap-3 pt-3">
      {/* Personal tag toggles */}
      {personalGroups.map(group => {
        const groupTags = tagsData.personal.tags.filter(t => t.groupId === group.id);
        if (groupTags.length === 0) return null;
        return (
          <div key={group.id}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{group.name}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {groupTags.map(tag => {
                const isOn = currentPersonalTagIds.includes(tag.id);
                const isPending = pending === tag.id;
                return (
                  <button
                    key={tag.id}
                    disabled={isPending}
                    onClick={() => handleToggle(tag.id, isOn)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full transition-all active:scale-95"
                    style={{
                      backgroundColor: isOn ? group.color + '40' : group.color + '18',
                      border: `1px solid ${isOn ? group.color + '90' : group.color + '35'}`,
                      color: group.color,
                      opacity: isPending ? 0.5 : 1,
                    }}
                    title={tag.description ?? tag.name}
                  >
                    {isPending ? <Loader2 size={9} className="animate-spin" /> : isOn ? <Check size={9} /> : null}
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Ungrouped */}
      {(() => {
        const ungrouped = tagsData.personal.tags.filter(t => t.groupId == null);
        if (ungrouped.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1">
            {ungrouped.map(tag => {
              const isOn = currentPersonalTagIds.includes(tag.id);
              const isPending = pending === tag.id;
              return (
                <button
                  key={tag.id}
                  disabled={isPending}
                  onClick={() => handleToggle(tag.id, isOn)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/20 transition-all active:scale-95"
                  style={{ backgroundColor: isOn ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)', color: 'white' }}
                >
                  {isPending ? <Loader2 size={9} className="animate-spin" /> : isOn ? <Check size={9} /> : null}
                  {tag.name}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* New tag */}
      <div className="h-px bg-white/5" />
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); }}
            placeholder="New tag name…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
          />
          <select
            value={newTagGroupId ?? ''}
            onChange={e => setNewTagGroupId(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 outline-none"
          >
            <option value="">No group</option>
            {personalGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button
            onClick={handleCreateTag}
            disabled={creatingTag || !newTagName.trim()}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg text-xs font-bold text-white transition-colors"
          >
            {creatingTag ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Add
          </button>
        </div>
        <button
          onClick={() => setShowNewGroup(v => !v)}
          className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors w-fit"
        >
          {showNewGroup ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {showNewGroup ? 'Cancel' : '+ New group…'}
        </button>
        {showNewGroup && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); }}
              placeholder="Group name…"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-purple-500/50 transition-colors"
            />
            <input type="color" value={newGroupColor} onChange={e => setNewGroupColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10 p-0.5" />
            <button
              onClick={handleCreateGroup}
              disabled={creatingGroup || !newGroupName.trim()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 rounded-lg text-xs font-bold text-white transition-colors"
            >
              {creatingGroup ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Create
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stat block component ───────────────────────────────────────────────────────
function StatBlock({ label, value }: { label: string; value: string | number | undefined }) {
  if (value == null || value === '' || value === 0) return null;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-lg font-bold font-num text-white">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}

// ── Region badge ──────────────────────────────────────────────────────────────
function RegionBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="text-[11px] font-extrabold px-2 py-0.5 rounded leading-none"
      style={{
        backgroundColor: active ? '#3fb95030' : 'rgba(255,255,255,0.05)',
        color: active ? '#3fb950' : 'rgba(255,255,255,0.2)',
        border: `1px solid ${active ? '#3fb95060' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {label}
    </span>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export function SongDetailsModal({ row, onClose }: SongDetailsModalProps) {
  const { getTagsForChart, detachPersonalTag } = useTags();
  const [addTagOpen, setAddTagOpen] = useState(false);

  if (!row) return null;

  const { song, type, difficulty, abbr } = row;
  const jacketUrl = getJacketUrl(song.image_url ?? null, song.intl);
  const color = DIFF_COLORS[abbr] ?? '#6b7280';
  const diffLabel = DIFF_LABELS[abbr] ?? abbr;

  // Chart data from song.sheets (if available)
  const sheets = Array.isArray(song.sheets) ? song.sheets : [];
  const sheet = sheets.find(s => s.type === type.toLowerCase() && s.difficulty === difficulty);
  const nc = sheet?.noteCounts ?? {};
  const noteDesigner = sheet?.noteDesigner ?? null;
  const internalLevel = sheet?.internalLevelValue
    ? sheet.internalLevelValue.toFixed(1)
    : (() => {
      // fallback: pull from song fields
      const map: Record<string, string> = {
        'DX-basic': song.dx_lev_bas_i ?? '',
        'DX-advanced': song.dx_lev_adv_i ?? '',
        'DX-expert': song.dx_lev_exp_i ?? '',
        'DX-master': song.dx_lev_mas_i ?? '',
        'DX-remaster': song.dx_lev_remas_i ?? '',
        'STD-basic': song.lev_bas_i ?? '',
        'STD-advanced': song.lev_adv_i ?? '',
        'STD-expert': song.lev_exp_i ?? '',
        'STD-master': song.lev_mas_i ?? '',
        'STD-remaster': song.lev_remas_i ?? '',
      };
      const raw = map[`${type}-${difficulty}`] ?? '';
      return raw ? parseFloat(raw).toFixed(1) : null;
    })();
  const displayLevel = sheet?.level ?? internalLevel;

  // Tags for this specific chart
  const chartTags = getTagsForChart(song.title, type, abbr);

  // Regional availability from the song's sheets data
  const sheetRegions = sheet?.regions ?? {};

  const detailRows: Array<{ label: string; value: string | null | undefined }> = [
    { label: 'Genre', value: CAT_LABELS[song.catcode] ?? song.catcode },
    { label: 'Artist', value: song.artist },
    { label: 'BPM', value: song.bpm || null },
    { label: 'Version', value: versionLabel(song.version) },
    { label: 'Chart Designer', value: noteDesigner || null },
  ];

  const hasNotes = nc.total || nc.tap || nc.hold || nc.slide || nc.touch || nc.break;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ scale: 0.96, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className="w-full sm:max-w-lg bg-[#0f0f10] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div
            className="relative px-5 pt-5 pb-4 flex gap-4"
            style={{ background: `linear-gradient(135deg, ${color}12 0%, transparent 60%)` }}
          >
            {/* Jacket */}
            <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-black/30 shadow-lg ring-1 ring-white/10">
              {jacketUrl
                ? <img src={jacketUrl} alt={song.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white/20"><Music2 size={20} /></div>}
            </div>

            {/* Title + badges */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base text-white leading-tight truncate">{song.title}</div>
              <div className="text-xs text-white/50 truncate mt-0.5">{song.artist}</div>
              <div className="flex items-center gap-2 mt-2">
                <img
                  src={type === 'DX' ? '/badges/music_dx.webp' : '/badges/music_standard.webp'}
                  alt={type}
                  className="h-4 object-contain"
                />
                <span
                  className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-sm tracking-widest leading-none"
                  style={{ backgroundColor: color + '30', color, border: `1px solid ${color}60` }}
                >
                  {diffLabel}
                </span>
              </div>
            </div>

            {/* Internal level — top right */}
            {internalLevel && (
              <div className="shrink-0 text-right">
                <div className="text-4xl font-black font-num leading-none" style={{ color }}>{internalLevel}</div>
                {displayLevel && displayLevel !== internalLevel && (
                  <div className="text-xs text-white/30 text-right mt-0.5">{displayLevel}</div>
                )}
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Tags row ── */}
          <div className="px-5 py-3 border-t border-white/5">
            <div className="flex flex-wrap items-center gap-1.5">
              {chartTags.length === 0 && !addTagOpen && (
                <span className="text-[11px] text-white/25 italic">No tags for this chart</span>
              )}
              {chartTags.map(tag => (
                <TagChip
                  key={tag.key}
                  tag={tag}
                  onRemove={tag.source === 'personal' ? () =>
                    detachPersonalTag(parseInt(tag.key.split(':')[1]), song.title, type, abbr)
                  : undefined}
                />
              ))}
              <button
                onClick={() => setAddTagOpen(v => !v)}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-white/20 text-white/30 hover:border-purple-400/50 hover:text-purple-400 transition-colors"
              >
                {addTagOpen ? <ChevronUp size={10} /> : <Tag size={10} />}
                {addTagOpen ? 'Close' : 'Add tag'}
              </button>
            </div>

            <AnimatePresence>
              {addTagOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <AddTagPanel
                    songTitle={song.title}
                    sheetType={type}
                    sheetDifficulty={abbr}
                    onClose={() => setAddTagOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Details ── */}
          <div className="px-5 py-3 border-t border-white/5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Details</div>
            <div className="space-y-1.5">
              {detailRows.map(row => row.value ? (
                <div key={row.label} className="flex items-start gap-3 text-sm">
                  <div className="w-28 shrink-0 text-white/40 text-xs pt-0.5">{row.label}</div>
                  <div className="text-white/85 text-xs leading-relaxed">{row.value}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* ── Notes ── */}
          {hasNotes && (
            <div className="px-5 py-3 border-t border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Notes</div>
              <div className="flex justify-around">
                <StatBlock label="Tap" value={nc.tap} />
                <StatBlock label="Hold" value={nc.hold} />
                <StatBlock label="Slide" value={nc.slide} />
                <StatBlock label="Touch" value={nc.touch} />
                <StatBlock label="Break" value={nc.break} />
                <div className="w-px bg-white/10" />
                <StatBlock label="Total" value={nc.total} />
              </div>
            </div>
          )}

          {/* ── Regional availability ── */}
          {Object.keys(sheetRegions).length > 0 && (
            <div className="px-5 py-3 border-t border-white/5">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Regional Availability</div>
              <div className="flex gap-2">
                <RegionBadge label="JP" active={!!sheetRegions.jp} />
                <RegionBadge label="INTL" active={!!sheetRegions.intl || !!song.intl} />
                <RegionBadge label="USA" active={!!sheetRegions.us} />
                <RegionBadge label="CN" active={!!sheetRegions.cn} />
              </div>
            </div>
          )}

          {/* ── Bottom padding (mobile safe area) ── */}
          <div className="h-5 sm:h-2" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
