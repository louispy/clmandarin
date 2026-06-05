import { useEffect, useState } from 'react';
import type { MandarinText, MandarinTextFile } from '../types';
import { useBackButton } from '../hooks/useBackButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { fetchTextShare } from '../utils/text-share';
import { findTextBySourceId } from '../hooks/useTexts';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; bundle: MandarinTextFile; existing: MandarinText | null }
  | { kind: 'error'; message: string };

export function ImportTextShareModal({
  code,
  onImport,
  onImported,
  onClose,
}: {
  code: string;
  onImport: (
    file: MandarinTextFile,
    opts: { replaceLocalId?: string; titleOverride?: string }
  ) => Promise<MandarinText>;
  onImported: (textId: string) => void;
  onClose: () => void;
}) {
  useBodyScrollLock();
  useBackButton(onClose);
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const bundle = await fetchTextShare(code);
        const existing = await findTextBySourceId(bundle.text.id);
        if (!cancelled) setState({ kind: 'ready', bundle, existing });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Failed to load shared text.',
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
      const text = await onImport(state.bundle, {
        replaceLocalId: mode === 'replace' ? state.existing?.id : undefined,
      });
      onImported(text.id);
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed to import shared text.',
      });
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
          <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">Shared text</h2>
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
            <p className="text-sm text-cn-muted dark:text-cn-muted-dark">Loading shared text…</p>
          )}

          {state.kind === 'error' && (
            <p className="text-sm text-cn-red dark:text-cn-red-light">{state.message}</p>
          )}

          {state.kind === 'ready' && (
            <>
              <div className="rounded-xl border border-cn-border bg-cn-paper px-4 py-3 dark:border-cn-border-dark dark:bg-cn-paper-dark">
                <p className="font-bold text-cn-ink dark:text-cn-cream">{state.bundle.text.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-cn-muted dark:text-cn-muted-dark">
                  {state.bundle.text.body.slice(0, 80)}
                  {state.bundle.text.body.length > 80 ? '…' : ''}
                </p>
              </div>

              {state.existing ? (
                <p className="mt-3 text-xs text-cn-muted dark:text-cn-muted-dark sm:text-sm">
                  You already imported this text (&ldquo;
                  <span className="font-medium text-cn-ink dark:text-cn-cream">{state.existing.title}</span>
                  &rdquo;). Replace it with the latest version, or add it as a separate copy.
                </p>
              ) : (
                <p className="mt-3 text-xs text-cn-muted dark:text-cn-muted-dark sm:text-sm">
                  Add this text to your Texts?
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream sm:px-4"
          >
            Cancel
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
