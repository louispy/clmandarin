import { useState, useEffect, useCallback } from 'react';
import { loadChengyu, pickForDay, dayNumber, type ChengyuEntry } from '../utils/chengyu';

/**
 * The day's chengyu. Stable for the whole local day; the reroll is a
 * peek at other entries and deliberately does not persist — tomorrow still
 * brings the scheduled one.
 */
export function useChengyu() {
  const [entries, setEntries] = useState<ChengyuEntry[]>([]);
  const [offset, setOffset] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadChengyu()
      .then((list) => !cancelled && setEntries(list))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, []);

  const entry = pickForDay(entries, dayNumber() + offset);
  const reroll = useCallback(() => setOffset((o) => o + 1), []);
  const isToday = offset === 0;

  return { entry, reroll, isToday, failed, loading: entries.length === 0 && !failed };
}
