import { useState, useEffect } from 'react';
import { loadChengyu, pickForDay, dayNumber, type ChengyuEntry } from '../utils/chengyu';

/** The day's chengyu. Every user sees the same entry on the same date. */
export function useChengyu() {
  const [entries, setEntries] = useState<ChengyuEntry[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadChengyu()
      .then((list) => !cancelled && setEntries(list))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, []);

  const entry = pickForDay(entries, dayNumber());

  return { entry, failed, loading: entries.length === 0 && !failed };
}
