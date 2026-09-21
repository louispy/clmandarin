import { useState, useCallback } from 'react';
import { displayHanzi, type Script } from '../hooks/useScript';
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

export function QuizResults({
  sourceName,
  answers,
  missed,
  totalPoints,
  correctCount,
  bestStreak,
  script,
  onAddMissedToFavorites,
  onSaveMissedAsList,
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
  onAddMissedToFavorites: () => Promise<void>;
  onSaveMissedAsList: () => Promise<void>;
  onPlayAgain: () => void;
  onBackToSetup: () => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const avgMs = answers.length
    ? answers.reduce((s, a) => s + a.ms, 0) / answers.length
    : 0;

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

  const run = async (key: string, fn: () => Promise<void>) => {
    if (saving) return;
    setSaving(key);
    try {
      await fn();
      setSaved(key);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-cn-border bg-cn-surface px-4 py-6 dark:border-cn-border-dark dark:bg-cn-surface-dark">
        <p className="font-pinyin text-[10px] font-bold uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          {sourceName} · {answers.length} questions
        </p>
        <p className="font-pinyin text-5xl font-black tabular-nums leading-none text-cn-gold">
          {totalPoints.toLocaleString()}
        </p>
        <p className="font-pinyin text-[10px] font-bold uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          points
        </p>
        <div className="mt-3 flex items-center gap-2">
          <ShareStoryButton
            render={renderStory}
            filename="clmandarin-quiz.png"
            title={`${totalPoints.toLocaleString()} points on ${sourceName}`}
            label="Share result"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Stat label="Correct" value={`${correctCount}/${answers.length}`} />
        <Stat label="Avg time" value={`${(avgMs / 1000).toFixed(1)}s`} />
        <Stat label="Best streak" value={String(bestStreak)} />
      </div>

      {missed.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="px-0.5 text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
            Missed · {missed.length} {missed.length === 1 ? 'word' : 'words'}
          </p>
          <div className="flex flex-col divide-y divide-cn-border rounded-2xl border border-cn-border dark:divide-cn-border-dark dark:border-cn-border-dark">
            {missed.map((a) => (
              <div key={a.word.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-[3rem] text-lg font-bold text-cn-ink dark:text-cn-cream">
                  {displayHanzi(a.word, script)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-pinyin text-[11px] text-cn-red dark:text-cn-red-light">
                    {a.word.pinyin}
                  </span>
                  <span className="block truncate text-xs text-cn-muted dark:text-cn-muted-dark">
                    {a.word.english}
                  </span>
                </span>
                <span className="shrink-0 font-pinyin text-[10px] tabular-nums text-cn-muted dark:text-cn-muted-dark">
                  {a.chosenId === null ? 'timed out' : `${(a.ms / 1000).toFixed(1)}s`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-cn-border px-4 py-6 text-center text-sm font-bold text-cn-ink dark:border-cn-border-dark dark:text-cn-cream">
          Every one correct. Nothing to review.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {missed.length > 0 && (
          <>
            <button
              onClick={() => run('fav', onAddMissedToFavorites)}
              disabled={saving !== null || saved === 'fav'}
              className="rounded-2xl bg-cn-red px-5 py-3 text-sm font-black text-white shadow-lg shadow-cn-red/25 transition-all hover:bg-cn-red-dark disabled:opacity-50 disabled:shadow-none"
            >
              {saved === 'fav'
                ? `✓ Added to Favorites`
                : `★ Add ${missed.length} missed to Favorites`}
            </button>
            <button
              onClick={() => run('list', onSaveMissedAsList)}
              disabled={saving !== null || saved === 'list'}
              className="rounded-xl border border-cn-border px-5 py-2.5 text-xs font-bold text-cn-muted transition-colors hover:text-cn-ink disabled:opacity-50 dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream"
            >
              {saved === 'list' ? '✓ Saved as a new list' : 'Save missed as a new list'}
            </button>
          </>
        )}
        <div className="flex gap-2">
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-xl border border-cn-border px-5 py-2.5 text-xs font-bold text-cn-muted transition-colors hover:text-cn-ink dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            Play again
          </button>
          <button
            onClick={onBackToSetup}
            className="flex-1 rounded-xl border border-cn-border px-5 py-2.5 text-xs font-bold text-cn-muted transition-colors hover:text-cn-ink dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            Change deck
          </button>
        </div>
      </div>
    </div>
  );
}
