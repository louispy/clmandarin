import type { ChengyuEntry } from './chengyu';

/**
 * Instagram-Story-shaped PNGs, drawn on a canvas and handed to the OS share
 * sheet.
 *
 * Why not the real Instagram Stories deep link: that is the
 * `instagram-stories://share?source_application=<app-id>` scheme, which takes
 * its image through UIPasteboard on iOS or Intent extras on Android. Both need
 * a native app and a registered Facebook app id, and web JavaScript cannot
 * write typed pasteboard items. The Web Share API gets us to the same place
 * with one extra tap: share sheet, then Instagram, then Stories.
 *
 * Why hand-drawn canvas rather than html2canvas: html2canvas walks and inlines
 * the page's stylesheets, which is heavy and fights the offline-first story.
 * This is a few hundred lines with nothing to go wrong at runtime.
 */

/**
 * 1:1 is the default. Instagram letterboxes a square onto the Story gradient,
 * which reads as deliberate, and the same file also works in a feed post, a
 * chat or a tweet — where a 9:16 image gets cropped or shrunk. 'story' is kept
 * for the full-bleed variant.
 */
export type ShareFormat = 'square' | 'story';

interface Metrics {
  w: number;
  h: number;
  /** Multiplier on the gaps between rows. */
  air: number;
  /** Starting size for the headline before it is shrunk to fit. */
  headline: number;
  body: number;
  literal: number;
  pinyin: number;
  /** How far the wordmark sits above the bottom edge. */
  footer: number;
}

const FORMATS: Record<ShareFormat, Metrics> = {
  // A square has roughly half the vertical room, so the type comes down with
  // it — otherwise a five-line meaning collides with the wordmark.
  square: { w: 1080, h: 1080, air: 0.68, headline: 150, body: 40, literal: 34, pinyin: 44, footer: 84 },
  story: { w: 1080, h: 1920, air: 1, headline: 200, body: 46, literal: 40, pinyin: 54, footer: 110 },
};

interface Frame {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  m: Metrics;
}

const INK = '#FFF8F0';
const PAPER = '#1C1412';
const RED = '#C41E3A';
const GOLD = '#D4A017';
const GOLD_SOFT = '#F0C75E';
const MUTED = 'rgba(255, 248, 240, 0.62)';

const HANZI_STACK = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
const LATIN_STACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function frame(format: ShareFormat): Frame {
  const m = FORMATS[format];
  const canvas = document.createElement('canvas');
  canvas.width = m.w;
  canvas.height = m.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable on this device.');
  return { canvas, ctx, m };
}

/** Deep warm ground with a red bloom top-left and a gold one bottom-right. */
function paintBackground({ ctx, m }: Frame) {
  const { w, h } = m;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);

  const reach = Math.hypot(w, h) * 0.52;
  const red = ctx.createRadialGradient(140, 200, 0, 140, 200, reach);
  red.addColorStop(0, 'rgba(196, 30, 58, 0.55)');
  red.addColorStop(1, 'rgba(196, 30, 58, 0)');
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, w, h);

  const gold = ctx.createRadialGradient(w - 80, h - 160, 0, w - 80, h - 160, reach * 0.8);
  gold.addColorStop(0, 'rgba(212, 160, 23, 0.30)');
  gold.addColorStop(1, 'rgba(212, 160, 23, 0)');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, w, h);
}

/** Split `text` into lines that fit `maxWidth` at the current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Shrink the font until `text` fits on one line. */
function fitOneLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startPx: number,
  stack: string,
  weight = '700'
): number {
  let size = startPx;
  for (; size > 24; size -= 4) {
    ctx.font = `${weight} ${size}px ${stack}`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

/**
 * A vertical stack, measured before it is drawn.
 *
 * Laying rows out at fixed y values left a dead band above the wordmark
 * whenever a meaning wrapped to fewer lines than the tallest case. Measuring
 * first and centring the whole block keeps any entry looking deliberate.
 */
interface Row {
  /** Space this row occupies. */
  h: number;
  /** Draw it; `y` is the row's top edge. */
  draw: (y: number) => void;
}

function textRow(
  f: Frame,
  text: string,
  font: string,
  fill: string,
  size: number,
  leading = 1.25
): Row {
  const h = size * leading;
  return {
    h,
    draw: (y) => {
      f.ctx.font = font;
      f.ctx.fillStyle = fill;
      f.ctx.textAlign = 'center';
      f.ctx.fillText(text, f.m.w / 2, y + size);
    },
  };
}

function gap(h: number, air = 1): Row {
  return { h: h * air, draw: () => {} };
}

/** Centre the stack vertically, biased up to leave the wordmark room. */
function drawStack(f: Frame, rows: Row[]) {
  const bias = -f.m.footer * 0.6;
  const total = rows.reduce((sum, r) => sum + r.h, 0);
  let y = (f.m.h - total) / 2 + bias;
  for (const row of rows) {
    row.draw(y);
    y += row.h;
  }
}

function wordmark({ ctx, m }: Frame) {
  const W = m.w;
  const H = m.h;
  const y = H - m.footer;
  ctx.textAlign = 'center';
  ctx.font = `900 46px ${LATIN_STACK}`;
  const cl = 'CL';
  const zhong = '中';
  const em = 'M';
  ctx.font = `900 46px ${LATIN_STACK}`;
  const wCl = ctx.measureText(cl).width;
  const wM = ctx.measureText(em).width;
  ctx.font = `900 46px ${HANZI_STACK}`;
  const wZh = ctx.measureText(zhong).width;
  const total = wCl + wZh + wM;
  let x = W / 2 - total / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = `900 46px ${LATIN_STACK}`;
  ctx.fillText(cl, x, y);
  x += wCl;
  ctx.fillStyle = GOLD;
  ctx.font = `900 46px ${HANZI_STACK}`;
  ctx.fillText(zhong, x, y);
  x += wZh;
  ctx.fillStyle = INK;
  ctx.font = `900 46px ${LATIN_STACK}`;
  ctx.fillText(em, x, y);

  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${LATIN_STACK}`;
  ctx.fillText('HSK vocabulary, offline', W / 2, H - m.footer + 48);
}

export function renderChengyuStory(
  entry: ChengyuEntry,
  format: ShareFormat = 'square'
): Promise<Blob> {
  const f = frame(format);
  const { ctx, m } = f;
  paintBackground(f);

  const maxWidth = m.w - 96 * 2;
  const air = m.air;
  const rows: Row[] = [];

  rows.push(textRow(f, entry.type === 'suyu' ? '今日俗语' : '今日成语',
    `800 30px ${HANZI_STACK}`, GOLD_SOFT, 30));
  rows.push(gap(10, air));
  rows.push(textRow(f, 'SAYING OF THE DAY', `700 26px ${LATIN_STACK}`, MUTED, 26));
  rows.push(gap(64, air));

  const hanziSize = fitOneLine(ctx, entry.hanzi, maxWidth, m.headline, HANZI_STACK);
  rows.push(textRow(f, entry.hanzi, `700 ${hanziSize}px ${HANZI_STACK}`, INK, hanziSize, 1.15));
  rows.push(gap(18, air));

  const pinyinSize = fitOneLine(ctx, entry.pinyin, maxWidth, m.pinyin, LATIN_STACK, '600');
  rows.push(textRow(f, entry.pinyin, `600 ${pinyinSize}px ${LATIN_STACK}`, GOLD_SOFT, pinyinSize));
  rows.push(gap(52, air));

  rows.push({
    h: 3,
    draw: (y) => {
      ctx.strokeStyle = 'rgba(212, 160, 23, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(m.w / 2 - 70, y);
      ctx.lineTo(m.w / 2 + 70, y);
      ctx.stroke();
    },
  });
  rows.push(gap(52, air));

  ctx.font = `italic 500 ${m.literal}px ${LATIN_STACK}`;
  for (const line of wrap(ctx, `\u201C${entry.literal}\u201D`, maxWidth)) {
    rows.push(textRow(f, line, `italic 500 ${m.literal}px ${LATIN_STACK}`, MUTED, m.literal, 1.4));
  }
  rows.push(gap(28, air));

  ctx.font = `600 ${m.body}px ${LATIN_STACK}`;
  for (const line of wrap(ctx, entry.meaning, maxWidth)) {
    rows.push(textRow(f, line, `600 ${m.body}px ${LATIN_STACK}`, INK, m.body, 1.38));
  }

  drawStack(f, rows);
  wordmark(f);
  return toBlob(f.canvas);
}

export interface QuizStoryData {
  deckName: string;
  points: number;
  correct: number;
  total: number;
  bestStreak: number;
  avgSeconds: number;
}

export function renderQuizStory(
  data: QuizStoryData,
  format: ShareFormat = 'square'
): Promise<Blob> {
  const f = frame(format);
  const { ctx, m } = f;
  paintBackground(f);

  const margin = 96;
  const air = m.air;
  const rows: Row[] = [];
  const big = format === 'square' ? 150 : 200;
  const ring = format === 'square' ? 100 : 130;

  rows.push(textRow(f, 'QUIZ RESULT', `700 28px ${LATIN_STACK}`, MUTED, 28));
  rows.push(gap(6, air));
  const deckSize = fitOneLine(ctx, data.deckName, m.w - margin * 2, 60, HANZI_STACK);
  rows.push(textRow(f, data.deckName, `700 ${deckSize}px ${HANZI_STACK}`, INK, deckSize));
  rows.push(gap(56, air));

  // Leading has to clear the descender: a thousands separator drops about
  // 0.2em below the baseline, and at 1.05 the comma in "14,820" landed on top
  // of the POINTS label. Three-digit scores hid this.
  // Correct-out-of-total leads; the score sits under it.
  const tally = `${data.correct}/${data.total}`;
  rows.push(textRow(f, tally, `900 ${big}px ${LATIN_STACK}`, INK, big, 1.28));
  rows.push(gap(10, air));
  rows.push(textRow(f, 'CORRECT', `700 30px ${LATIN_STACK}`, MUTED, 30));
  rows.push(gap(14, air));
  rows.push(textRow(f, `${data.points.toLocaleString()} points`, `800 40px ${LATIN_STACK}`, GOLD, 40));
  rows.push(gap(56, air));

  const pct = data.total ? data.correct / data.total : 0;
  rows.push({
    h: ring * 2 + 22,
    draw: (y) => {
      const cx = m.w / 2;
      const cy = y + ring + 11;
      ctx.lineWidth = 22;
      ctx.strokeStyle = 'rgba(255, 248, 240, 0.16)';
      ctx.beginPath();
      ctx.arc(cx, cy, ring, 0, Math.PI * 2);
      ctx.stroke();
      if (pct > 0) {
        ctx.strokeStyle = RED;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(ring * 0.57)}px ${LATIN_STACK}`;
      ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy + ring * 0.2);
    },
  });
  rows.push(gap(76, air));

  const stats: [string, string][] = [
    [`${Math.round((data.correct / Math.max(1, data.total)) * 100)}%`, 'ACCURACY'],
    [`${data.bestStreak}`, 'BEST STREAK'],
    [`${data.avgSeconds.toFixed(1)}s`, 'AVG TIME'],
  ];
  rows.push({
    h: 104,
    draw: (y) => {
      const colWidth = (m.w - margin * 2) / stats.length;
      ctx.textAlign = 'center';
      stats.forEach(([value, label], i) => {
        const x = margin + colWidth * i + colWidth / 2;
        ctx.fillStyle = INK;
        ctx.font = `800 56px ${LATIN_STACK}`;
        ctx.fillText(value, x, y + 56);
        ctx.fillStyle = MUTED;
        ctx.font = `700 24px ${LATIN_STACK}`;
        ctx.fillText(label, x, y + 98);
      });
    },
  });

  drawStack(f, rows);
  wordmark(f);
  return toBlob(f.canvas);
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
      'image/png'
    );
  });
}

function fileFrom(blob: Blob, name: string): File {
  return new File([blob], name, { type: 'image/png' });
}

/** Whether the OS share sheet will accept an image from us. */
export function canShareImage(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false;
  try {
    return navigator.canShare({ files: [fileFrom(new Blob([], { type: 'image/png' }), 'p.png')] });
  } catch {
    return false;
  }
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Hand the image to the OS share sheet, or save it if that isn't available.
 *
 * Must be called straight from a click handler with the blob already in hand:
 * Safari rejects share() if the call is too far from the user's gesture, which
 * is why callers pre-render.
 *
 * Deliberately shares the file and nothing else. Passing `title` or `text`
 * alongside it makes some targets — LINE among them — send two separate
 * messages, a text one and then the image.
 */
export async function shareImage(blob: Blob, filename: string): Promise<ShareOutcome> {
  const file = fileFrom(blob, filename);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      // The user backing out of the sheet is not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      throw err;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
