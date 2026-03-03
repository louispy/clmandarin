import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { VocabWord } from '../types';
import { loadVocabIntoDb, getAllWords, getWordsByLevel, searchWords } from '../utils/vocab-loader';

export function useVocab() {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(0); // 0 = all
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  // Initialize DB on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fast path: check if data already exists
        const count = await db.vocab.count();
        if (count > 0) {
          if (!cancelled) { setDbReady(true); setLoading(false); }
          return;
        }
        // First visit: load in background, show app shell immediately
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

  // Load words when level changes, search clears, or DB becomes ready
  useEffect(() => {
    if (!dbReady || isSearching) return;
    (selectedLevel === 0 ? getAllWords() : getWordsByLevel(selectedLevel)).then(setWords);
  }, [dbReady, selectedLevel, isSearching]);

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
    selectedLevel,
    setSelectedLevel,
    searchQuery,
    isSearching,
    handleSearch,
  };
}
