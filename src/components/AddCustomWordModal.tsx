import { useEffect, useRef, useState } from 'react';
import { hanziToPinyin, numberedToMarked } from '../utils/pinyin';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

const LEVEL_OPTIONS = [
  { value: 0, label: 'None (Custom)' },
  { value: 1, label: 'HSK 1' },
  { value: 2, label: 'HSK 2' },
  { value: 3, label: 'HSK 3' },
  { value: 4, label: 'HSK 4' },
  { value: 5, label: 'HSK 5' },
  { value: 6, label: 'HSK 6' },
];

export function AddCustomWordModal({
  defaultLevel,
  onClose,
  onAdd,
}: {
  defaultLevel: number;
  onClose: () => void;
  onAdd: (input: { hanzi: string; pinyin: string; english: string; hskLevel: number }) => Promise<unknown>;
}) {
  useBodyScrollLock();
  const keyboardInset = useKeyboardInset();
  const [hanzi, setHanzi] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [pinyinTouched, setPinyinTouched] = useState(false);
  const [english, setEnglish] = useState('');
  const [hskLevel, setHskLevel] = useState(defaultLevel);
  const [submitting, setSubmitting] = useState(false);
  const [pinyinDeriving, setPinyinDeriving] = useState(false);
  const hanziRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hanziRef.current?.focus();
  }, []);

  // Auto-derive pinyin from hanzi unless the user has manually edited it.
  useEffect(() => {
    if (pinyinTouched) return;
    if (!hanzi.trim()) {
      setPinyin('');
      return;
    }
    let cancelled = false;
    setPinyinDeriving(true);
    hanziToPinyin(hanzi.trim())
      .then((p) => {
        if (!cancelled) setPinyin(p);
      })
      .catch(() => {
        // pinyin-pro failed — leave pinyin untouched
      })
      .finally(() => {
        if (!cancelled) setPinyinDeriving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hanzi, pinyinTouched]);

  const markedPreview = pinyinTouched ? numberedToMarked(pinyin) : pinyin;
  const showPreview = pinyinTouched && markedPreview !== pinyin;

  const canSubmit =
    hanzi.trim().length > 0 && pinyin.trim().length > 0 && english.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onAdd({
        hanzi: hanzi.trim(),
        pinyin: markedPreview.trim(),
        english: english.trim(),
        hskLevel,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add custom word:', err);
      setSubmitting(false);
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
          <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">Add custom word</h2>
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
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
              Hanzi
            </span>
            <input
              ref={hanziRef}
              value={hanzi}
              onChange={(e) => setHanzi(e.target.value)}
              placeholder="你好"
              className="rounded-xl border border-cn-border bg-transparent px-3 py-2 text-2xl font-bold text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                Pinyin
              </span>
              {pinyinDeriving && (
                <span className="text-[10px] text-cn-muted dark:text-cn-muted-dark">deriving…</span>
              )}
            </div>
            <input
              value={pinyin}
              onChange={(e) => {
                setPinyin(e.target.value);
                setPinyinTouched(true);
              }}
              placeholder="nǐ hǎo (or ni3 hao3)"
              className="rounded-xl border border-cn-border bg-transparent px-3 py-2 text-lg text-cn-red outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-red-light"
            />
            {showPreview && (
              <span className="text-xs text-cn-muted dark:text-cn-muted-dark">
                Preview: <span className="font-medium text-cn-red dark:text-cn-red-light">{markedPreview}</span>
              </span>
            )}
            {pinyinTouched && (
              <button
                type="button"
                onClick={() => {
                  setPinyinTouched(false);
                }}
                className="self-start text-[10px] uppercase tracking-wider text-cn-muted underline hover:text-cn-red dark:text-cn-muted-dark dark:hover:text-cn-red-light"
              >
                Re-derive from hanzi
              </button>
            )}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
              English
            </span>
            <input
              value={english}
              onChange={(e) => setEnglish(e.target.value)}
              placeholder="hello"
              className="rounded-xl border border-cn-border bg-transparent px-3 py-2 text-base text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
              Level
            </span>
            <select
              value={hskLevel}
              onChange={(e) => setHskLevel(parseInt(e.target.value, 10))}
              className="rounded-xl border border-cn-border bg-transparent px-3 py-2 text-base text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
            >
              {LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-xl bg-cn-red px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark disabled:opacity-40"
          >
            {submitting ? 'Adding…' : 'Add word'}
          </button>
        </div>
      </div>
    </div>
  );
}
