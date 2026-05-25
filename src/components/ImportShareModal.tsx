import { useEffect, useState } from 'react';
import type { FlashcardList, FlashcardListFile } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { fetchShare } from '../utils/share';
import {
  findListBySourceId,
  getAvailableListName,
  importSharedBundle,
} from '../utils/import-export';

type State =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      bundle: FlashcardListFile;
      existing: FlashcardList | null;
      availableName: string; // disambiguated against existing names
    }
  | { kind: 'error'; message: string }
  | { kind: 'imported'; listName: string; mode: 'new' | 'replace' | 'copy' };

export function ImportShareModal({
  code,
  onClose,
  onImported,
}: {
  code: string;
  onClose: () => void;
  onImported: () => void;
}) {
  useBodyScrollLock();
  useBackButton(onClose);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [working, setWorking] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bundle = await fetchShare(code);
        const existing = await findListBySourceId(bundle.list.id);
        // If we'd be replacing the same-source list, that name slot is "ours"
        // already — skip it when looking for a free name so we don't suggest
        // an unnecessary "(copy)" in the new-copy / new-import flow.
        const availableName = await getAvailableListName(bundle.list.name);
        if (!cancelled) setState({ kind: 'ready', bundle, existing, availableName });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Failed to load shared list.',
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleImport = async (mode: 'new' | 'replace' | 'copy') => {
    if (state.kind !== 'ready' || working) return;
    setWorking(true);
    try {
      // Typed name always wins across all paths. Empty input falls back to:
      //   - Replace → existing local name (preserve the user's rename, if any)
      //   - Copy / new → auto-disambiguated name shown as the placeholder
      const typed = nameInput.trim();
      const fallback =
        mode === 'replace'
          ? state.existing?.name ?? state.availableName
          : state.availableName;
      const chosenName = typed || fallback;
      const { list } = await importSharedBundle(state.bundle, {
        replaceLocalId: mode === 'replace' ? state.existing?.id : undefined,
        nameOverride: chosenName,
      });
      onImported();
      setState({ kind: 'imported', listName: list.name, mode });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to import shared list.',
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-4 py-8 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-cn-border bg-cn-surface p-6 shadow-2xl dark:border-cn-border-dark dark:bg-cn-surface-dark"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">
            {state.kind === 'imported' ? 'Imported' : 'Shared flashcard list'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="mt-4">
          {state.kind === 'loading' && (
            <p className="text-sm text-cn-muted dark:text-cn-muted-dark">Loading shared list…</p>
          )}

          {state.kind === 'error' && (
            <p className="text-sm text-cn-red dark:text-cn-red-light">{state.message}</p>
          )}

          {state.kind === 'ready' && (
            <>
              <div className="rounded-xl border border-cn-border bg-cn-paper px-4 py-3 dark:border-cn-border-dark dark:bg-cn-paper-dark">
                <p className="font-bold text-cn-ink dark:text-cn-cream">
                  {state.bundle.list.name}
                </p>
                <p className="mt-1 text-xs text-cn-muted dark:text-cn-muted-dark">
                  {state.bundle.list.wordIds.length} word
                  {state.bundle.list.wordIds.length === 1 ? '' : 's'}
                  {state.bundle.list.description ? ` · ${state.bundle.list.description}` : ''}
                </p>
              </div>

              {state.existing ? (
                <p className="mt-3 text-xs text-cn-muted dark:text-cn-muted-dark sm:text-sm">
                  You already have an imported copy of this list (&ldquo;
                  <span className="font-medium text-cn-ink dark:text-cn-cream">{state.existing.name}</span>
                  &rdquo;). Replace it with the latest version, or add it as a separate copy below.
                </p>
              ) : state.availableName !== state.bundle.list.name ? (
                <p className="mt-3 text-xs text-cn-muted dark:text-cn-muted-dark sm:text-sm">
                  You already have a different list named &ldquo;
                  <span className="font-medium text-cn-ink dark:text-cn-cream">{state.bundle.list.name}</span>
                  &rdquo;. Pick a name for the imported copy below.
                </p>
              ) : (
                <p className="mt-3 text-xs text-cn-muted dark:text-cn-muted-dark sm:text-sm">
                  Add this list to your flashcards?
                </p>
              )}

              {(state.existing || state.availableName !== state.bundle.list.name) && (
                <label className="mt-3 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                    Save as
                  </span>
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={state.availableName}
                    className="rounded-xl border border-cn-border bg-transparent px-3 py-2 text-base text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
                  />
                </label>
              )}
            </>
          )}

          {state.kind === 'imported' && (
            <p className="text-sm text-cn-muted dark:text-cn-muted-dark">
              {state.mode === 'replace' ? (
                <>
                  Replaced your existing copy with the latest version of &ldquo;
                  <span className="font-bold text-cn-ink dark:text-cn-cream">{state.listName}</span>
                  &rdquo;.
                </>
              ) : (
                <>
                  Added &ldquo;
                  <span className="font-bold text-cn-ink dark:text-cn-cream">{state.listName}</span>
                  &rdquo; to your flashcards.
                </>
              )}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream sm:px-4"
          >
            {state.kind === 'imported' ? 'Close' : 'Cancel'}
          </button>
          {state.kind === 'ready' && state.existing && (
            <>
              <button
                onClick={() => handleImport('copy')}
                disabled={working}
                className="whitespace-nowrap rounded-xl bg-cn-gold/20 px-3 py-2.5 text-sm font-bold text-cn-gold-dark transition-colors hover:bg-cn-gold/30 disabled:opacity-40 dark:text-cn-gold-light sm:px-4"
              >
                Add as copy
              </button>
              <button
                onClick={() => handleImport('replace')}
                disabled={working}
                className="whitespace-nowrap rounded-xl bg-cn-red px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark disabled:opacity-40 sm:px-4"
              >
                Replace
              </button>
            </>
          )}
          {state.kind === 'ready' && !state.existing && (
            <button
              onClick={() => handleImport('new')}
              disabled={working}
              className="whitespace-nowrap rounded-xl bg-cn-red px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark disabled:opacity-40 sm:px-4"
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
