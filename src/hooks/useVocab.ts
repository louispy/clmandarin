import { useState, useEffect, useCallback } from 'react';
import type { VocabWord } from '../types';
import { loadVocabIntoDb, getWordsByLevel, searchWords } from '../utils/vocab-loader';

export function useVocab() {
  const [loading, setLoading] = useState(true);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Initialize DB on first mount
  useEffect(() => {
    loadVocabIntoDb()
      .then(() => setLoading(false))
      .catch((err) => {
        console.error('Failed to load vocab:', err);
        setLoading(false);
      });
  }, []);

  // Load words when level changes or search clears
  useEffect(() => {
    if (loading || isSearching) return;
    getWordsByLevel(selectedLevel).then(setWords);
  }, [loading, selectedLevel, isSearching]);

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
    selectedLevel,
    setSelectedLevel,
    searchQuery,
    isSearching,
    handleSearch,
  };
}
