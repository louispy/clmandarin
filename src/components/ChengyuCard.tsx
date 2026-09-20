import type { ChengyuEntry } from '../utils/chengyu';

export function ChengyuCard({
  entry,
  loading,
  failed,
}: {
  entry: ChengyuEntry | null;
  loading: boolean;
  failed: boolean;
}) {
  if (failed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cn-border bg-cn-surface px-5 py-4 dark:border-cn-border-dark dark:bg-cn-surface-dark">
      {/* Gold wash in the corner — the only ornament on the page */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cn-gold/10 blur-2xl" />

      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cn-gold">
        {entry?.type === 'suyu' ? '今日俗语' : '今日成语'}
      </p>

      {loading || !entry ? (
        <div className="mt-2 h-20 animate-pulse rounded-xl bg-cn-border/40 dark:bg-cn-border-dark/40" />
      ) : (
        <div className="relative mt-1 flex flex-col gap-0.5">
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
        </div>
      )}
    </div>
  );
}
