/**
 * B50 Image Generator — v4 (faithful mimi xd clone)
 *
 * Card = [jacket | type+rank pill + SSS+ text + achievement | rating + FC/FS slots]
 *        [──────────── lighter bottom strip: title + level ───────────────────────]
 */

import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { promises as fs } from "fs";
import path from "path";
import type { ScoreWithRating, RatingData } from "./types";

// ── Canvas ────────────────────────────────────────────────────────────────────
const W         = 1240;
const H         = 1060;
const SCALE     = 2;
const SIDEBAR_W = 210;
const PAD       = 14;
const CARD_W    = 194;
const CARD_H    = 90;
const CARD_GAP  = 5;
const COLS      = 5;

// Card internal columns
const CJ = 64;          // jacket column width
const CM = 80;          // middle column width (type+rank+achievement)
const CR = CARD_W - CJ - CM;  // rating+FC/FS column width (= 50)
const CT = 20;          // bottom title strip height
const CA = CARD_H - CT; // top area height (= 70)

// Card backgrounds — darker tones (was DIFF_STRIP)
const DIFF_BG: Record<string, string> = {
  BAS:   "#133d1a",
  ADV:   "#3d2900",
  EXP:   "#500f0f",
  MAS:   "#2e1860",
  REMAS: "#806098",
  UTAGE: "#3d0820",
};

// Title strip — lighter diff hue (was DIFF_BG), stands out against darker card body
const DIFF_STRIP: Record<string, string> = {
  BAS:   "#1e5c28",
  ADV:   "#5c3d00",
  EXP:   "#7a1c1c",
  MAS:   "#4d2d80",
  REMAS: "#b090cc",
  UTAGE: "#5c0f33",
};

// Accent = canonical maimai DX game colors (same as all other pages)
const DIFF_ACCENT: Record<string, string> = {
  BAS:   "#3fb950",
  ADV:   "#d4a017",
  EXP:   "#f64861",
  MAS:   "#9f51dc",
  REMAS: "#c484fc",
  UTAGE: "#bf1b5e",
};

// ── Rank colours — mimi xd style ─────────────────────────────────────────────
// Each entry is an array of [char, color, isPlus?] drawn individually.
// S-ranks graduate gold → orange → pink per letter (matching mimi xd).
// "+" is drawn smaller and raised (superscript style).
type RankGlyph = [string, string, boolean?];
const RANK_GLYPHS: Record<string, RankGlyph[]> = {
  "SSS+": [["S","#fde68a"],["S","#fb923c"],["S","#f472b6"],["+","#f472b6",true]],
  "SSS":  [["S","#fde68a"],["S","#fb923c"],["S","#f472b6"]],
  "SS+":  [["S","#fde68a"],["S","#fb923c"],["+","#fb923c",true]],
  "SS":   [["S","#fde68a"],["S","#fb923c"]],
  "S+":   [["S","#fde68a"],["+","#fde68a",true]],
  "S":    [["S","#fde68a"]],
  "AAA":  [["A","#fbbf24"],["A","#fbbf24"],["A","#fbbf24"]],
  "AA":   [["A","#fbbf24"],["A","#fbbf24"]],
  "A":    [["A","#fb923c"]],
};

// ── FC/FS slot colours — mimi xd palette ─────────────────────────────────────
// FC/AP family → green; FS/FDX family → blue
const FC_C: Record<string, { color: string; label: string }> = {
  "AP+": { color: "#fde68a", label: "AP+" },  // gold for all-perfect
  "AP":  { color: "#fde68a", label: "AP"  },
  "FC+": { color: "#4ade80", label: "FC+" },  // green for full-combo
  "FC":  { color: "#4ade80", label: "FC"  },
};
const FS_C: Record<string, { color: string; label: string }> = {
  "FDX+": { color: "#60a5fa", label: "FDX+" },  // blue for full-sync
  "FDX":  { color: "#60a5fa", label: "FDX"  },
  "FS+":  { color: "#60a5fa", label: "FS+"  },
  "FS":   { color: "#60a5fa", label: "FS"   },
  "SYNC": { color: "#fb923c", label: "SYNC" },
};

// ── Main canvas colours ───────────────────────────────────────────────────────
const C = {
  bg:            "#f0eeff",
  sidebarBg:     "#18122e",
  sidebarBorder: "rgba(167,139,250,0.20)",
  sectionBg:     "rgba(124,58,237,0.07)",
  fg:            "#160d38",
  fgMuted:       "rgba(22,13,56,0.60)",
  sfg:           "#f0eeff",
  sfgMuted:      "rgba(240,238,255,0.55)",
  sfgSubtle:     "rgba(240,238,255,0.30)",
  pink:          "#f472b6",
  cyan:          "#22d3ee",
};

// ── Font ──────────────────────────────────────────────────────────────────────
let fontsReady = false;

// Japanese text — M PLUS Rounded 1c (Maru Gothic substitute)
const F  = (px: number, weight = "normal") =>
  `${weight} ${px}px "MPlusRounded", "NotoSansJP", "Meiryo", sans-serif`;

// Alphanumerics / scores — Nunito Black (Avenir Next Heavy substitute)
const FN = (px: number) =>
  `900 ${px}px "Nunito", "Arial Rounded MT Bold", "Arial", sans-serif`;

// Rank glyphs (S, A, B …) — also Nunito for consistent Latin letterforms
const FR = (px: number) =>
  `900 ${px}px "Nunito", "Arial Rounded MT Bold", "Arial", sans-serif`;


async function setupFonts(): Promise<void> {
  if (fontsReady) return;
  fontsReady = true;

  // 1. Nunito variable TTF (Avenir Next Heavy substitute — alphanumerics)
  const nunitoPath = path.join(process.cwd(), "public", "fonts", "Nunito-VF.ttf");
  try { await fs.access(nunitoPath); GlobalFonts.registerFromPath(nunitoPath, "Nunito"); }
  catch { /* missing — FN/FR will fall back to system fonts */ }

  // 2. M PLUS Rounded 1c Black (Maru Gothic substitute — Japanese text)
  const mplusPath = path.join(process.cwd(), "public", "fonts", "MPlusRounded1c-Black.ttf");
  try { await fs.access(mplusPath); GlobalFonts.registerFromPath(mplusPath, "MPlusRounded"); }
  catch { /* missing — F will fall back to NotoSansJP */ }

  // 3. Noto Sans JP fallback for any remaining Japanese glyphs
  const fontCacheDir = path.join(process.cwd(), ".next", "cache", "fonts");
  await fs.mkdir(fontCacheDir, { recursive: true }).catch(() => {});
  const candidates = [
    path.join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSansJP.ttf"),
    path.join(fontCacheDir, "NotoSansJP.ttf"),
    "C:\\Windows\\Fonts\\meiryo.ttc",
    "C:\\Windows\\Fonts\\YuGothM.ttc",
    "C:\\Windows\\Fonts\\YuGothR.ttc",
    "C:\\Windows\\Fonts\\msgothic.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJKjp-Regular.ttf",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
  ];
  for (const p of candidates) {
    try { await fs.access(p); GlobalFonts.registerFromPath(p, "NotoSansJP"); return; }
    catch { /* next */ }
  }
  try {
    const url = "https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/Subset/NotoSansJP-VF.ttf";
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (res.ok) {
      const p = path.join(fontCacheDir, "NotoSansJP.ttf");
      await fs.writeFile(p, Buffer.from(await res.arrayBuffer()));
      GlobalFonts.registerFromPath(p, "NotoSansJP");
    }
  } catch { /* no font — boxes for JP text */ }
}

// ── Jacket cache ──────────────────────────────────────────────────────────────
const JACKET_DIR = path.join(process.cwd(), ".next", "cache", "jackets");
const jacketMem  = new Map<string, Buffer | null>();

async function fetchJacket(url: string, token: string, region: "intl" | "jp"): Promise<Buffer | null> {
  if (!url) return null;
  if (jacketMem.has(url)) return jacketMem.get(url)!;
  const disk = path.join(JACKET_DIR, url.replace(/[^a-zA-Z0-9._-]/g, "_"));
  try { const b = await fs.readFile(disk); jacketMem.set(url, b); return b; } catch { /* miss */ }
  try {
    const base = region === "intl" ? "https://maimaidx-eng.com/maimai-mobile" : "https://maimaidx.jp/maimai-mobile";
    const cookie = token.includes("=") ? token : (region === "intl" ? `_t=${token}` : `clal=${token}`);
    const res = await fetch(`${base}/img/Music/${url}`, {
      headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15", Referer: `${base}/` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) { jacketMem.set(url, null); return null; }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.mkdir(JACKET_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(disk, buf).catch(() => {});
    jacketMem.set(url, buf);
    return buf;
  } catch { jacketMem.set(url, null); return null; }
}

async function prefetch(urls: string[], token: string, region: "intl" | "jp") {
  const needed = [...new Set(urls.filter(Boolean))].filter(u => !jacketMem.has(u));
  for (let i = 0; i < needed.length; i += 8)
    await Promise.all(needed.slice(i, i + 8).map(u => fetchJacket(u, token, region)));
}

// ── Type badge images (music_dx.webp / music_standard.webp from /public/badges) ──
type ImageData = Awaited<ReturnType<typeof loadImage>>;
const typeBadgeCache: Record<"DX" | "STD", ImageData | null> = { DX: null, STD: null };

async function loadTypeBadges(): Promise<void> {
  const base = path.join(process.cwd(), "public", "badges");
  try {
    if (!typeBadgeCache.DX)  typeBadgeCache.DX  = await loadImage(path.join(base, "music_dx.webp"));
    if (!typeBadgeCache.STD) typeBadgeCache.STD  = await loadImage(path.join(base, "music_standard.webp"));
  } catch { /* badges not found — fall back to text pill */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function rr(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function trunc(ctx: SKRSContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

/** Fill + thin same-colour stroke = heavier text without a new font. */
function thickFill(ctx: SKRSContext2D, text: string, x: number, y: number, color: string) {
  ctx.fillStyle   = color;
  ctx.fillText(text, x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 0.7;
  ctx.strokeText(text, x, y);
}

// ── Score card ────────────────────────────────────────────────────────────────
async function drawCard(
  ctx: SKRSContext2D, score: ScoreWithRating, rank: number,
  x: number, y: number, token: string, region: "intl" | "jp",
) {
  const bg     = DIFF_BG[score.difficulty]     ?? "#1a1a2e";
  const accent = DIFF_ACCENT[score.difficulty] ?? "#a78bfa";
  const ach    = typeof score.achievement === "string" ? parseFloat(score.achievement) : (score.achievement as number);


  ctx.save();

  // Card bg
  rr(ctx, x, y, CARD_W, CARD_H, 5);
  ctx.fillStyle = bg; ctx.fill();

  // ━━━━━━━━━━━━━━ LEFT — Jacket ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const jx = x, jy = y, jw = CJ, jh = CA;

  const imgBuf = score.song?.image_url ? await fetchJacket(score.song.image_url, token, region) : null;
  if (imgBuf) {
    try {
      const img = await loadImage(imgBuf);
      ctx.save();
      // Clip to left column (left+top match card rounding, only bottom-right corner square)
      ctx.beginPath();
      ctx.moveTo(x + 5, jy); ctx.lineTo(x + jw, jy);
      ctx.lineTo(x + jw, jy + jh);
      ctx.lineTo(x + 5, jy + jh);
      ctx.arcTo(x, jy + jh, x, jy, 5); ctx.arcTo(x, jy, x + 5, jy, 5);
      ctx.closePath(); ctx.clip();
      ctx.drawImage(img, jx, jy, jw, jh);
      ctx.restore();
    } catch { /* fallback below */ }
  } else {
    const g = ctx.createLinearGradient(jx, jy, jx + jw, jy + jh);
    g.addColorStop(0, accent + "44"); g.addColorStop(1, accent + "11");
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + 5, jy); ctx.lineTo(x + jw, jy);
    ctx.lineTo(x + jw, jy + jh); ctx.lineTo(x + 5, jy + jh);
    ctx.arcTo(x, jy + jh, x, jy, 5); ctx.arcTo(x, jy, x + 5, jy, 5);
    ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.restore();
  }

  // Thin right border on jacket column
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x + CJ, y + 4); ctx.lineTo(x + CJ, y + CA - 4); ctx.stroke();

  // ━━━━━━━━━━━━━━ MIDDLE — Type pill + Rank badge text + Achievement ━━━━━━━━
  const mx  = x + CJ + 5;
  const mMx = mx + CM - 8; // right edge of middle column

  // Type badge — use the same image from /public/badges used by the scores page.
  // Falls back to coloured text pill if image not loaded.
  const isDX    = score.songType !== "STD";
  const badgeImg = isDX ? typeBadgeCache.DX : typeBadgeCache.STD;

  // Fixed pill height = 13px; compute width to maintain aspect ratio
  const pillH = 13;

  if (badgeImg) {
    const aspect = badgeImg.width / badgeImg.height;
    const pillW  = Math.round(pillH * aspect);
    ctx.drawImage(badgeImg, mx, y + 5, pillW, pillH);
  } else {
    // Fallback: coloured text pill (DX=cyan, STD=lavender)
    const typeStr = isDX ? "てらくす" : "スタンダード";
    const pillBg  = isDX ? "#7dd3fc" : "#c4b5fd";
    const pillFg  = isDX ? "#0c4a6e" : "#3b0764";
    ctx.font = F(6.5, "bold");
    const pillW = ctx.measureText(typeStr).width + 10;
    rr(ctx, mx, y + 5, pillW, pillH, 4);
    ctx.fillStyle = pillBg; ctx.fill();
    ctx.fillStyle = pillFg;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(typeStr, mx + 5, y + 11.5);
  }

  // [#N] pill (right-aligned in middle column) — pink background, white text
  ctx.font = F(6.5, "bold");
  const rankNumW = ctx.measureText(`#${rank}`).width + 10;
  rr(ctx, mMx - rankNumW, y + 5, rankNumW, 13, 4);
  ctx.fillStyle = "#e91e8c"; ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(`#${rank}`, mMx - rankNumW / 2, y + 11.5);

  // Rank text — per-character coloured glyphs, "+" raised and smaller (mimi xd style)
  const glyphs = RANK_GLYPHS[score.rank] ?? [["?", "#ffffff"] as RankGlyph];
  // Auto-size: start at 22px, shrink until total width fits in middle column
  let rankPx = 22;
  const measureGlyphs = (px: number) => {
    const plusPx = Math.round(px * 0.62);
    let w = 0;
    for (const [ch, , isPlus] of glyphs) {
      ctx.font = isPlus ? FR(plusPx) : FR(px);
      w += ctx.measureText(ch).width;
    }
    return w;
  };
  while (rankPx > 10 && measureGlyphs(rankPx) > CM - 8) rankPx--;

  const mainPx = rankPx;
  const plusPx = Math.round(rankPx * 0.62);
  const baseY  = y + 48;  // alphabetic baseline

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";
  let gx = mx;
  for (const [ch, color, isPlus] of glyphs) {
    ctx.font = isPlus ? FR(plusPx) : FR(mainPx);
    const gy = isPlus ? baseY - Math.round(mainPx * 0.38) : baseY;
    thickFill(ctx, ch, gx, gy, color);
    gx += ctx.measureText(ch).width;
  }

  // Achievement % — brighter so it's clearly visible on dark bg
  ctx.font = F(7.5);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  thickFill(ctx, `${ach.toFixed(4)}%`, mx, y + 58, "rgba(255,255,255,0.82)");

  // ━━━━━━━━━━━━━━ RIGHT — Rating number + FC/FS badges ━━━━━━━━━━━━━━━━━━━━━━━
  const rx  = x + CJ + CM;
  const rCx = rx + CR / 2;

  // Rating number — top half of right column
  ctx.font         = FN(20);
  ctx.textAlign    = "center";
  ctx.textBaseline = "alphabetic";
  thickFill(ctx, String(score.rating), rCx, y + 42, "#ffffff");

  // FC / FS badges — bottom-right, side-by-side, prominent colored-border style
  // Two badges fit side by side in CR=50px with 3px gap
  const sw  = Math.floor((CR - 7) / 2);  // ~21px each
  const sh  = 18;                          // taller than before
  const sy  = y + CA - sh - 4;
  const s1x = rx + 2;
  const s2x = s1x + sw + 3;

  function drawBadge(
    bx: number,
    c: { color: string; label: string } | null,
  ) {
    rr(ctx, bx, sy, sw, sh, 3);
    ctx.fillStyle = c ? c.color + "1e" : "rgba(255,255,255,0.05)"; ctx.fill();
    rr(ctx, bx, sy, sw, sh, 3);
    ctx.strokeStyle = c ? c.color : "rgba(255,255,255,0.18)";
    ctx.lineWidth   = c ? 1.5 : 0.75;
    ctx.stroke();
    if (c) {
      ctx.font         = F(7, "bold");
      ctx.fillStyle    = c.color;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(c.label, bx + sw / 2, sy + sh / 2);
    }
  }
  drawBadge(s1x, score.fc ? (FC_C[score.fc] ?? null) : null);
  drawBadge(s2x, score.fs ? (FS_C[score.fs] ?? null) : null);

  // ━━━━━━━━━━━━━━ BOTTOM — Title strip ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Solid darker diff colour for the bottom strip
  const stripColor = DIFF_STRIP[score.difficulty] ?? "#1a1040";
  // Fill rounded bottom
  rr(ctx, x, y + CA, CARD_W, CT, 5);
  ctx.fillStyle = stripColor; ctx.fill();
  // Flat top edge to square off the join with the card body
  ctx.fillRect(x, y + CA, CARD_W, 5);

  const tcy = y + CA + CT / 2;

  // Song title
  ctx.font         = F(8.5, "bold");
  ctx.fillStyle    = "rgba(255,255,255,0.88)";
  ctx.textAlign    = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(trunc(ctx, score.songTitle, CARD_W - 38), x + 5, tcy);

  // Internal level — white pill with dark text (mimi xd style)
  const lvTxt  = score.internalLevel > 0 ? score.internalLevel.toFixed(1) : "?";
  ctx.font     = FN(8);
  const lvW    = ctx.measureText(lvTxt).width + 8;
  const lvH    = CT - 6;
  const lvX    = x + CARD_W - lvW - 3;
  const lvY    = y + CA + 3;
  rr(ctx, lvX, lvY, lvW, lvH, 3);
  ctx.fillStyle = "rgba(255,255,255,0.90)"; ctx.fill();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  thickFill(ctx, lvTxt, lvX + lvW / 2, lvY + lvH / 2, "#1a1040");

  ctx.textAlign    = "left";
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

// ── Section header (matches mimi xd teal-ish bar) ────────────────────────────
function drawHeader(
  ctx: SKRSContext2D, label: string, total: number,
  x: number, y: number, w: number, barColor: string,
) {
  // Dark header bg
  rr(ctx, x, y, w, 24, 3);
  ctx.fillStyle = "#1a1030"; ctx.fill();
  // Left colour bar
  ctx.fillStyle = barColor;
  ctx.fillRect(x, y, 4, 24);
  // Label
  ctx.font = F(12, "bold"); ctx.fillStyle = "#f0eeff";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(label, x + 10, y + 12);
  // Total
  ctx.font = F(11, "bold"); ctx.fillStyle = "rgba(240,238,255,0.60)";
  ctx.textAlign = "right";
  ctx.fillText(`Total: ${total}`, x + w - 8, y + 12);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
async function drawSidebar(
  ctx: SKRSContext2D,
  profile: { name: string | null; avatar: string | null },
  ratingData: RatingData,
) {
  const sg = ctx.createLinearGradient(0, 0, 0, H);
  sg.addColorStop(0, "#1e1640"); sg.addColorStop(1, "#110d28");
  ctx.fillStyle = sg; ctx.fillRect(0, 0, SIDEBAR_W, H);

  ctx.strokeStyle = C.sidebarBorder; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(SIDEBAR_W, 0); ctx.lineTo(SIDEBAR_W, H); ctx.stroke();

  const mid = SIDEBAR_W / 2;
  let cy    = PAD;

  // ── Rating badge (spaced digits) ──
  const bw = 158, bh = 30, bx = (SIDEBAR_W - bw) / 2;
  const rg = ctx.createLinearGradient(bx, cy, bx + bw, cy);
  rg.addColorStop(0, "#7c3aed"); rg.addColorStop(1, "#f472b6");
  rr(ctx, bx, cy, bw, bh, 6); ctx.fillStyle = rg; ctx.fill();
  ctx.font = F(15, "bold"); ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const rStr = String(ratingData.totalRating).padStart(5, "0").split("").join("  ");
  ctx.fillText(rStr, mid, cy + bh / 2);
  cy += bh + 12;

  // ── Avatar ──
  const asz = 150, ax = (SIDEBAR_W - asz) / 2;
  ctx.save();
  rr(ctx, ax, cy, asz, asz, 8); ctx.clip();
  const ag = ctx.createLinearGradient(ax, cy, ax + asz, cy + asz);
  ag.addColorStop(0, "#3b2d6e"); ag.addColorStop(1, "#1a1530");
  ctx.fillStyle = ag; ctx.fillRect(ax, cy, asz, asz);
  if (profile.avatar) {
    try {
      const r = await fetch(profile.avatar, { signal: AbortSignal.timeout(4_000) });
      if (r.ok) { const img = await loadImage(Buffer.from(await r.arrayBuffer())); ctx.drawImage(img, ax, cy, asz, asz); }
    } catch { /* gradient */ }
  }
  ctx.restore();
  rr(ctx, ax, cy, asz, asz, 8);
  ctx.strokeStyle = "rgba(167,139,250,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();
  cy += asz + 12;

  // ── Name ──
  ctx.font = F(13, "bold"); ctx.fillStyle = C.sfg;
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText(profile.name ?? "Player", mid, cy);
  cy += 24;

  // ── Divider ──
  ctx.strokeStyle = C.sidebarBorder; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(PAD, cy); ctx.lineTo(SIDEBAR_W - PAD, cy); ctx.stroke();
  cy += 14;

  // ── NEW / OLD ratings ──
  const c1 = PAD + 8, c2 = SIDEBAR_W / 2 + 6;
  ctx.font = F(8); ctx.fillStyle = C.sfgSubtle; ctx.textAlign = "left";
  ctx.fillText("NEW", c1, cy); ctx.fillText("OLD", c2, cy); cy += 14;
  ctx.font = F(16, "bold"); ctx.fillStyle = "#a78bfa";
  ctx.fillText(String(ratingData.newRating), c1, cy);
  ctx.fillStyle = "#22d3ee"; ctx.fillText(String(ratingData.oldRating), c2, cy);
  cy += 24;

  function stat(lbl: string, val: string) {
    ctx.font = F(9); ctx.fillStyle = C.sfgSubtle; ctx.textAlign = "left"; ctx.fillText(lbl, PAD + 4, cy);
    ctx.font = F(9, "bold"); ctx.fillStyle = C.sfgMuted; ctx.textAlign = "right"; ctx.fillText(val, SIDEBAR_W - PAD - 4, cy);
    ctx.textAlign = "left"; cy += 15;
  }
  stat("B15 (New)", `${ratingData.newCharts.length}`);
  stat("B35 (Old)", `${ratingData.oldCharts.length}`);

  // ── Footer ──
  ctx.textAlign = "center"; ctx.font = F(8); ctx.fillStyle = C.sfgSubtle;
  ctx.fillText("generated by", mid, H - 32);
  ctx.font = F(11, "bold"); ctx.fillStyle = "#a78bfa"; ctx.fillText("moimoi", mid, H - 18);
  ctx.font = F(8); ctx.fillStyle = C.sfgSubtle; ctx.fillText(new Date().toLocaleDateString("en-CA"), mid, H - 5);
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

// ── Exports ───────────────────────────────────────────────────────────────────
export interface B50GenerateOptions {
  ratingData: RatingData;
  profile: { name: string | null; avatar: string | null; rating?: string | null };
  token: string;
  region: "intl" | "jp";
}

export async function generateB50Image(opts: B50GenerateOptions): Promise<Buffer> {
  const { ratingData, profile, token, region } = opts;
  await setupFonts();
  await loadTypeBadges();

  const canvas = createCanvas(W * SCALE, H * SCALE);
  const ctx    = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);

  await prefetch([
    ...ratingData.newCharts.map(s => s.song?.image_url ?? ""),
    ...ratingData.oldCharts.map(s => s.song?.image_url ?? ""),
  ], token, region);

  await drawSidebar(ctx, profile, ratingData);

  const cx = SIDEBAR_W + PAD;
  const cw = W - SIDEBAR_W - PAD * 2;
  let cy   = PAD;

  const newTotal = ratingData.newCharts.reduce((s, c) => s + c.rating, 0);
  drawHeader(ctx, "NEW CHARTS", newTotal, cx, cy, cw, C.pink);
  cy += 28;
  for (let i = 0; i < ratingData.newCharts.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    await drawCard(ctx, ratingData.newCharts[i], i + 1,
      cx + col * (CARD_W + CARD_GAP), cy + row * (CARD_H + CARD_GAP), token, region);
  }
  cy += Math.ceil(Math.max(ratingData.newCharts.length, 1) / COLS) * (CARD_H + CARD_GAP) + 10;

  const oldTotal = ratingData.oldCharts.reduce((s, c) => s + c.rating, 0);
  drawHeader(ctx, "OLD CHARTS", oldTotal, cx, cy, cw, C.cyan);
  cy += 28;
  for (let i = 0; i < ratingData.oldCharts.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    await drawCard(ctx, ratingData.oldCharts[i], i + 1,
      cx + col * (CARD_W + CARD_GAP), cy + row * (CARD_H + CARD_GAP), token, region);
  }

  return canvas.toBuffer("image/png");
}