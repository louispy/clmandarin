import { useEffect, useMemo, useRef, useState } from 'react';
import type { MandarinText } from '../types';
import { splitSentences, sentenceToTokens, type PinyinToken } from '../utils/text';

// Renders a text as a column of sentence blocks. Each block shows the hanzi
// (with optional per-character pinyin ruby) and an optional editable translation
// line. Aligning by sentence — not by line or character — sidesteps the
// English/Chinese length mismatch.
export function TextReader({
  text,
  showPinyin,
  showTranslation,
  onChangeTranslation,
}: {
  text: MandarinText;
  showPinyin: boolean;
  showTranslation: boolean;
  onChangeTranslation: (sentenceIndex: number, value: string) => void;
}) {
  const sentences = useMemo(() => splitSentences(text.body), [text.body]);
  const [tokens, setTokens] = useState<PinyinToken[][]>([]);

  // Derive per-character pinyin for every sentence whenever the body changes.
  // pinyin-pro is loaded lazily, so this runs async and fills in once ready.
  useEffect(() => {
    let cancelled = false;
    Promise.all(sentences.map(sentenceToTokens))
      .then((all) => {
        if (!cancelled) setTokens(all);
      })
      .catch(() => {
        if (!cancelled) setTokens([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sentences]);

  return (
    <div className="flex flex-col divide-y divide-cn-border/60 dark:divide-cn-border-dark/60">
      {sentences.map((sentence, i) => (
        <SentenceBlock
          key={i}
          index={i}
          fallback={sentence}
          tokens={tokens[i]}
          showPinyin={showPinyin}
          showTranslation={showTranslation}
          translation={text.translations[i] ?? ''}
          onChangeTranslation={onChangeTranslation}
        />
      ))}
    </div>
  );
}

function SentenceBlock({
  index,
  fallback,
  tokens,
  showPinyin,
  showTranslation,
  translation,
  onChangeTranslation,
}: {
  index: number;
  fallback: string;
  tokens: PinyinToken[] | undefined;
  showPinyin: boolean;
  showTranslation: boolean;
  translation: string;
  onChangeTranslation: (sentenceIndex: number, value: string) => void;
}) {
  // Local draft so typing stays smooth; persist on blur.
  const [draft, setDraft] = useState(translation);
  const [editing, setEditing] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const readRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setDraft(translation);
  }, [translation]);

  // Reading mode is a plain single-line div that scrolls horizontally (no wrap);
  // tapping it swaps in a textarea that wraps + auto-grows for comfortable
  // editing. Swapping elements (rather than toggling a live textarea's wrap)
  // keeps the CSS behaviour reliable across browsers.
  const commit = () => {
    setEditing(false);
    if (draft !== translation) onChangeTranslation(index, draft);
  };

  // Flag when reading-mode content continues to the right of the current scroll
  // position, so a fade hint can signal it (and disappear once scrolled to end).
  const measureOverflow = (el: HTMLDivElement | null) => {
    if (el) setOverflowing(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
  };
  useEffect(() => {
    if (!editing) measureOverflow(readRef.current);
  }, [draft, editing, showTranslation]);

  // Focus the textarea (caret at end) when entering edit mode, and size it to fit.
  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, draft]);

  return (
    <div className="py-3">
      <p
        className={`flex flex-wrap items-end text-2xl text-cn-ink dark:text-cn-cream ${
          showPinyin ? 'gap-x-0.5 gap-y-2 leading-snug' : 'leading-relaxed'
        }`}
      >
        {tokens
          ? tokens.map((tok, j) =>
              tok.isHanzi && showPinyin ? (
                <ruby key={j} className="leading-none">
                  {tok.char}
                  <rt
                    className="font-pinyin text-cn-red dark:text-cn-red-light"
                    style={{ fontSize: '0.4em' }}
                  >
                    {tok.pinyin}
                  </rt>
                </ruby>
              ) : (
                <span key={j}>{tok.char}</span>
              )
            )
          : fallback}
      </p>

      {showTranslation && (
        <div className="relative mt-1.5">
          {editing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              placeholder="Add translation…"
              rows={1}
              className="block w-full resize-none whitespace-pre-wrap break-words rounded-lg border border-cn-red bg-transparent px-2.5 py-1.5 text-sm leading-snug text-cn-ink outline-none placeholder:text-cn-muted/40 dark:text-cn-cream dark:placeholder:text-cn-muted-dark/40"
            />
          ) : (
            <div
              ref={readRef}
              onClick={() => setEditing(true)}
              onScroll={(e) => measureOverflow(e.currentTarget)}
              className="cursor-text overflow-x-auto whitespace-nowrap rounded-lg bg-cn-paper/60 px-2.5 py-1.5 text-sm leading-snug text-cn-muted [scrollbar-width:none] dark:bg-cn-paper-dark/40 dark:text-cn-muted-dark"
            >
              {draft || <span className="text-cn-muted/40 dark:text-cn-muted-dark/40">Add translation…</span>}
            </div>
          )}
          {/* Right-edge fade: signals the line scrolls horizontally for more. */}
          {!editing && overflowing && (
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-lg bg-gradient-to-l from-cn-paper to-transparent dark:from-cn-paper-dark" />
          )}
        </div>
      )}
    </div>
  );
}
