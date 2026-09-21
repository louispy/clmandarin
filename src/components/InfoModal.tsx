import { useBackButton } from '../hooks/useBackButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

/** A read-and-dismiss dialog, sharing ConfirmModal's shell. */
export function InfoModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useBackButton(onClose);
  useBodyScrollLock();

  return (
    <div
      onClick={onClose}
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
        <div className="mt-2 flex flex-col gap-2.5 text-sm leading-relaxed text-cn-muted dark:text-cn-muted-dark">
          {children}
        </div>
        <button
          onClick={onClose}
          autoFocus
          className="mt-5 w-full rounded-xl bg-cn-red px-4 py-2.5 font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
