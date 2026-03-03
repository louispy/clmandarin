import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { VocabWord } from '../types';
import { loadVocabIntoDb, getAllWords, getWordsByLevels, searchWords } from '../utils/vocab-loader';

export function useVocab() {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]); // empty = all
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  // Initialize DB on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const count = await db.vocab.count();
        if (count > 0) {
          if (!cancelled) { setDbReady(true); setLoading(false); }
          return;
        }
        if (!cancelled) setLoading(false);
        await loadVocabIntoDb();
        if (!cancelled) setDbReady(true);
      } catch (err) {
        console.error('Failed to load vocab:', err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load words when levels change, search clears, or DB becomes ready
  useEffect(() => {
    if (!dbReady || isSearching) return;
    if (selectedLevels.length === 0) {
      getAllWords().then(setWords);
    } else {
      getWordsByLevels(selectedLevels).then(setWords);
    }
  }, [dbReady, selectedLevels, isSearching]);

  const toggleLevel = useCallback((level: number) => {
    setSelectedLevels((prev) => {
      if (prev.includes(level)) {
        return prev.filter((l) => l !== level);
      }
      return [...prev, level].sort();
    });
  }, []);

  // Search
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        setIsSearching(true);
        const results = await searchWords(query);
        setWords(results);
      } else {
        setIsSearching(false);
      }
    },
    []
  );

  return {
    loading,
    words,
    dbReady,
    selectedLevels,
    toggleLevel,
    searchQuery,
    isSearching,
    handleSearch,
  };
}
