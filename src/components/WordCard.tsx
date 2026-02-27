import { useState, useRef, useEffect } from 'react';
import type { VocabWord, FlashcardList } from '../types';
import type { VisibilityState } from '../hooks/useVisibility';

export function WordCard({
  word,
  isFavorite,
  onToggleFavorite,
  lists,
  onAddToList,
  onCreateListAndAdd,
  visibility,
  compact,
  onClick,
}: {
  word: VocabWord;
  isFavorite: boolean;
  onToggleFavorite: (wordId: string) => void;
  lists: FlashcardList[];
  onAddToList: (listId: string, wordId: string) => void;
  onCreateListAndAdd: (name: string, wordId: string) => void;
  visibility: VisibilityState;
  compact?: boolean;
  onClick?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleCreate = () => {
    const name = newListName.trim();
    if (!name) return;
    onCreateListAndAdd(name, word.id);
    setNewListName('');
    setShowCreate(false);
    setMenuOpen(false);
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all
        border-cn-border bg-cn-surface hover:border-cn-gold/50 hover:shadow-md hover:shadow-cn-gold/5
        dark:border-cn-border-dark dark:bg-cn-surface-dark dark:hover:border-cn-gold-dark/50
        ${compact ? 'px-4 py-3' : 'px-5 py-4'}`}
    >
      <div className="flex items-start gap-4">
        {/* Main content */}
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onClick}>
          {/* Hanzi */}
          {visibility.hanzi ? (
            <p className={`font-bold text-cn-ink dark:text-cn-cream ${compact ? 'text-2xl' : 'text-4xl'}`}>
              {word.hanzi}
            </p>
          ) : (
            <p className={`font-bold text-cn-muted/30 dark:text-cn-muted-dark/30 ${compact ? 'text-2xl' : 'text-4xl'}`}>
              · · ·
            </p>
          )}

          {/* Pinyin */}
          {visibility.pinyin ? (
            <p className={`mt-1 font-medium text-cn-red dark:text-cn-red-light ${compact ? 'text-base' : 'text-xl'}`}>
              {word.pinyin}
            </p>
          ) : (
            <p className={`mt-1 text-cn-muted/30 dark:text-cn-muted-dark/30 ${compact ? 'text-base' : 'text-xl'}`}>
              · · ·
            </p>
          )}

          {/* English */}
          {visibility.english ? (
            <p className={`mt-0.5 text-cn-muted dark:text-cn-muted-dark ${compact ? 'text-sm' : 'text-base'}`}>
              {word.english || '—'}
            </p>
          ) : (
            <p className={`mt-0.5 text-cn-muted/30 dark:text-cn-muted-dark/30 ${compact ? 'text-sm' : 'text-base'}`}>
              · · ·
            </p>
          )}
        </div>

        {/* HSK badge + actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rounded-full bg-cn-red/10 px-2 py-0.5 text-xs font-semibold text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light">
            HSK {word.hskLevel}
          </span>

          <div className="flex items-center gap-1">
            {/* Star / Favorite */}
            <button
              onClick={() => onToggleFavorite(word.id)}
              className={`rounded-lg p-1.5 transition-colors ${
                isFavorite
                  ? 'text-cn-gold hover:text-cn-gold-dark'
                  : 'text-cn-muted/40 hover:text-cn-gold dark:text-cn-muted-dark/40 dark:hover:text-cn-gold-light'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              {isFavorite ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              )}
            </button>

            {/* Triple-dot menu */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-lg p-1.5 text-cn-muted/40 transition-colors hover:text-cn-ink dark:text-cn-muted-dark/40 dark:hover:text-cn-cream"
                title="Add to flashcard list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M10.5 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm0 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" clipRule="evenodd" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark sm:max-w-none">
                  <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                    Add to flashcard
                  </p>
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => {
                        onAddToList(list.id, word.id);
                        setMenuOpen(false);
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

                  {showCreate ? (
                    <div className="flex gap-1 px-2 py-1">
                      <input
                        autoFocus
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreate();
                          if (e.key === 'Escape') {
                            setShowCreate(false);
                            setNewListName('');
                          }
                        }}
                        placeholder="List name..."
                        className="min-w-0 flex-1 rounded-lg border border-cn-border bg-transparent px-2 py-1 text-sm text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
                      />
                      <button
                        onClick={handleCreate}
                        className="rounded-lg bg-cn-red px-2 py-1 text-xs font-medium text-white"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCreate(true)}
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
        </div>
      </div>
    </div>
  );
}

/* Large squared card for grid view */
export function WordCardSquare({
  word,
  isFavorite,
  onToggleFavorite,
  visibility,
  onClick,
}: {
  word: VocabWord;
  isFavorite: boolean;
  onToggleFavorite: (wordId: string) => void;
  visibility: VisibilityState;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-cn-border bg-cn-surface p-4 transition-all hover:border-cn-gold/50 hover:shadow-lg hover:shadow-cn-gold/10 dark:border-cn-border-dark dark:bg-cn-surface-dark dark:hover:border-cn-gold-dark/50"
    >
      {/* Favorite star */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(word.id);
        }}
        className={`absolute right-2 top-2 rounded-lg p-1 transition-colors ${
          isFavorite
            ? 'text-cn-gold'
            : 'text-cn-muted/20 hover:text-cn-gold dark:text-cn-muted-dark/20'
        }`}
      >
        {isFavorite ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
        )}
      </button>

      {/* HSK badge */}
      <span className="absolute left-2 top-2 rounded-full bg-cn-red/10 px-1.5 py-0.5 text-[10px] font-bold text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light">
        {word.hskLevel}
      </span>

      {/* Content */}
      {visibility.hanzi ? (
        <p className="text-5xl font-black text-cn-ink dark:text-cn-cream">{word.hanzi}</p>
      ) : (
        <p className="text-5xl font-black text-cn-muted/20 dark:text-cn-muted-dark/20">?</p>
      )}

      {visibility.pinyin ? (
        <p className="mt-2 text-base font-medium text-cn-red dark:text-cn-red-light">{word.pinyin}</p>
      ) : (
        <p className="mt-2 text-base text-cn-muted/20 dark:text-cn-muted-dark/20">· · ·</p>
      )}

      {visibility.english ? (
        <p className="mt-1 text-center text-xs text-cn-muted dark:text-cn-muted-dark">
          {word.english || '—'}
        </p>
      ) : (
        <p className="mt-1 text-xs text-cn-muted/20 dark:text-cn-muted-dark/20">· · ·</p>
      )}
    </div>
  );
}
