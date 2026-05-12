import { useState, useRef, useEffect } from 'react';
import type { VocabWord, FlashcardList } from '../types';
import type { VisibilityState } from '../hooks/useVisibility';
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
  onUpdateWord: (id: string, updates: WordUpdates) => Promise<void>;
  visibility: VisibilityState;
  compact?: boolean;
  onClick?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showNoAudio, setShowNoAudio] = useState(false);
  const [editMode, setEditMode] = useState<'translation' | 'note' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await speak(word.hanzi);
    if (!ok) setShowNoAudio(true);
  };

  const selectableLists = lists.filter((l) => l.id !== '__favorites__');

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
        ${compact ? 'px-4 py-2' : 'px-5 py-2.5'}`}
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
            <p className={`mt-0.5 flex items-center gap-1.5 text-cn-muted dark:text-cn-muted-dark ${compact ? 'text-sm' : 'text-base'}`}>
              <span>{word.english || '—'}</span>
              {word.userNote && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditMode('note');
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

          <div className="flex items-center gap-1">
            {/* Speaker / Audio */}
            <button
              onClick={handleSpeak}
              className="rounded-lg p-1.5 text-cn-muted/40 transition-colors hover:text-cn-red dark:text-cn-muted-dark/40 dark:hover:text-cn-red-light"
              title="Play pronunciation"
              aria-label="Play pronunciation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 1 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
                <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 1 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
              </svg>
            </button>

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
                  {selectableLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => {
                        onAddToList(list.id, word.id);
                        setMenuOpen(false);
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

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setEditMode('translation');
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
                      setMenuOpen(false);
                      setEditMode('note');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cn-ink transition-colors hover:bg-cn-gold/10 dark:text-cn-cream dark:hover:bg-cn-gold/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cn-muted dark:text-cn-muted-dark">
                      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25Zm4 5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Zm-2 4.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Zm.75 2.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5H7Z" clipRule="evenodd" />
                    </svg>
                    {word.userNote ? 'Edit note' : 'Add note'}
                  </button>

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

      {showNoAudio && <NoAudioModal onClose={() => setShowNoAudio(false)} />}
      {editMode && (
        <EditWordModal
          word={word}
          mode={editMode}
          onClose={() => setEditMode(null)}
          onSave={(updates) => onUpdateWord(word.id, updates)}
        />
      )}
    </div>
  );
}

/* Large squared card for grid view */
export function WordCardSquare({
  word,
  isFavorite,
  onToggleFavorite,
  onUpdateWord,
  visibility,
  onClick,
}: {
  word: VocabWord;
  isFavorite: boolean;
  onToggleFavorite: (wordId: string) => void;
  onUpdateWord: (id: string, updates: WordUpdates) => Promise<void>;
  visibility: VisibilityState;
  onClick?: () => void;
}) {
  const [showNoAudio, setShowNoAudio] = useState(false);
  const [editMode, setEditMode] = useState<'translation' | 'note' | null>(null);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await speak(word.hanzi);
    if (!ok) setShowNoAudio(true);
  };

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
      {word.source === 'custom' ? (
        <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-cn-gold/10 px-1.5 py-0.5 text-[10px] font-bold text-cn-gold-dark dark:bg-cn-gold/20 dark:text-cn-gold-light">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5">
            <path d="M2.695 14.762l-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
          </svg>
          {word.hskLevel > 0 ? word.hskLevel : 'C'}
        </span>
      ) : (
        <span className="absolute left-2 top-2 rounded-full bg-cn-red/10 px-1.5 py-0.5 text-[10px] font-bold text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light">
          {word.hskLevel}
        </span>
      )}

      {/* Note indicator */}
      {word.userNote && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditMode('note');
          }}
          className="absolute bottom-2 left-2 rounded-lg p-1 text-cn-gold-dark transition-colors hover:bg-cn-gold/10 dark:text-cn-gold-light"
          title="View note"
          aria-label="View note"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25Zm4 5a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5h-3.5Zm-2 4.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Zm.75 2.75a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5H7Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {/* Speaker */}
      <button
        onClick={handleSpeak}
        className="absolute bottom-2 right-2 rounded-lg p-1 text-cn-muted/40 transition-colors hover:text-cn-red dark:text-cn-muted-dark/40 dark:hover:text-cn-red-light"
        title="Play pronunciation"
        aria-label="Play pronunciation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 1 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
          <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 1 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
        </svg>
      </button>

      {/* Content */}
      {visibility.hanzi ? (
        <p
          className={`px-2 text-center font-black text-cn-ink dark:text-cn-cream ${
            Array.from(word.hanzi).length <= 2
              ? 'text-5xl'
              : Array.from(word.hanzi).length <= 4
                ? 'text-3xl'
                : 'text-xl'
          }`}
        >
          {word.hanzi}
        </p>
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

      {showNoAudio && <NoAudioModal onClose={() => setShowNoAudio(false)} />}
      {editMode && (
        <EditWordModal
          word={word}
          mode={editMode}
          onClose={() => setEditMode(null)}
          onSave={(updates) => onUpdateWord(word.id, updates)}
        />
      )}
    </div>
  );
}
