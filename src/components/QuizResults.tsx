import { useState, useCallback, useRef, useEffect } from 'react';
import type { FlashcardList } from '../types';
import { displayHanzi, type Script } from '../hooks/useScript';
import { displayGloss } from '../utils/quiz';
import type { QuizAnswer } from '../hooks/useQuiz';
import { ShareStoryButton } from './ShareStoryButton';
import { renderQuizStory } from '../utils/share-image';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-xl border border-cn-border px-3 py-2 dark:border-cn-border-dark">
      <span className="font-pinyin text-base font-black tabular-nums text-cn-ink dark:text-cn-cream">
        {value}
      </span>
      <span className="font-pinyin text-[9px] font-bold uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
        {label}
      </span>
    </div>
  );
}

/** Destination picker for the missed words. */
function AddToListMenu({
  count,
  lists,
  onAddToList,
  onCreateListAndAdd,
}: {
  count: number;
  lists: FlashcardList[];
  onAddToList: (listId: string) => Promise<void>;
  onCreateListAndAdd: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const run = async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      setDone(label);
      setOpen(false);
      setCreating(false);
      setName('');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <p className="rounded-2xl border border-cn-border px-5 py-3 text-center text-sm font-bold text-cn-ink dark:border-cn-border-dark dark:text-cn-cream">
        &#10003; Added {count} {count === 1 ? 'word' : 'words'} to {done}
      </p>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cn-border px-5 py-2.5 text-sm font-bold text-cn-ink transition-colors hover:border-cn-red hover:text-cn-red dark:border-cn-border-dark dark:text-cn-cream dark:hover:text-cn-red-light"
      >
        Add {count} missed to a list
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[50vh] overflow-y-auto rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
            Add to
          </p>
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => run(list.name, () => onAddToList(list.id))}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-cn-ink transition-colors hover:bg-cn-gold/10 disabled:opacity-50 dark:text-cn-cream dark:hover:bg-cn-gold/10"
            >
              <span className="truncate">{list.name}</span>
              <span className="ml-auto font-pinyin text-xs tabular-nums text-cn-muted dark:text-cn-muted-dark">
                {list.wordIds.length}
              </span>
            </button>
          ))}
          {lists.length > 0 && <div className="my-1 border-t border-cn-border dark:border-cn-border-dark" />}
          {creating ? (
            <div className="flex gap-1 px-2 py-1">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && name.trim()) run(name.trim(), () => onCreateListAndAdd(name.trim()));
                  if (e.key === 'Escape') { setCreating(false); setName(''); }
                }}
                placeholder="List name..."
                className="min-w-0 flex-1 rounded-lg border border-cn-border bg-transparent px-2 py-1 text-sm text-cn-ink outline-none focus:border-cn-red dark:border-cn-border-dark dark:text-cn-cream"
              />
              <button
                onClick={() => name.trim() && run(name.trim(), () => onCreateListAndAdd(name.trim()))}
                className="rounded-lg bg-cn-red px-2 py-1 text-xs font-medium text-white"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-cn-red transition-colors hover:bg-cn-red/10 dark:text-cn-red-light"
            >
              + New list
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function QuizResults({
  sourceName,
  answers,
  missed,
  totalPoints,
  correctCount,
  bestStreak,
  script,
  lists,
  onAddMissedToList,
  onCreateListWithMissed,
  onPlayAgain,
  onBackToSetup,
}: {
  sourceName: string;
  answers: QuizAnswer[];
  missed: QuizAnswer[];
  totalPoints: number;
  correctCount: number;
  bestStreak: number;
  script: Script;
  lists: FlashcardList[];
  onAddMissedToList: (listId: string) => Promise<void>;
  onCreateListWithMissed: (name: string) => Promise<void>;
  onPlayAgain: () => void;
  onBackToSetup: () => void;
}) {
  const avgMs = answers.length ? answers.reduce((s, a) => s + a.ms, 0) / answers.length : 0;

  const renderStory = useCallback(
    () =>
      renderQuizStory({
        deckName: sourceName,
        points: totalPoints,
        correct: correctCount,
        total: answers.length,
        bestStreak,
        avgSeconds: avgMs / 1000,
      }),
    [sourceName, totalPoints, correctCount, answers.length, bestStreak, avgMs]
  );

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-cn-border bg-cn-surface px-4 py-6 dark:border-cn-border-dark dark:bg-cn-surface-dark">
        <p className="font-pinyin text-[10px] font-bold uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          {sourceName}
        </p>
        {/* How many you got right is the result. The score is a flourish until
            there is someone to compare it against. */}
        <p className="font-pinyin text-5xl font-black tabular-nums leading-none text-cn-ink dark:text-cn-cream">
          {correctCount}
          <span className="text-cn-muted dark:text-cn-muted-dark">/{answers.length}</span>
        </p>
        <p className="font-pinyin text-[10px] font-bold uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          correct
        </p>
        <p className="mt-1 font-pinyin text-sm font-black tabular-nums text-cn-gold">
          {totalPoints.toLocaleString()} points
        </p>
        <div className="mt-3 flex items-center gap-2">
          <ShareStoryButton render={renderStory} filename="clmandarin-quiz.png" label="Share result" />
        </div>
      </div>

      <div className="flex gap-2">
        <Stat label="Accuracy" value={`${Math.round((correctCount / Math.max(1, answers.length)) * 100)}%`} />
        <Stat label="Avg time" value={`${(avgMs / 1000).toFixed(1)}s`} />
        <Stat label="Best streak" value={String(bestStreak)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={onPlayAgain}
            className="flex-[2] rounded-2xl bg-cn-red px-5 py-3 text-sm font-black text-white shadow-lg shadow-cn-red/25 transition-all hover:bg-cn-red-dark"
          >
            Play again
          </button>
          <button
            onClick={onBackToSetup}
            className="flex-1 rounded-2xl border border-cn-border px-4 py-3 text-sm font-bold text-cn-muted transition-colors hover:text-cn-ink dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            Change deck
          </button>
        </div>
        {missed.length > 0 ? (
          <AddToListMenu
            count={missed.length}
            lists={lists}
            onAddToList={onAddMissedToList}
            onCreateListAndAdd={onCreateListWithMissed}
          />
        ) : (
          <p className="rounded-2xl border-2 border-dashed border-cn-border px-4 py-3 text-center text-sm font-bold text-cn-ink dark:border-cn-border-dark dark:text-cn-cream">
            Every one correct. Nothing to review.
          </p>
        )}
      </div>

      {/* Every question, in the order they were asked — getting one right is
          worth seeing too, and a wrong answer means more next to the ones
          around it. */}
      <div className="flex flex-col gap-1.5">
        <p className="px-0.5 text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          Review · {answers.length} {answers.length === 1 ? 'question' : 'questions'}
        </p>
        <div className="flex flex-col divide-y divide-cn-border rounded-2xl border border-cn-border dark:divide-cn-border-dark dark:border-cn-border-dark">
          {answers.map((a, i) => (
            <div key={`${a.word.id}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-white ${
                  a.correct ? 'bg-[#2E7D52]' : 'bg-cn-red'
                }`}
                aria-label={a.correct ? 'Correct' : 'Wrong'}
              >
                {a.correct ? '✓' : '✗'}
              </span>
              <span className="min-w-[3rem] text-lg font-bold text-cn-ink dark:text-cn-cream">
                {displayHanzi(a.word, script)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-pinyin text-[11px] text-cn-red dark:text-cn-red-light">
                  {a.word.pinyin}
                </span>
                <span className="block truncate text-xs text-cn-muted dark:text-cn-muted-dark">
                  {displayGloss(a.word.english)}
                </span>
              </span>
              <span className="shrink-0 font-pinyin text-[10px] tabular-nums text-cn-muted dark:text-cn-muted-dark">
                {a.chosenId === null ? 'timed out' : `${(a.ms / 1000).toFixed(1)}s`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
