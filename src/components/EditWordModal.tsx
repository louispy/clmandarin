import { useEffect, useRef, useState } from 'react';
import type { VocabWord } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useBackButton } from '../hooks/useBackButton';

export function EditWordModal({
  word,
  mode,
  onClose,
  onSave,
}: {
  word: VocabWord;
  mode: 'translation' | 'note';
  onClose: () => void;
  onSave: (updates: { english?: string; userNote?: string; englishOriginal?: string }) => Promise<void>;
}) {
  useBodyScrollLock();
  useBackButton(onClose);
  const keyboardInset = useKeyboardInset();
  const [english, setEnglish] = useState(word.english);
  const [userNote, setUserNote] = useState(word.userNote ?? '');
  const [saving, setSaving] = useState(false);
  const englishRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === 'translation') {
      const el = englishRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      el.setSelectionRange(end, end);
    } else {
      noteRef.current?.focus();
    }
  }, [mode]);

  const englishChanged = english.trim() !== word.english;
  const noteChanged = userNote.trim() !== (word.userNote ?? '');
  const canSave = mode === 'translation' ? englishChanged : noteChanged;

  const title =
    mode === 'translation'
      ? 'Edit translation'
      : word.userNote
        ? 'Edit note'
        : 'Add note';

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const updates: { english?: string; userNote?: string } = {};
      if (mode === 'translation' && englishChanged) updates.english = english.trim();
      if (mode === 'note' && noteChanged) updates.userNote = userNote.trim();
      await onSave(updates);
      onClose();
    } catch (err) {
      console.error('Failed to save word:', err);
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!word.englishOriginal || saving) return;
    setSaving(true);
    try {
      await onSave({ english: word.englishOriginal, englishOriginal: undefined });
      onClose();
    } catch (err) {
      console.error('Failed to reset word:', err);
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ paddingBottom: keyboardInset }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 px-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-cn-border bg-cn-surface p-6 shadow-2xl dark:border-cn-border-dark dark:bg-cn-surface-dark"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">
              {title} · <span className="text-cn-red dark:text-cn-red-light">{word.hanzi}</span>
            </h2>
            <p className="font-pinyin text-sm text-cn-muted dark:text-cn-muted-dark">{word.pinyin}</p>
          </div>
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

        <div className="mt-4 flex flex-col gap-3">
          {mode === 'translation' ? (
            <label className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                  English
                </span>
                {word.englishOriginal && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="text-[10px] uppercase tracking-wider text-cn-muted underline hover:text-cn-red disabled:opacity-40 dark:text-cn-muted-dark dark:hover:text-cn-red-light"
                    title={`Original: ${word.englishOriginal}`}
                  >
                    Reset to original
                  </button>
                )}
              </div>
              <input
                ref={englishRef}
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                className="rounded-xl border border-cn-border bg-transparent px-3 py-2 text-base text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
              />
              {word.englishOriginal && (
                <span className="text-[11px] text-cn-muted dark:text-cn-muted-dark">
                  Original: <span className="italic">{word.englishOriginal}</span>
                </span>
              )}
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                Note
              </span>
              <textarea
                ref={noteRef}
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Disambiguation, example sentences, mnemonics…"
                rows={6}
                className="resize-none rounded-xl border border-cn-border bg-transparent px-3 py-2 text-sm text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="rounded-xl bg-cn-red px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
