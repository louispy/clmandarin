import { useState, useEffect, useCallback, useRef } from 'react';
import type { VocabWord } from '../types';

export function FlashcardViewer({
  words,
  listName,
  onClose,
  dark,
  onToggleDark,
  startIndex,
}: {
  words: VocabWord[];
  listName: string;
  onClose: () => void;
  dark: boolean;
  onToggleDark: () => void;
  startIndex?: number;
}) {
  const initialIndex = startIndex ?? Math.floor(Math.random() * words.length);
  const historyRef = useRef<number[]>([initialIndex]);
  const historyPosRef = useRef(0);
  const [index, setIndex] = useState(initialIndex);
  const [flipped, setFlipped] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const word = words[index];

  const navigate = useCallback((newIdx: number, clearForward: boolean) => {
    if (clearForward) {
      // Truncate forward history (like clicking a new link in browser)
      historyRef.current = historyRef.current.slice(0, historyPosRef.current + 1);
    }
    historyRef.current.push(newIdx);
    historyPosRef.current = historyRef.current.length - 1;
    setIndex(newIdx);
    setFlipped(false);
    setCanGoBack(historyPosRef.current > 0);
    setCanGoForward(false);
  }, []);

  const next = useCallback(() => {
    // Forward through history if available
    if (historyPosRef.current < historyRef.current.length - 1) {
      historyPosRef.current++;
      setIndex(historyRef.current[historyPosRef.current]);
      setFlipped(false);
      setCanGoBack(historyPosRef.current > 0);
      setCanGoForward(historyPosRef.current < historyRef.current.length - 1);
      return;
    }
    // Otherwise next sequential word
    if (index < words.length - 1) {
      navigate(index + 1, true);
    }
  }, [index, words.length, navigate]);

  const prev = useCallback(() => {
    if (historyPosRef.current > 0) {
      historyPosRef.current--;
      setIndex(historyRef.current[historyPosRef.current]);
      setFlipped(false);
      setCanGoBack(historyPosRef.current > 0);
      setCanGoForward(true);
    }
  }, []);

  const random = useCallback(() => {
    if (words.length <= 1) return;
    let newIdx: number;
    do {
      newIdx = Math.floor(Math.random() * words.length);
    } while (newIdx === index);
    navigate(newIdx, true);
  }, [index, words.length, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        random();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, random, onClose]);

  if (!word) return null;

  const progress = ((index + 1) / words.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cn-paper dark:bg-cn-paper-dark">
      {/* Progress bar */}
      <div className="h-1 w-full bg-cn-border dark:bg-cn-border-dark">
        <div
          className="h-full bg-cn-red transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-medium text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <span className="text-sm font-bold text-cn-red dark:text-cn-red-light">
          {listName}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cn-red/10 px-3 py-1 text-sm font-bold text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light">
            {index + 1} / {words.length}
          </span>
          <button
            onClick={onToggleDark}
            className="rounded-xl p-2 text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.061l1.061-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.061 1.06l1.06 1.061ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Flippable card */}
      <div
        className="flex flex-1 items-center justify-center px-4 py-4 sm:px-6"
        style={{ perspective: '1200px' }}
      >
        <div
          onClick={() => setFlipped((f) => !f)}
          className="relative w-full max-w-lg cursor-pointer"
          style={{
            aspectRatio: '3 / 4',
            maxHeight: 'calc(100vh - 200px)',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front face — Hanzi (+ optional hints) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-cn-border bg-cn-surface shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-8xl font-black text-cn-ink dark:text-cn-cream sm:text-9xl">
              {word.hanzi}
            </p>

            {showHints && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <p className="text-4xl font-bold text-cn-red/60 dark:text-cn-red-light/60 sm:text-5xl">
                  {word.pinyin}
                </p>
                <p className="text-2xl text-cn-muted/50 dark:text-cn-muted-dark/50 sm:text-3xl">
                  {word.english}
                </p>
              </div>
            )}

            <p className="mt-8 text-base text-cn-muted/30 dark:text-cn-muted-dark/30">
              tap to flip
            </p>
          </div>

          {/* Back face — Pinyin + Translation */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-2 border-cn-gold/30 bg-cn-surface shadow-xl dark:border-cn-gold-dark/30 dark:bg-cn-surface-dark"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <p className="text-5xl font-bold text-cn-red dark:text-cn-red-light sm:text-6xl">
              {word.pinyin}
            </p>
            <div className="mt-5 h-px w-20 bg-cn-gold/30" />
            <p className="mt-5 px-8 text-center text-3xl text-cn-ink dark:text-cn-cream sm:text-4xl">
              {word.english || '—'}
            </p>
            <p className="mt-8 text-base text-cn-muted/30 dark:text-cn-muted-dark/30">
              tap to flip
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-center gap-2 px-3 py-5 sm:gap-3 sm:px-6 sm:py-6">
        <button
          onClick={prev}
          disabled={!canGoBack}
          className="flex items-center gap-1 rounded-xl bg-cn-surface px-3 py-2.5 text-sm font-bold text-cn-ink shadow-sm transition-all hover:shadow-md disabled:opacity-30 dark:bg-cn-surface-dark dark:text-cn-cream sm:px-6 sm:py-3 sm:text-base"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Random */}
        <button
          onClick={random}
          disabled={words.length <= 1}
          className="flex items-center gap-1 rounded-xl bg-cn-surface px-3 py-2.5 text-sm font-bold text-cn-gold-dark shadow-sm transition-all hover:shadow-md disabled:opacity-30 dark:bg-cn-surface-dark dark:text-cn-gold-light sm:px-4 sm:py-3 sm:text-base"
          title="Random card (R)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Random</span>
        </button>

        {/* Show hints toggle — shows pinyin+meaning on front face */}
        <button
          onClick={() => setShowHints((h) => !h)}
          className={`flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm font-bold shadow-sm transition-all hover:shadow-md sm:px-5 sm:py-3 sm:text-base ${
            showHints
              ? 'bg-cn-gold/20 text-cn-gold-dark dark:text-cn-gold-light'
              : 'bg-cn-surface text-cn-muted dark:bg-cn-surface-dark dark:text-cn-muted-dark'
          }`}
          title="Show hints on front face"
        >
          {showHints ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.092 1.092a4 4 0 0 0-5.558-5.558Z" clipRule="evenodd" />
              <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          onClick={next}
          disabled={!canGoForward && index === words.length - 1}
          className="flex items-center gap-1 rounded-xl bg-cn-surface px-3 py-2.5 text-sm font-bold text-cn-ink shadow-sm transition-all hover:shadow-md disabled:opacity-30 dark:bg-cn-surface-dark dark:text-cn-cream sm:px-6 sm:py-3 sm:text-base"
        >
          <span className="hidden sm:inline">Next</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638l-3.96-4.158a.75.75 0 1 1 1.08-1.04l5.25 5.5a.75.75 0 0 1 0 1.08l-5.25 5.5a.75.75 0 1 1-1.08-1.04l3.96-4.158H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
