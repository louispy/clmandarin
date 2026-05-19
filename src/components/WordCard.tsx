import { useState, useRef, useEffect } from 'react';
import type { VocabWord, FlashcardList } from '../types';
import type { VisibilityState } from '../hooks/useVisibility';
import { displayHanzi, type Script } from '../hooks/useScript';
import { speak } from '../utils/speech';
import { NoAudioModal } from './NoAudioModal';
import { EditWordModal } from './EditWordModal';

type WordUpdates = { english?: string; userNote?: string; englishOriginal?: string };

export function WordCard({
  word,
  isFavorite,
  onToggleFavorite,
  lists,
  onAddToList,
  onCreateListAndAdd,
  onUpdateWord,
  script = 'cn',
  visibility,
  compact,
  onClick,
  editMode,
  dragHandleProps,
  onRemove,
}: {
  word: VocabWord;
  isFavorite: boolean;
  onToggleFavorite: (wordId: string) => void;
  lists: FlashcardList[];
  onAddToList: (listId: string, wordId: string) => void;
  onCreateListAndAdd: (name: string, wordId: string) => void;
  onUpdateWord: (id: string, updates: WordUpdates) => Promise<void>;
  script?: Script;
  visibility: VisibilityState;
  compact?: boolean;
  onClick?: () => void;
  editMode?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onRemove?: (wordId: string) => void;
}) {
  const [openMenu, setOpenMenu] = useState<'add' | 'edit' | null>(null);
  const [openUp, setOpenUp] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showNoAudio, setShowNoAudio] = useState(false);
  const [editTarget, setEditTarget] = useState<'translation' | 'note' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);

  // Flip the dropdown above the button when there isn't room below — without
  // this the absolutely-positioned panel extends the page height past the
  // viewport when the card is near the bottom.
  const toggleMenu = (which: 'add' | 'edit') => {
    if (openMenu === which) {
      setOpenMenu(null);
      return;
    }
    const btn = which === 'add' ? addBtnRef.current : editBtnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const estHeight = which === 'add' ? 320 : 120;
      setOpenUp(window.innerHeight - rect.bottom < estHeight);
    }
    setOpenMenu(which);
  };

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await speak(word.hanzi);
    if (!ok) setShowNoAudio(true);
  };

  const selectableLists = lists.filter((l) => l.id !== '__favorites__');

  // Close menu on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setShowCreate(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  const handleCreate = () => {
    const name = newListName.trim();
    if (!name) return;
    onCreateListAndAdd(name, word.id);
    setNewListName('');
    setShowCreate(false);
    setOpenMenu(null);
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all
        border-cn-border bg-cn-surface hover:border-cn-gold/50 hover:shadow-md hover:shadow-cn-gold/5
        dark:border-cn-border-dark dark:bg-cn-surface-dark dark:hover:border-cn-gold-dark/50
        ${compact ? 'px-3 py-2' : 'px-3 py-2.5'}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle (only in edit mode) */}
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-1 cursor-grab touch-none text-cn-muted/50 hover:text-cn-muted dark:text-cn-muted-dark/50 dark:hover:text-cn-muted-dark"
            aria-label="Drag to reorder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Main content */}
        <div className={`min-w-0 flex-1 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          {/* Hanzi — scaled by length */}
          {(() => {
            const hanziText = displayHanzi(word, script);
            const len = Array.from(hanziText).length;
            const hanziClass = compact
              ? len <= 4 ? 'text-2xl' : len <= 8 ? 'text-xl' : 'text-lg'
              : len <= 4 ? 'text-4xl' : len <= 8 ? 'text-3xl' : 'text-2xl';
            return visibility.hanzi ? (
              <p className={`font-bold text-cn-ink dark:text-cn-cream ${hanziClass}`}>{hanziText}</p>
            ) : (
              <p className={`font-bold text-cn-muted/30 dark:text-cn-muted-dark/30 ${hanziClass}`}>· · ·</p>
            );
          })()}

          {/* Pinyin */}
          {visibility.pinyin ? (
            <p className={`mt-1 font-pinyin font-medium text-cn-red dark:text-cn-red-light ${compact ? 'text-base' : 'text-xl'}`}>
              {word.pinyin}
            </p>
          ) : (
            <p className={`mt-1 text-cn-muted/30 dark:text-cn-muted-dark/30 ${compact ? 'text-base' : 'text-xl'}`}>
              · · ·
            </p>
          )}

          {/* English */}
          {visibility.english ? (
            <p className={`mt-0.5 flex items-center gap-1.5 text-cn-muted dark:text-cn-muted-dark ${compact ? 'text-sm' : 'text-base'}`}>
              <span>{word.english || '—'}</span>
              {word.userNote && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTarget('note');
                  }}
                  className="rounded-full p-0.5 text-cn-gold-dark hover:bg-cn-gold/10 dark:text-cn-gold-light"
                  title="View note"
                  aria-label="View note"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25Zm4 5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Zm-2 4.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Zm.75 2.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5H7Z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </p>
          ) : (
            <p className={`mt-0.5 text-cn-muted/30 dark:text-cn-muted-dark/30 ${compact ? 'text-sm' : 'text-base'}`}>
              · · ·
            </p>
          )}
        </div>

        {/* HSK badge + actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {word.source === 'custom' ? (
            <span className="flex items-center gap-1 rounded-full bg-cn-gold/10 px-2 py-0.5 text-xs font-semibold text-cn-gold-dark dark:bg-cn-gold/20 dark:text-cn-gold-light">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                <path d="M2.695 14.762l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
              </svg>
              {word.hskLevel > 0 ? `HSK ${word.hskLevel}` : 'Custom'}
            </span>
          ) : (
            <span className="rounded-full bg-cn-red/10 px-2 py-0.5 text-xs font-semibold text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light">
              HSK {word.hskLevel}
            </span>
          )}

          {editMode && onRemove && (
            <button
              onClick={() => onRemove(word.id)}
              className="rounded-lg p-1.5 text-cn-muted/60 transition-colors hover:bg-cn-red/10 hover:text-cn-red dark:text-cn-muted-dark/60 dark:hover:text-cn-red-light"
              title="Remove from list"
              aria-label="Remove from list"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          {!editMode && (
          <div ref={menuRef} className="flex items-center gap-0 rounded-lg border border-cn-border/60 bg-cn-paper/40 p-0.5 dark:border-cn-border-dark/60 dark:bg-cn-paper-dark/40">
            {/* Speaker / Audio */}
            <button
              onClick={handleSpeak}
              className="rounded p-1 text-cn-muted/40 transition-colors hover:text-cn-red dark:text-cn-muted-dark/40 dark:hover:text-cn-red-light"
              title="Play pronunciation"
              aria-label="Play pronunciation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 1 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
                <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 1 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
              </svg>
            </button>

            {/* Star / Favorite */}
            <button
              onClick={() => onToggleFavorite(word.id)}
              className={`rounded p-1 transition-colors ${
                isFavorite
                  ? 'text-cn-gold hover:text-cn-gold-dark'
                  : 'text-cn-muted/40 hover:text-cn-gold dark:text-cn-muted-dark/40 dark:hover:text-cn-gold-light'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              {isFavorite ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              )}
            </button>

            {/* Add to list */}
            <div className="relative">
              <button
                ref={addBtnRef}
                onClick={() => toggleMenu('add')}
                className="rounded p-1 text-cn-muted/40 transition-colors hover:text-cn-gold-dark dark:text-cn-muted-dark/40 dark:hover:text-cn-gold-light"
                title="Add to flashcard list"
                aria-label="Add to flashcard list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
              </button>
                {openMenu === 'add' && (
                  <div className={`absolute right-0 z-30 max-h-[60vh] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark sm:max-w-none ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                    <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                      Add to flashcard
                    </p>
                    {selectableLists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => {
                          onAddToList(list.id, word.id);
                          setOpenMenu(null);
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
                    {selectableLists.length > 0 && (
                      <div className="my-1 border-t border-cn-border dark:border-cn-border-dark" />
                    )}
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

            {/* Edit */}
            <div className="relative">
              <button
                ref={editBtnRef}
                onClick={() => toggleMenu('edit')}
                className="rounded p-1 text-cn-muted/40 transition-colors hover:text-cn-ink dark:text-cn-muted-dark/40 dark:hover:text-cn-cream"
                title="Edit word"
                aria-label="Edit word"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M2.695 14.762l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                </svg>
              </button>
              {openMenu === 'edit' && (
                <div className={`absolute right-0 z-30 w-48 max-w-[calc(100vw-2rem)] rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      setEditTarget('translation');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cn-ink transition-colors hover:bg-cn-gold/10 dark:text-cn-cream dark:hover:bg-cn-gold/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cn-muted dark:text-cn-muted-dark">
                      <path d="M2.695 14.762l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                    </svg>
                    Edit translation
                  </button>
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      setEditTarget('note');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cn-ink transition-colors hover:bg-cn-gold/10 dark:text-cn-cream dark:hover:bg-cn-gold/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cn-muted dark:text-cn-muted-dark">
                      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25Zm4 5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Zm-2 4.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Zm.75 2.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5H7Z" clipRule="evenodd" />
                    </svg>
                    {word.userNote ? 'Edit note' : 'Add note'}
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>


      {showNoAudio && <NoAudioModal onClose={() => setShowNoAudio(false)} />}
      {editTarget && (
        <EditWordModal
          word={word}
          mode={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updates) => onUpdateWord(word.id, updates)}
        />
      )}
    </div>
  );
}
