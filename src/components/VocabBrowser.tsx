import { useState, useRef, useEffect } from 'react';
import type { VocabWord, FlashcardList } from '../types';
import type { VisibilityState } from '../hooks/useVisibility';
import { WordCard, WordCardSquare } from './WordCard';

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];

export function VocabBrowser({
  words,
  selectedLevel,
  onSelectLevel,
  searchQuery,
  onSearch,
  isSearching,
  lists,
  onAddToList,
  onCreateListAndAdd,
  onAddLevel,
  onCreateListAndAddLevel,
  isFavorite,
  onToggleFavorite,
  visibility,
  onToggleVisibility,
  viewMode,
  onToggleViewMode,
}: {
  words: VocabWord[];
  selectedLevel: number;
  onSelectLevel: (level: number) => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  isSearching: boolean;
  lists: FlashcardList[];
  onAddToList: (listId: string, wordId: string) => void;
  onCreateListAndAdd: (name: string, wordId: string) => void;
  onAddLevel: (listId: string, level: number) => void;
  onCreateListAndAddLevel: (name: string, level: number) => void;
  isFavorite: (wordId: string) => boolean;
  onToggleFavorite: (wordId: string) => void;
  visibility: VisibilityState;
  onToggleVisibility: (field: keyof VisibilityState) => void;
  viewMode: 'list' | 'grid';
  onToggleViewMode: () => void;
}) {
  const [addLevelMenu, setAddLevelMenu] = useState(false);
  const [addLevelCreate, setAddLevelCreate] = useState(false);
  const [addLevelNewName, setAddLevelNewName] = useState('');
  const addLevelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addLevelMenu) return;
    const handler = (e: MouseEvent) => {
      if (addLevelRef.current && !addLevelRef.current.contains(e.target as Node)) {
        setAddLevelMenu(false);
        setAddLevelCreate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [addLevelMenu]);

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cn-muted/50 dark:text-cn-muted-dark/50">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search hanzi, pinyin, or english..."
          className="w-full rounded-xl border border-cn-border bg-cn-surface py-3 pl-12 pr-4 text-lg text-cn-ink outline-none transition-colors placeholder:text-cn-muted/40 focus:border-cn-red dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream dark:placeholder:text-cn-muted-dark/40 dark:focus:border-cn-red-light"
        />
      </div>

      {/* HSK Level Tabs */}
      {!isSearching && (
        <div className="flex flex-wrap items-center gap-2">
          {HSK_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => onSelectLevel(level)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                selectedLevel === level
                  ? 'bg-cn-red text-white shadow-md shadow-cn-red/30'
                  : 'bg-cn-surface text-cn-muted hover:bg-cn-red/10 hover:text-cn-red dark:bg-cn-surface-dark dark:text-cn-muted-dark dark:hover:bg-cn-red/10 dark:hover:text-cn-red-light'
              }`}
            >
              HSK {level}
            </button>
          ))}

          {/* Add entire level to a flashcard list */}
          <div ref={addLevelRef} className="relative ml-auto">
            <button
              onClick={() => setAddLevelMenu(!addLevelMenu)}
              className="rounded-xl bg-cn-gold/10 px-4 py-2 text-sm font-bold text-cn-gold-dark transition-colors hover:bg-cn-gold/20 dark:text-cn-gold-light"
            >
              + Add all HSK {selectedLevel}
            </button>
            {addLevelMenu && (
              <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                  Add HSK {selectedLevel} to...
                </p>
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => {
                      onAddLevel(list.id, selectedLevel);
                      setAddLevelMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cn-ink transition-colors hover:bg-cn-gold/10 dark:text-cn-cream dark:hover:bg-cn-gold/10"
                  >
                    {list.id === '__favorites__' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cn-gold">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cn-muted dark:text-cn-muted-dark">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                    )}
                    <span className="truncate">{list.name}</span>
                    <span className="ml-auto text-xs text-cn-muted dark:text-cn-muted-dark">
                      {list.wordIds.length}
                    </span>
                  </button>
                ))}
                <div className="my-1 border-t border-cn-border dark:border-cn-border-dark" />
                {addLevelCreate ? (
                  <div className="flex gap-1 px-2 py-1">
                    <input
                      autoFocus
                      value={addLevelNewName}
                      onChange={(e) => setAddLevelNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && addLevelNewName.trim()) {
                          onCreateListAndAddLevel(addLevelNewName.trim(), selectedLevel);
                          setAddLevelNewName('');
                          setAddLevelCreate(false);
                          setAddLevelMenu(false);
                        }
                        if (e.key === 'Escape') {
                          setAddLevelCreate(false);
                          setAddLevelNewName('');
                        }
                      }}
                      placeholder="List name..."
                      className="flex-1 rounded-lg border border-cn-border bg-transparent px-2 py-1 text-sm text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
                    />
                    <button
                      onClick={() => {
                        if (addLevelNewName.trim()) {
                          onCreateListAndAddLevel(addLevelNewName.trim(), selectedLevel);
                          setAddLevelNewName('');
                          setAddLevelCreate(false);
                          setAddLevelMenu(false);
                        }
                      }}
                      className="rounded-lg bg-cn-red px-2 py-1 text-xs font-medium text-white"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddLevelCreate(true)}
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
        </div>
      )}

      {/* Toolbar: visibility toggles + view mode */}
      <div className="flex items-center justify-between">
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
            onClick={onToggleViewMode}
            className="rounded-lg p-1.5 text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
            title={viewMode === 'list' ? 'Card view' : 'List view'}
          >
            {viewMode === 'list' ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.166a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 4.167a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Words */}
      {viewMode === 'list' ? (
        <div className="flex flex-col gap-2">
          {words.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              isFavorite={isFavorite(word.id)}
              onToggleFavorite={onToggleFavorite}
              lists={lists}
              onAddToList={onAddToList}
              onCreateListAndAdd={onCreateListAndAdd}
              visibility={visibility}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {words.map((word) => (
            <WordCardSquare
              key={word.id}
              word={word}
              isFavorite={isFavorite(word.id)}
              onToggleFavorite={onToggleFavorite}
              visibility={visibility}
            />
          ))}
        </div>
      )}
    </div>
  );
}
