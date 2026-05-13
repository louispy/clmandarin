import { useEffect, useRef, useState } from 'react';
import type { FlashcardList } from '../types';
import { CreateListModal } from './CreateListModal';
import { importMultipleFiles } from '../utils/import-export';

const FAVORITES_ID = '__favorites__';

export function FlashcardManager({
  lists,
  activeListId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onExport,
  onClear,
  onImportDone,
}: {
  lists: FlashcardList[];
  activeListId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => Promise<FlashcardList>;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onExport: (list: FlashcardList) => void;
  onClear: (id: string) => void;
  onImportDone: () => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeList = lists.find((l) => l.id === activeListId) ?? null;
  const isFavorites = (id: string) => id === FAVORITES_ID;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!importStatus) return;
    const t = setTimeout(() => setImportStatus(null), 4000);
    return () => clearTimeout(t);
  }, [importStatus]);

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

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImportStatus('Importing…');
    const result = await importMultipleFiles(files);
    const msgs: string[] = [];
    if (result.imported > 0) msgs.push(`${result.imported} list(s) imported`);
    if (result.errors.length > 0)
      msgs.push(`${result.errors.length} error(s): ${result.errors.join(', ')}`);
    setImportStatus(msgs.join('. ') || 'Done');
    onImportDone();
  };

  const renderListIcon = (list: FlashcardList) => {
    const fav = isFavorites(list.id);
    return (
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          fav
            ? 'bg-cn-gold/20 text-cn-gold'
            : 'bg-cn-red/10 text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light'
        }`}
      >
        {fav ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v11.75a2.75 2.75 0 0 0 2.75 2.75h.5a.75.75 0 0 0 0-1.5h-.5c-.69 0-1.25-.56-1.25-1.25V4.5a3 3 0 0 0-3-3h-9A3 3 0 0 0 .5 4.5v10A2.5 2.5 0 0 0 3 17h7a.75.75 0 0 0 0-1.5H3a1 1 0 0 1-1-1V3.5Z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar: list selector dropdown + action buttons */}
      <div className="flex items-center gap-2">
        <div ref={dropdownRef} className="relative min-w-0 flex-1">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-cn-border bg-cn-surface px-3 py-2 text-left transition-colors hover:border-cn-red/40 dark:border-cn-border-dark dark:bg-cn-surface-dark"
          >
            <div className="flex min-w-0 items-center gap-3">
              {activeList ? (
                <>
                  {renderListIcon(activeList)}
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-bold text-cn-ink dark:text-cn-cream">
                      {activeList.name}
                    </span>
                    <span className="text-xs text-cn-muted dark:text-cn-muted-dark">
                      {activeList.wordIds.length} word{activeList.wordIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-sm text-cn-muted dark:text-cn-muted-dark">
                  Select a flashcard list…
                </span>
              )}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 shrink-0 text-cn-muted transition-transform dark:text-cn-muted-dark ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            >
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-y-auto rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark">
              {lists.map((list) => {
                const isActive = activeListId === list.id;
                const fav = isFavorites(list.id);
                return (
                  <div
                    key={list.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                      isActive ? 'bg-cn-red/10 dark:bg-cn-red/15' : 'hover:bg-cn-gold/10'
                    }`}
                  >
                    {editingId === list.id ? (
                      <>
                        {renderListIcon(list)}
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={commitRename}
                          className="min-w-0 flex-1 rounded-md border border-cn-red bg-transparent px-2 py-1 text-sm text-cn-ink outline-none dark:text-cn-cream"
                        />
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          onSelect(list.id);
                          setDropdownOpen(false);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        {renderListIcon(list)}
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-cn-ink dark:text-cn-cream">
                            {list.name}
                          </span>
                          <span className="text-xs text-cn-muted dark:text-cn-muted-dark">
                            {list.wordIds.length} word{list.wordIds.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    )}

                    {editingId !== list.id && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        {!fav && (
                          <button
                            onClick={() => startRename(list)}
                            className="rounded-md p-1.5 text-cn-muted/60 transition-colors hover:text-cn-ink dark:text-cn-muted-dark/60 dark:hover:text-cn-cream"
                            title="Rename"
                            aria-label="Rename"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                              <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.22 10.306a1 1 0 0 0-.26.442l-.992 3.473a.375.375 0 0 0 .462.462l3.473-.992a1 1 0 0 0 .442-.26l7.793-7.793a1.75 1.75 0 0 0 0-2.475l-.65-.65Z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => onExport(list)}
                          className="rounded-md p-1.5 text-cn-muted/60 transition-colors hover:text-cn-ink dark:text-cn-muted-dark/60 dark:hover:text-cn-cream"
                          title="Export"
                          aria-label="Export"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                            <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                            <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                          </svg>
                        </button>
                        {list.wordIds.length > 0 && (
                          <button
                            onClick={() => {
                              const label = fav ? 'all favorites' : `all words from "${list.name}"`;
                              if (confirm(`Clear ${label}? This cannot be undone.`)) {
                                onClear(list.id);
                              }
                            }}
                            className="rounded-md p-1.5 text-cn-muted/60 transition-colors hover:text-cn-red dark:text-cn-muted-dark/60 dark:hover:text-cn-red-light"
                            title="Empty list"
                            aria-label="Empty list"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                              <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM5.97 5.97a.75.75 0 0 1 1.06 0L8 6.94l.97-.97a.75.75 0 1 1 1.06 1.06L9.06 8l.97.97a.75.75 0 1 1-1.06 1.06L8 9.06l-.97.97a.75.75 0 1 1-1.06-1.06L6.94 8l-.97-.97a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        {!fav && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${list.name}"? This cannot be undone.`)) {
                                onDelete(list.id);
                              }
                            }}
                            className="rounded-md p-1.5 text-cn-muted/60 transition-colors hover:text-cn-red dark:text-cn-muted-dark/60 dark:hover:text-cn-red-light"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                              <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cn-red/10 text-cn-red transition-colors hover:bg-cn-red/20 dark:bg-cn-red/20 dark:text-cn-red-light"
          title="New flashcard list"
          aria-label="New flashcard list"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cn-gold/10 text-cn-gold-dark transition-colors hover:bg-cn-gold/20 dark:bg-cn-gold/20 dark:text-cn-gold-light"
          title="Import flashcard list(s)"
          aria-label="Import flashcard list(s)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".json"
          className="hidden"
          onChange={(e) => {
            handleImportFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {importStatus && (
        <p className="px-1 text-xs text-cn-gold-dark dark:text-cn-gold-light">{importStatus}</p>
      )}

      {createOpen && (
        <CreateListModal
          onClose={() => setCreateOpen(false)}
          onCreate={async (name) => {
            const list = await onCreate(name);
            onSelect(list.id);
          }}
        />
      )}
    </div>
  );
}
