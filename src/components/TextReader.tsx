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
  const [copied, setCopied] = useState(false);
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fallback);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API can fail on insecure contexts / older browsers — ignore.
    }
  };

  return (
    <div className="group relative py-3">
      <button
        onClick={handleCopy}
        title="Copy sentence"
        aria-label="Copy sentence"
        className={`absolute right-0 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-cn-surface/80 text-cn-muted opacity-0 shadow-sm transition-opacity hover:text-cn-red focus-visible:opacity-100 group-hover:opacity-100 dark:bg-cn-surface-dark/80 dark:text-cn-muted-dark dark:hover:text-cn-red-light ${
          copied ? 'opacity-100' : ''
        }`}
      >
        {copied ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-cn-gold-dark dark:text-cn-gold-light">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
            <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.379 6H4.5Z" />
          </svg>
        )}
      </button>
      <p
        className={`flex flex-wrap items-end pr-9 text-2xl text-cn-ink dark:text-cn-cream ${
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
