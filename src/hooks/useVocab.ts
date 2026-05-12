import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { VocabWord } from '../types';
import {
  loadVocabIntoDb,
  getFilteredWords,
  searchWords,
  addCustomWord as addCustomWordToDb,
  updateWord as updateWordInDb,
} from '../utils/vocab-loader';

export function useVocab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]); // empty = all HSK + custom
  const [showCustom, setShowCustom] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  // Initialize DB on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const count = await db.vocab.count();
        // If the DB already has data, dismiss the loading screen immediately
        // and run any migrations silently in the background. On a true first
        // load (empty DB) we keep the spinner up until the fetch + bulkPut
        // finish, otherwise the user lands on an empty word list.
        if (count > 0 && !cancelled) {
          setDbReady(true);
          setLoading(false);
        }
        await loadVocabIntoDb();
        if (!cancelled) {
          setDbReady(true);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load vocab:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  // Load words when filters change, search clears, or DB becomes ready
  useEffect(() => {
    if (!dbReady || isSearching) return;
    getFilteredWords({ levels: selectedLevels, showCustom }).then(setWords);
  }, [dbReady, selectedLevels, showCustom, isSearching, refreshKey]);

  const toggleLevel = useCallback((level: number) => {
    setSelectedLevels((prev) => {
      if (prev.includes(level)) {
        return prev.filter((l) => l !== level);
      }
      return [...prev, level].sort();
    });
  }, []);

  const toggleCustom = useCallback(() => {
    setShowCustom((c) => !c);
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

  const addCustomWord = useCallback(
    async (input: { hanzi: string; pinyin: string; english: string; hskLevel: number }) => {
      const word = await addCustomWordToDb(input);
      setRefreshKey((k) => k + 1);
      return word;
    },
    []
  );

  const updateWord = useCallback(
    async (id: string, updates: { english?: string; userNote?: string; englishOriginal?: string }) => {
      await updateWordInDb(id, updates);
      setRefreshKey((k) => k + 1);
    },
    []
  );

  return {
    loading,
    error,
    retry,
    words,
    dbReady,
    selectedLevels,
    toggleLevel,
    showCustom,
    toggleCustom,
    searchQuery,
    isSearching,
    handleSearch,
    addCustomWord,
    updateWord,
  };
}
