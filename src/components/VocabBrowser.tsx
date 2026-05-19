import { useState, useRef, useEffect, useCallback } from 'react';
import type { VocabWord, FlashcardList } from '../types';
import type { VisibilityState } from '../hooks/useVisibility';
import type { Script } from '../hooks/useScript';
import { WordCard } from './WordCard';
import { AddCustomWordModal } from './AddCustomWordModal';

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];

export function VocabBrowser({
  words,
  dataLoading,
  selectedLevels,
  onToggleLevel,
  showCustom,
  onToggleCustom,
  hasCustomWords,
  onAddCustomWord,
  searchQuery,
  onSearch,
  isSearching,
  lists,
  onAddToList,
  onCreateListAndAdd,
  onAddFiltered,
  onCreateListAndAddFiltered,
  onUpdateWord,
  script,
  isFavorite,
  onToggleFavorite,
  visibility,
  onToggleVisibility,
  onStudyWord,
  onStudyFiltered,
}: {
  words: VocabWord[];
  dataLoading?: boolean;
  selectedLevels: number[];
  onToggleLevel: (level: number) => void;
  showCustom: boolean;
  onToggleCustom: () => void;
  hasCustomWords: boolean;
  onAddCustomWord: (input: { hanzi: string; pinyin: string; english: string; hskLevel: number }) => Promise<unknown>;
  searchQuery: string;
  onSearch: (query: string) => void;
  isSearching: boolean;
  lists: FlashcardList[];
  onAddToList: (listId: string, wordId: string) => void;
  onCreateListAndAdd: (name: string, wordId: string) => void;
  onAddFiltered: (listId: string) => void;
  onCreateListAndAddFiltered: (name: string) => void;
  onUpdateWord: (id: string, updates: { english?: string; userNote?: string; englishOriginal?: string }) => Promise<void>;
  script: Script;
  isFavorite: (wordId: string) => boolean;
  onToggleFavorite: (wordId: string) => void;
  visibility: VisibilityState;
  onToggleVisibility: (field: keyof VisibilityState) => void;
  onStudyWord: (wordId: string) => void;
  onStudyFiltered: () => void;
}) {
  const [addMenu, setAddMenu] = useState(false);
  const [addCreate, setAddCreate] = useState(false);
  const [addNewName, setAddNewName] = useState('');
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  // Default Level in the custom-word modal: the single selected HSK level, or 0 (None) otherwise.
  const defaultCustomLevel = selectedLevels.length === 1 ? selectedLevels[0] : 0;

  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Reset visible count when words change (filter/search)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [words]);

  // Show scroll-to-top button after scrolling down
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for infinite scroll
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, words.length));
  }, [words.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const visibleWords = words.slice(0, visibleCount);
  const hasMore = visibleCount < words.length;

  const filterLabel = `HSK ${selectedLevels.join(', ')}`;

  useEffect(() => {
    if (!addMenu) return;
    const handler = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setAddMenu(false);
        setAddCreate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addMenu]);

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cn-muted/50 dark:text-cn-muted-dark/50">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search hanzi, pinyin, or english..."
          className="w-full rounded-xl border border-cn-border bg-cn-surface py-2 pl-9 pr-3 text-sm text-cn-ink outline-none transition-colors placeholder:text-cn-muted/40 focus:border-cn-red dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream dark:placeholder:text-cn-muted-dark/40 dark:focus:border-cn-red-light"
        />
      </div>

      {/* HSK Level Tabs */}
      {!isSearching && (
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <span className="mr-1 shrink-0 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark sm:hidden">
              HSK:
            </span>
            {HSK_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => onToggleLevel(level)}
                className={`shrink-0 rounded-lg px-2 py-1.5 text-sm font-bold transition-all sm:px-3 ${
                  selectedLevels.includes(level)
                    ? 'bg-cn-red text-white shadow-md shadow-cn-red/30'
                    : 'bg-cn-surface text-cn-muted hover:bg-cn-red/10 hover:text-cn-red dark:bg-cn-surface-dark dark:text-cn-muted-dark dark:hover:bg-cn-red/10 dark:hover:text-cn-red-light'
                }`}
                title={`HSK ${level}`}
              >
                <span className="sm:hidden">{level}</span>
                <span className="hidden sm:inline">HSK {level}</span>
              </button>
            ))}

            {/* Custom words filter — only when the user actually has some */}
            {hasCustomWords && (
              <button
                onClick={onToggleCustom}
                className={`shrink-0 rounded-lg px-2 py-1.5 text-sm font-bold transition-all sm:px-3 ${
                  showCustom
                    ? 'bg-cn-gold text-white shadow-md shadow-cn-gold/30'
                    : 'bg-cn-surface text-cn-muted hover:bg-cn-gold/10 hover:text-cn-gold-dark dark:bg-cn-surface-dark dark:text-cn-muted-dark dark:hover:bg-cn-gold/10 dark:hover:text-cn-gold-light'
                }`}
                title="Custom words"
              >
                <span className="sm:hidden">C</span>
                <span className="hidden sm:inline">Custom</span>
              </button>
            )}

            {/* Inline + button — adds currently filtered words to a list */}
            {words.length > 0 && selectedLevels.length > 0 && (
              <div ref={addRef} className="relative shrink-0">
                <button
                  onClick={() => setAddMenu(!addMenu)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-cn-gold/10 text-cn-gold-dark transition-colors hover:bg-cn-gold/20 dark:text-cn-gold-light"
                  title={`Add ${filterLabel} to list`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                </button>
                {addMenu && (
                  <div className="absolute right-0 top-full z-40 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark sm:left-0 sm:right-auto">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                  Add {filterLabel} to...
                </p>
                {lists.filter((l) => l.id !== '__favorites__').map((list) => (
                  <button
                    key={list.id}
                    onClick={() => {
                      onAddFiltered(list.id);
                      setAddMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cn-ink transition-colors hover:bg-cn-gold/10 dark:text-cn-cream dark:hover:bg-cn-gold/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cn-muted dark:text-cn-muted-dark">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    <span className="truncate">{list.name}</span>
                    <span className="ml-auto text-xs text-cn-muted dark:text-cn-muted-dark">
                      {list.wordIds.length}
                    </span>
                  </button>
                ))}
                {lists.some((l) => l.id !== '__favorites__') && (
                  <div className="my-1 border-t border-cn-border dark:border-cn-border-dark" />
                )}
                {addCreate ? (
                  <div className="flex gap-1 px-2 py-1">
                    <input
                      autoFocus
                      value={addNewName}
                      onChange={(e) => setAddNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && addNewName.trim()) {
                          onCreateListAndAddFiltered(addNewName.trim());
                          setAddNewName('');
                          setAddCreate(false);
                          setAddMenu(false);
                        }
                        if (e.key === 'Escape') {
                          setAddCreate(false);
                          setAddNewName('');
                        }
                      }}
                      placeholder="List name..."
                      className="min-w-0 flex-1 rounded-lg border border-cn-border bg-transparent px-2 py-1 text-sm text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
                    />
                    <button
                      onClick={() => {
                        if (addNewName.trim()) {
                          onCreateListAndAddFiltered(addNewName.trim());
                          setAddNewName('');
                          setAddCreate(false);
                          setAddMenu(false);
                        }
                      }}
                      className="rounded-lg bg-cn-red px-2 py-1 text-xs font-medium text-white"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddCreate(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-cn-red transition-colors hover:bg-cn-red/10 dark:text-cn-red-light"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Create new flashcard list
                  </button>
                )}
              </div>
            )}
          </div>
          )}
          </div>

          {/* Study filtered words */}
          {words.length > 0 && (
            <button
              onClick={onStudyFiltered}
              className="flex items-center justify-center rounded-xl bg-cn-red text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark hover:shadow-lg h-8 w-8 sm:h-auto sm:w-auto sm:px-4 sm:py-2"
              title="Study"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 sm:hidden">
                <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
              </svg>
              <span className="hidden sm:inline">Study</span>
            </button>
          )}
        </div>
      )}

      {/* Toolbar: visibility toggles + view mode */}
      <div className="sticky top-[49px] z-30 -mx-4 flex items-center justify-between bg-cn-paper/95 px-4 pb-2 pt-4 backdrop-blur dark:bg-cn-paper-dark/95">
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
            Show:
          </span>
          {(['hanzi', 'pinyin', 'english'] as const).map((field) => (
            <button
              key={field}
              onClick={() => onToggleVisibility(field)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                visibility[field]
                  ? 'bg-cn-red/10 text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light'
                  : 'bg-cn-surface text-cn-muted/40 dark:bg-cn-surface-dark dark:text-cn-muted-dark/40'
              }`}
            >
              {field === 'hanzi' ? '字' : field === 'pinyin' ? 'Pīn' : 'Eng'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-cn-muted dark:text-cn-muted-dark">
            {isSearching ? `${words.length} result${words.length !== 1 ? 's' : ''}` : `${words.length} words`}
          </span>
          <button
            onClick={() => setAddCustomOpen(true)}
            className="rounded-lg p-1.5 text-cn-muted transition-colors hover:text-cn-gold-dark dark:text-cn-muted-dark dark:hover:text-cn-gold-light"
            title="Add custom word"
            aria-label="Add custom word"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Words */}
      {dataLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-5xl">&#23398;</p>
          <p className="text-cn-muted dark:text-cn-muted-dark">Loading vocabulary...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleWords.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              isFavorite={isFavorite(word.id)}
              onToggleFavorite={onToggleFavorite}
              lists={lists}
              onAddToList={onAddToList}
              onCreateListAndAdd={onCreateListAndAdd}
              onUpdateWord={onUpdateWord}
              script={script}
              visibility={visibility}
              onClick={() => onStudyWord(word.id)}
            />
          ))}
        </div>
      )}
      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-1" />}

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-cn-red p-3 text-white shadow-lg shadow-cn-red/30 transition-all hover:bg-cn-red-dark hover:shadow-xl active:scale-95"
          title="Scroll to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {addCustomOpen && (
        <AddCustomWordModal
          defaultLevel={defaultCustomLevel}
          onClose={() => setAddCustomOpen(false)}
          onAdd={onAddCustomWord}
        />
      )}
    </div>
  );
}
