import { fetchJsonWithRetry } from './vocab-loader';

export interface ChengyuEntry {
  hanzi: string;
  pinyin: string;
  literal: string;
  meaning: string;
  type: 'chengyu' | 'suyu';
}

let cache: ChengyuEntry[] | null = null;

/**
 * Bundled, not fetched from an API: a daily chengyu that needs the network
 * fails on exactly the days someone is studying on a plane or a subway.
 * Precached by the service worker alongside the vocab data.
 */
export async function loadChengyu(): Promise<ChengyuEntry[]> {
  if (cache) return cache;
  const res = await fetchJsonWithRetry(`${import.meta.env.BASE_URL}data/chengyu.json`);
  cache = (await res.json()) as ChengyuEntry[];
  return cache;
}

const MS_PER_DAY = 86_400_000;

/**
 * Walks the collection with a stride coprime to its length, so consecutive
 * days land far apart (a plain sequential index would march through whole
 * themed runs) while still visiting every entry exactly once per cycle.
 * 137 is prime, so it is coprime with any length that isn't a multiple of it.
 */
const STRIDE = 137;

/**
 * A stable number for a calendar date, identical in every timezone.
 *
 * Built from the local calendar date via Date.UTC rather than a local
 * timestamp: a local-midnight Date shifts by the zone offset, so Los Angeles
 * and Tokyo would land on different entries for the same date. Everyone on
 * the 21st sees the same chengyu, each at their own midnight.
 */
export function dayNumber(date = new Date()): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY
  );
}

export function pickForDay(entries: ChengyuEntry[], day: number): ChengyuEntry | null {
  if (entries.length === 0) return null;
  const stride = entries.length % STRIDE === 0 ? 1 : STRIDE;
  return entries[((day * stride) % entries.length + entries.length) % entries.length];
}
