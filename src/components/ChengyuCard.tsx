import { useState } from 'react';
import { speak } from '../utils/speech';
import type { ChengyuEntry } from '../utils/chengyu';

export function ChengyuCard({
  entry,
  isToday,
  onReroll,
  loading,
  failed,
}: {
  entry: ChengyuEntry | null;
  isToday: boolean;
  onReroll: () => void;
  loading: boolean;
  failed: boolean;
}) {
  const [noAudio, setNoAudio] = useState(false);

  if (failed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cn-border bg-cn-surface px-5 py-5 dark:border-cn-border-dark dark:bg-cn-surface-dark">
      {/* Gold wash in the corner — the only ornament on the page */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cn-gold/10 blur-2xl" />

      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cn-gold">
        {entry?.type === 'suyu' ? '今日俗语' : '今日成语'}
        <span className="ml-2 font-bold tracking-normal text-cn-muted dark:text-cn-muted-dark">
          {isToday ? 'Today' : 'Another one'}
        </span>
      </p>

      {loading || !entry ? (
        <div className="mt-3 h-24 animate-pulse rounded-xl bg-cn-border/40 dark:bg-cn-border-dark/40" />
      ) : (
        <div className="relative mt-2 flex flex-col gap-1">
          <p className="text-4xl font-bold leading-tight tracking-wide text-cn-ink dark:text-cn-cream">
            {entry.hanzi}
          </p>
          <p className="font-pinyin text-sm tracking-wide text-cn-muted dark:text-cn-muted-dark">
            {entry.pinyin}
          </p>
          <p className="mt-1.5 text-[13px] italic text-cn-muted dark:text-cn-muted-dark">
            &ldquo;{entry.literal}&rdquo;
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-cn-ink dark:text-cn-cream">
            {entry.meaning}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={async () => {
                const ok = await speak(entry.hanzi);
                if (!ok) setNoAudio(true);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-cn-border text-cn-muted transition-colors hover:text-cn-red dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-red-light"
              title="Read aloud"
              aria-label="Read aloud"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10 3.75a.75.75 0 0 0-1.264-.546L5.203 6.5H2.667a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75h2.536l3.533 3.296A.75.75 0 0 0 10 16.25V3.75ZM13.06 6.94a.75.75 0 0 1 1.06 0 5.5 5.5 0 0 1 0 6.12.75.75 0 1 1-1.06-1.06 4 4 0 0 0 0-4 .75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
            <button
              onClick={onReroll}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-cn-border text-cn-muted transition-colors hover:text-cn-red dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-red-light"
              title="Show another"
              aria-label="Show another"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h1.433a.75.75 0 0 0 0-1.5H4.083a.75.75 0 0 0-.75.75v3.148a.75.75 0 0 0 1.5 0v-1.171l.813.81a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.446-.394Zm.34-2.984a7 7 0 0 0-11.712-3.138L3.127 6.11V4.94a.75.75 0 0 0-1.5 0v3.147c0 .415.336.75.75.75h3.148a.75.75 0 1 0 0-1.5H4.092l.31-.31a5.5 5.5 0 0 1 9.202 2.466.75.75 0 0 0 1.446-.394Z" clipRule="evenodd" />
              </svg>
            </button>
            {noAudio && (
              <span className="text-[11px] text-cn-muted dark:text-cn-muted-dark">
                No Chinese voice installed on this device.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
