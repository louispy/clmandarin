import { useState, useCallback } from 'react';
import type { ChengyuEntry } from '../utils/chengyu';
import { InfoModal } from './InfoModal';
import { ShareStoryButton } from './ShareStoryButton';
import { renderChengyuStory } from '../utils/share-image';

export function ChengyuCard({
  entry,
  loading,
  failed,
}: {
  entry: ChengyuEntry | null;
  loading: boolean;
  failed: boolean;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  // Stable per entry, so ShareStoryButton re-renders the image only when the
  // saying changes rather than on every parent render.
  const renderStory = useCallback(
    () => (entry ? renderChengyuStory(entry) : Promise.reject(new Error('not ready'))),
    [entry]
  );

  if (failed) return null;

  const isSuyu = entry?.type === 'suyu';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cn-border bg-cn-surface px-4 py-3 dark:border-cn-border-dark dark:bg-cn-surface-dark">
      {/* Gold wash in the corner — the only ornament on the page */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cn-gold/10 blur-2xl" />

      {/* One header line: Chinese term, plain-English title, and the explainer.
          "Saying of the day" rather than "Chengyu of the day" because a fifth
          of the collection is 俗语 — proverbs, not chengyu. */}
      <div className="relative flex items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-cn-gold">
          {isSuyu ? '今日俗语' : '今日成语'}
          <span className="ml-1.5 text-cn-muted dark:text-cn-muted-dark">
            Saying of the day
          </span>
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {entry && (
            <ShareStoryButton
              render={renderStory}
              filename={`${entry.hanzi}.png`}
              title={`${entry.hanzi} — ${entry.meaning}`}
            />
          )}
        <button
          onClick={() => setInfoOpen(true)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cn-border text-[10px] font-black text-cn-muted transition-colors hover:border-cn-red hover:text-cn-red dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-red-light"
          aria-label="What is this?"
          title="What is this?"
        >
          i
        </button>
        </div>
      </div>

      {loading || !entry ? (
        <div className="mt-2 h-16 animate-pulse rounded-xl bg-cn-border/40 dark:bg-cn-border-dark/40" />
      ) : (
        <div className="relative mt-1">
          <p className="text-3xl font-bold leading-snug tracking-wide text-cn-ink dark:text-cn-cream">
            {entry.hanzi}
          </p>
          <p className="font-pinyin text-[13px] leading-snug tracking-wide text-cn-muted dark:text-cn-muted-dark">
            {entry.pinyin}
          </p>
          {/* Literal and meaning each get their own line, but with tight
              leading and no gap between them, so the pair costs about the
              same height as one wrapped paragraph.

              The literal needs the Latin-first stack for the same reason
              pinyin does (see --font-pinyin in index.css): a CJK font renders
              U+201C as a full-width glyph with its ink in the right half of the
              em-box, which pushed the quoted line visibly right of the meaning
              below it. */}
          <p className="mt-1.5 font-pinyin text-[13px] italic leading-snug text-cn-muted dark:text-cn-muted-dark">
            &ldquo;{entry.literal}&rdquo;
          </p>
          <p className="text-[13px] leading-snug text-cn-ink dark:text-cn-cream">
            {entry.meaning}
          </p>
        </div>
      )}

      {infoOpen && (
        <InfoModal title="Chengyu 成语 and Suyu 俗语" onClose={() => setInfoOpen(false)}>
          {/* A definition list, not paragraphs. No examples: the card itself
              is the example, sitting right behind this dialog. */}
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="font-bold text-cn-ink dark:text-cn-cream">
                成语 <span className="font-normal">chéngyǔ</span>
              </dt>
              <dd>A fixed four-character idiom, usually from a classical story.</dd>
            </div>
            <div>
              <dt className="font-bold text-cn-ink dark:text-cn-cream">
                俗语 <span className="font-normal">súyǔ</span>
              </dt>
              <dd>An everyday proverb, closer to how people actually speak.</dd>
            </div>
          </dl>
        </InfoModal>
      )}
    </div>
  );
}
