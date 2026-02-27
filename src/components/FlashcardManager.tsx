import { useState } from 'react';
import type { FlashcardList } from '../types';

const FAVORITES_ID = '__favorites__';

export function FlashcardManager({
  lists,
  activeListId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onExport,
}: {
  lists: FlashcardList[];
  activeListId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onExport: (list: FlashcardList) => void;
}) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
  };

  const startRename = (list: FlashcardList) => {
    setEditingId(list.id);
    setEditName(list.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const isFavorites = (id: string) => id === FAVORITES_ID;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-cn-ink dark:text-cn-cream">
        My Flashcards
      </h2>

      {/* Create new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New flashcard list..."
          className="flex-1 rounded-xl border border-cn-border bg-cn-surface px-4 py-2.5 text-cn-ink outline-none transition-colors placeholder:text-cn-muted/40 focus:border-cn-red dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim()}
          className="rounded-xl bg-cn-red px-5 py-2.5 font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark hover:shadow-lg disabled:opacity-40 disabled:shadow-none"
        >
          Create
        </button>
      </div>

      {/* List items */}
      <div className="flex flex-col gap-1.5">
        {lists.map((list) => {
          const isActive = activeListId === list.id;
          const isFav = isFavorites(list.id);
          return (
            <div
              key={list.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                isActive
                  ? 'border-2 border-cn-red/40 bg-cn-red/5 dark:border-cn-red/30 dark:bg-cn-red/10'
                  : 'border-2 border-transparent hover:bg-cn-surface dark:hover:bg-cn-surface-dark'
              }`}
            >
              {/* Icon */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isFav
                  ? 'bg-cn-gold/20 text-cn-gold'
                  : 'bg-cn-red/10 text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light'
              }`}>
                {isFav ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v11.75a2.75 2.75 0 0 0 2.75 2.75h.5a.75.75 0 0 0 0-1.5h-.5c-.69 0-1.25-.56-1.25-1.25V4.5a3 3 0 0 0-3-3h-9A3 3 0 0 0 .5 4.5v10A2.5 2.5 0 0 0 3 17h7a.75.75 0 0 0 0-1.5H3a1 1 0 0 1-1-1V3.5Z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Name / Edit */}
              {editingId === list.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={commitRename}
                  className="flex-1 rounded-lg border border-cn-red bg-transparent px-2 py-1 text-cn-ink outline-none dark:text-cn-cream"
                />
              ) : (
                <button
                  onClick={() => onSelect(isActive ? null : list.id)}
                  className="flex flex-1 flex-col text-left"
                >
                  <span className="font-bold text-cn-ink dark:text-cn-cream">
                    {list.name}
                  </span>
                  <span className="text-sm text-cn-muted dark:text-cn-muted-dark">
                    {list.wordIds.length} word{list.wordIds.length !== 1 ? 's' : ''}
                  </span>
                </button>
              )}

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-0.5">
                {!isFav && (
                  <button
                    onClick={() => startRename(list)}
                    className="rounded-lg p-2 text-cn-muted/50 transition-colors hover:text-cn-ink dark:text-cn-muted-dark/50 dark:hover:text-cn-cream"
                    title="Rename"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.22 10.306a1 1 0 0 0-.26.442l-.992 3.473a.375.375 0 0 0 .462.462l3.473-.992a1 1 0 0 0 .442-.26l7.793-7.793a1.75 1.75 0 0 0 0-2.475l-.65-.65Z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onExport(list)}
                  className="rounded-lg p-2 text-cn-muted/50 transition-colors hover:text-cn-ink dark:text-cn-muted-dark/50 dark:hover:text-cn-cream"
                  title="Export"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                    <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                  </svg>
                </button>
                {!isFav && (
                  <button
                    onClick={() => onDelete(list.id)}
                    className="rounded-lg p-2 text-cn-muted/50 transition-colors hover:text-cn-red dark:text-cn-muted-dark/50 dark:hover:text-cn-red-light"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
