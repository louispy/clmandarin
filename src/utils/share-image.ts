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

const W = 1080;
const H = 1920;

const INK = '#FFF8F0';
const PAPER = '#1C1412';
const RED = '#C41E3A';
const GOLD = '#D4A017';
const GOLD_SOFT = '#F0C75E';
const MUTED = 'rgba(255, 248, 240, 0.62)';

const HANZI_STACK = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
const LATIN_STACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function ctx2d(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable on this device.');
  return { canvas, ctx };
}

/** Deep warm ground with a red bloom top-left and a gold one bottom-right. */
function paintBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  const red = ctx.createRadialGradient(140, 200, 0, 140, 200, 1150);
  red.addColorStop(0, 'rgba(196, 30, 58, 0.55)');
  red.addColorStop(1, 'rgba(196, 30, 58, 0)');
  ctx.fillStyle = red;
  ctx.fillRect(0, 0, W, H);

  const gold = ctx.createRadialGradient(W - 80, H - 160, 0, W - 80, H - 160, 900);
  gold.addColorStop(0, 'rgba(212, 160, 23, 0.30)');
  gold.addColorStop(1, 'rgba(212, 160, 23, 0)');
  ctx.fillStyle = gold;
  ctx.fillRect(0, 0, W, H);
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
  ctx: CanvasRenderingContext2D,
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
      ctx.font = font;
      ctx.fillStyle = fill;
      ctx.textAlign = 'center';
      ctx.fillText(text, W / 2, y + size);
    },
  };
}

function gap(h: number): Row {
  return { h, draw: () => {} };
}

/** Centre the stack vertically, biased up to leave the wordmark room. */
function drawStack(rows: Row[], bias = -70) {
  const total = rows.reduce((sum, r) => sum + r.h, 0);
  let y = (H - total) / 2 + bias;
  for (const row of rows) {
    row.draw(y);
    y += row.h;
  }
}

function wordmark(ctx: CanvasRenderingContext2D) {
  const y = H - 110;
  ctx.textAlign = 'center';
  ctx.font = `900 46px ${LATIN_STACK}`;
  const cl = 'CL';
  const zhong = '中';
  const m = 'M';
  ctx.font = `900 46px ${LATIN_STACK}`;
  const wCl = ctx.measureText(cl).width;
  const wM = ctx.measureText(m).width;
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
  ctx.fillText(m, x, y);

  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${LATIN_STACK}`;
  ctx.fillText('HSK vocabulary, offline', W / 2, H - 62);
}

export function renderChengyuStory(entry: ChengyuEntry): Promise<Blob> {
  const { canvas, ctx } = ctx2d();
  paintBackground(ctx);

  const maxWidth = W - 96 * 2;
  const rows: Row[] = [];

  rows.push(textRow(ctx, entry.type === 'suyu' ? '今日俗语' : '今日成语',
    `800 30px ${HANZI_STACK}`, GOLD_SOFT, 30));
  rows.push(gap(10));
  rows.push(textRow(ctx, 'SAYING OF THE DAY', `700 26px ${LATIN_STACK}`, MUTED, 26));
  rows.push(gap(64));

  const hanziSize = fitOneLine(ctx, entry.hanzi, maxWidth, 200, HANZI_STACK);
  rows.push(textRow(ctx, entry.hanzi, `700 ${hanziSize}px ${HANZI_STACK}`, INK, hanziSize, 1.15));
  rows.push(gap(18));

  const pinyinSize = fitOneLine(ctx, entry.pinyin, maxWidth, 54, LATIN_STACK, '600');
  rows.push(textRow(ctx, entry.pinyin, `600 ${pinyinSize}px ${LATIN_STACK}`, GOLD_SOFT, pinyinSize));
  rows.push(gap(52));

  rows.push({
    h: 3,
    draw: (y) => {
      ctx.strokeStyle = 'rgba(212, 160, 23, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 70, y);
      ctx.lineTo(W / 2 + 70, y);
      ctx.stroke();
    },
  });
  rows.push(gap(52));

  ctx.font = `italic 500 40px ${LATIN_STACK}`;
  for (const line of wrap(ctx, `\u201C${entry.literal}\u201D`, maxWidth)) {
    rows.push(textRow(ctx, line, `italic 500 40px ${LATIN_STACK}`, MUTED, 40, 1.4));
  }
  rows.push(gap(28));

  ctx.font = `600 46px ${LATIN_STACK}`;
  for (const line of wrap(ctx, entry.meaning, maxWidth)) {
    rows.push(textRow(ctx, line, `600 46px ${LATIN_STACK}`, INK, 46, 1.38));
  }

  drawStack(rows);
  wordmark(ctx);
  return toBlob(canvas);
}

export interface QuizStoryData {
  deckName: string;
  points: number;
  correct: number;
  total: number;
  bestStreak: number;
  avgSeconds: number;
}

export function renderQuizStory(data: QuizStoryData): Promise<Blob> {
  const { canvas, ctx } = ctx2d();
  paintBackground(ctx);

  const margin = 96;
  const rows: Row[] = [];

  rows.push(textRow(ctx, 'QUIZ RESULT', `700 28px ${LATIN_STACK}`, MUTED, 28));
  rows.push(gap(6));
  const deckSize = fitOneLine(ctx, data.deckName, W - margin * 2, 60, HANZI_STACK);
  rows.push(textRow(ctx, data.deckName, `700 ${deckSize}px ${HANZI_STACK}`, INK, deckSize));
  rows.push(gap(56));

  const points = data.points.toLocaleString();
  rows.push(textRow(ctx, points, `900 200px ${LATIN_STACK}`, GOLD, 200, 1.05));
  rows.push(gap(4));
  rows.push(textRow(ctx, 'POINTS', `700 30px ${LATIN_STACK}`, MUTED, 30));
  rows.push(gap(72));

  const pct = data.total ? data.correct / data.total : 0;
  const r = 130;
  rows.push({
    h: r * 2 + 22,
    draw: (y) => {
      const cx = W / 2;
      const cy = y + r + 11;
      ctx.lineWidth = 22;
      ctx.strokeStyle = 'rgba(255, 248, 240, 0.16)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      if (pct > 0) {
        ctx.strokeStyle = RED;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();
      }
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `800 74px ${LATIN_STACK}`;
      ctx.fillText(`${Math.round(pct * 100)}%`, cx, cy + 26);
    },
  });
  rows.push(gap(76));

  const stats: [string, string][] = [
    [`${data.correct}/${data.total}`, 'CORRECT'],
    [`${data.bestStreak}`, 'BEST STREAK'],
    [`${data.avgSeconds.toFixed(1)}s`, 'AVG TIME'],
  ];
  rows.push({
    h: 104,
    draw: (y) => {
      const colWidth = (W - margin * 2) / stats.length;
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

  drawStack(rows);
  wordmark(ctx);
  return toBlob(canvas);
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
 */
export async function shareImage(
  blob: Blob,
  filename: string,
  title: string
): Promise<ShareOutcome> {
  const file = fileFrom(blob, filename);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
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
