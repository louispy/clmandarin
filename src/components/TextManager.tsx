import { useEffect, useRef, useState } from 'react';
import type { MandarinText } from '../types';
import { TextEditorModal } from './TextEditorModal';
import { ShareLinkModal } from './ShareLinkModal';
import { buildTextShareUrl, createTextShare } from '../utils/text-share';
import { isSharingConfigured } from '../utils/share';

// Selector + create/edit/delete toolbar for reading texts. Mirrors the
// FlashcardManager pattern but is intentionally lighter — no favorites, sharing,
// or import (texts are personal, single-device for now).
export function TextManager({
  texts,
  activeTextId,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  onImportFromCode,
}: {
  texts: MandarinText[];
  activeTextId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (title: string, body: string) => Promise<MandarinText>;
  onUpdate: (id: string, updates: { title?: string; body?: string }) => Promise<void>;
  onDelete: (id: string) => void;
  onImportFromCode?: (code: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<MandarinText | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shareInfo, setShareInfo] = useState<{ url: string; title: string; expiresAt: string } | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const sharingEnabled = isSharingConfigured();

  const activeText = texts.find((t) => t.id === activeTextId) ?? null;

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!importMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
        setLinkInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [importMenuOpen]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const handleShare = async (text: MandarinText) => {
    if (sharingId) return;
    setSharingId(text.id);
    try {
      const { code, expiresAt } = await createTextShare(text);
      setShareInfo({ url: buildTextShareUrl(code), title: text.title, expiresAt });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to create share link.');
    } finally {
      setSharingId(null);
    }
  };

  // Accept a full share URL (?text=CODE) or a bare hex code.
  const parseShareInput = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    let candidate = trimmed;
    try {
      const url = new URL(trimmed);
      const fromQuery = url.searchParams.get('text');
      if (fromQuery) candidate = fromQuery;
    } catch {
      // not a URL — treat as raw code
    }
    return /^[a-f0-9]{8,16}$/i.test(candidate) ? candidate.toLowerCase() : null;
  };

  const handleImportFromLink = () => {
    const code = parseShareInput(linkInput);
    if (!code) {
      setStatus("That doesn't look like a text share link or code.");
      return;
    }
    setImportMenuOpen(false);
    setLinkInput('');
    onImportFromCode?.(code);
  };

  const textIcon = (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cn-gold/15 text-cn-gold-dark dark:bg-cn-gold/20 dark:text-cn-gold-light">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 15.5 2h-11ZM6 6.75A.75.75 0 0 1 6.75 6h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 6.75Zm0 3A.75.75 0 0 1 6.75 9h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 6 9.75Zm0 3a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
      </svg>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div ref={dropdownRef} className="relative min-w-0 flex-1">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          disabled={texts.length === 0}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-cn-border bg-cn-surface px-3 py-2 text-left transition-colors hover:border-cn-red/40 disabled:opacity-60 dark:border-cn-border-dark dark:bg-cn-surface-dark"
        >
          <div className="flex min-w-0 items-center gap-3">
            {activeText ? (
              <>
                {textIcon}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold text-cn-ink dark:text-cn-cream">
                    {activeText.title}
                  </span>
                  <span className="text-xs text-cn-muted dark:text-cn-muted-dark">
                    {activeText.body.length} character{activeText.body.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-sm text-cn-muted dark:text-cn-muted-dark">
                {texts.length === 0 ? 'No texts yet — tap + to add one' : 'Select a text…'}
              </span>
            )}
          </div>
          {texts.length > 0 && (
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
          )}
        </button>

        {dropdownOpen && texts.length > 0 && (
          <div className="absolute left-0 top-full z-40 mt-1 max-h-96 w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark sm:right-0 sm:w-auto sm:min-w-[20rem]">
            {texts.map((text) => {
              const isActive = activeTextId === text.id;
              return (
                <div
                  key={text.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                    isActive ? 'bg-cn-red/10 dark:bg-cn-red/15' : 'hover:bg-cn-gold/10'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelect(text.id);
                      setDropdownOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {textIcon}
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-cn-ink dark:text-cn-cream">
                        {text.title}
                      </span>
                      <span className="text-xs text-cn-muted dark:text-cn-muted-dark">
                        {text.body.length} char{text.body.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => {
                        setEditing(text);
                        setDropdownOpen(false);
                      }}
                      className="rounded-md p-1.5 text-cn-muted/60 transition-colors hover:text-cn-ink dark:text-cn-muted-dark/60 dark:hover:text-cn-cream"
                      title="Edit"
                      aria-label="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.22 10.306a1 1 0 0 0-.26.442l-.992 3.473a.375.375 0 0 0 .462.462l3.473-.992a1 1 0 0 0 .442-.26l7.793-7.793a1.75 1.75 0 0 0 0-2.475l-.65-.65Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${text.title}"? This cannot be undone.`)) {
                          onDelete(text.id);
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {sharingEnabled && (
        <button
          onClick={() => activeText && handleShare(activeText)}
          disabled={!activeText || sharingId === activeText?.id}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cn-red/10 text-cn-red transition-colors hover:bg-cn-red/20 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-cn-red/20 dark:text-cn-red-light sm:h-10 sm:w-10"
          title={activeText ? `Share "${activeText.title}"` : 'Pick a text to share'}
          aria-label="Share text link"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" />
          </svg>
        </button>
      )}

      <button
        onClick={() => setCreateOpen(true)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cn-red/10 text-cn-red transition-colors hover:bg-cn-red/20 dark:bg-cn-red/20 dark:text-cn-red-light sm:h-10 sm:w-10"
        title="New text"
        aria-label="New text"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
      </button>

      {onImportFromCode && (
        <div ref={importMenuRef} className="relative">
          <button
            onClick={() => setImportMenuOpen((o) => !o)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cn-gold/10 text-cn-gold-dark transition-colors hover:bg-cn-gold/20 dark:bg-cn-gold/20 dark:text-cn-gold-light sm:h-10 sm:w-10"
            title="Import a shared text"
            aria-label="Import a shared text"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
          </button>
          {importMenuOpen && (
            <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark">
              <div className="flex flex-col gap-2 p-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                  From share link
                </span>
                <input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleImportFromLink();
                  }}
                  placeholder="Paste link or code…"
                  className="rounded-lg border border-cn-border bg-transparent px-2 py-1.5 text-sm text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
                />
                <button
                  onClick={handleImportFromLink}
                  disabled={!linkInput.trim()}
                  className="rounded-lg bg-cn-red px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-cn-red-dark disabled:opacity-40"
                >
                  Import
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {status && (
        <p className="px-1 text-xs text-cn-gold-dark dark:text-cn-gold-light">{status}</p>
      )}

      {createOpen && (
        <TextEditorModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSave={async (title, body) => {
            const text = await onCreate(title, body);
            onSelect(text.id);
          }}
        />
      )}

      {editing && (
        <TextEditorModal
          mode="edit"
          initialTitle={editing.title}
          initialBody={editing.body}
          onClose={() => setEditing(null)}
          onSave={async (title, body) => {
            await onUpdate(editing.id, { title, body });
          }}
        />
      )}

      {shareInfo && (
        <ShareLinkModal
          url={shareInfo.url}
          listName={shareInfo.title}
          expiresAt={shareInfo.expiresAt}
          noun="text"
          onClose={() => setShareInfo(null)}
        />
      )}
    </div>
  );
}
