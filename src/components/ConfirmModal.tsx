import { useBackButton } from '../hooks/useBackButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

/**
 * A yes/no dialog in the app's own chrome, replacing window.confirm.
 *
 * Follows the same shell as the other modals here: a dimmed backdrop that
 * cancels on click, the panel stopping propagation, and the system back button
 * treated as a cancel.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useBackButton(onCancel);
  useBodyScrollLock();

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-cn-border bg-cn-surface p-6 shadow-2xl dark:border-cn-border-dark dark:bg-cn-surface-dark"
      >
        <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">{title}</h2>
        {message && (
          <p className="mt-2 text-sm leading-relaxed text-cn-muted dark:text-cn-muted-dark">
            {message}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-cn-border px-4 py-2.5 font-bold text-cn-muted transition-colors hover:text-cn-ink dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="flex-1 rounded-xl bg-cn-red px-4 py-2.5 font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
