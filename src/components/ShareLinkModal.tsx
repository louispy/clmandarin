import { useState } from 'react';
import { useBackButton } from '../hooks/useBackButton';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

function formatExpiry(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'soon';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function ShareLinkModal({
  url,
  listName,
  expiresAt,
  onClose,
  noun = 'list',
}: {
  url: string;
  listName: string;
  expiresAt: string;
  onClose: () => void;
  noun?: string;
}) {
  useBodyScrollLock();
  useBackButton(onClose);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API can fail on insecure contexts / older mobile browsers;
      // the URL is still selectable in the display field above as a fallback.
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
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-cn-ink dark:text-cn-cream">
              Share &ldquo;<span className="text-cn-red dark:text-cn-red-light">{listName}</span>&rdquo;
            </h2>
            <p className="mt-1 text-xs text-cn-muted dark:text-cn-muted-dark">
              Anyone with this link can import the {noun}. Link expires in {formatExpiry(expiresAt)}.
            </p>
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

        <div className="mt-4 flex gap-2">
          <div
            className="min-w-0 flex-1 select-all break-all rounded-xl border border-cn-border bg-cn-paper px-3 py-2 font-mono text-xs text-cn-ink dark:border-cn-border-dark dark:bg-cn-paper-dark dark:text-cn-cream"
          >
            {url}
          </div>
          <button
            onClick={handleCopy}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              copied
                ? 'bg-cn-gold/20 text-cn-gold-dark dark:text-cn-gold-light'
                : 'bg-cn-red text-white shadow-md shadow-cn-red/20 hover:bg-cn-red-dark'
            }`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
