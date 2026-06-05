import { useEffect, useRef, useState } from 'react';
import { useBackButton } from '../hooks/useBackButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

// Create a new text or edit an existing one's title/body. Translations are
// edited inline in the reader, not here.
export function TextEditorModal({
  initialTitle = '',
  initialBody = '',
  mode,
  onClose,
  onSave,
}: {
  initialTitle?: string;
  initialBody?: string;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSave: (title: string, body: string) => void | Promise<void>;
}) {
  useBodyScrollLock();
  useBackButton(onClose);
  const keyboardInset = useKeyboardInset();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      await onSave(title.trim(), body.trim());
      onClose();
    } catch (err) {
      console.error('Failed to save text:', err);
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
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-cn-border bg-cn-surface p-6 shadow-2xl dark:border-cn-border-dark dark:bg-cn-surface-dark"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">
            {mode === 'create' ? 'New text' : 'Edit text'}
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

        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
              Title
            </span>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My reading text"
              className="rounded-xl border border-cn-border bg-transparent px-3 py-2 text-base text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
              Text (hanzi)
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="在这里输入或粘贴中文…"
              rows={8}
              className="resize-y rounded-xl border border-cn-border bg-transparent px-3 py-2 text-lg leading-relaxed text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
            />
            <span className="text-[11px] text-cn-muted dark:text-cn-muted-dark">
              Pinyin is generated automatically. Add translations later, sentence by sentence.
            </span>
          </label>
        </div>

        <div className="mt-5 flex shrink-0 items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-bold text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="rounded-xl bg-cn-red px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark disabled:opacity-40"
          >
            {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
