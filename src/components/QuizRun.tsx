import { useEffect, useState } from 'react';
import type { VocabWord } from '../types';
import { displayHanzi, type Script } from '../hooks/useScript';
import { speak } from '../utils/speech';
import { displayGloss, optionKind, promptKind, PROMPT_HINTS, type QuizConfig, type QuizQuestion } from '../utils/quiz';
import { ConfirmModal } from './ConfirmModal';

// Kahoot's four shapes. The shape matters as much as the colour: it keeps the
// tiles distinguishable for anyone who can't separate red from green.
const TILES = [
  { shape: '▲', bg: 'bg-[#C41E3A]' },
  { shape: '◆', bg: 'bg-[#1F6FA8]' },
  // Darkened from #B8860B, which gave white text only 3.25:1.
  { shape: '●', bg: 'bg-[#9A6E08]' },
  { shape: '■', bg: 'bg-[#2E7D52]' },
];

export function QuizRun({
  question,
  config,
  index,
  total,
  msLeft,
  totalMs,
  revealLeft,
  revealTotalMs,
  locked,
  streak,
  totalPoints,
  lastPoints,
  script,
  onAnswer,
  onNext,
  onQuit,
  onPauseChange,
  onTogglePinyin,
}: {
  question: QuizQuestion;
  config: QuizConfig;
  index: number;
  total: number;
  msLeft: number;
  totalMs: number;
  revealLeft: number;
  revealTotalMs: number;
  locked: { chosenId: string | null } | null;
  streak: number;
  totalPoints: number;
  lastPoints: number;
  script: Script;
  onAnswer: (wordId: string) => void;
  onNext: () => void;
  onQuit: () => void;
  onTogglePinyin: () => void;
  onPauseChange: (paused: boolean) => void;
}) {
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const kind = promptKind(config.direction);
  const opts = optionKind(config.direction);

  // Audio questions play themselves — there is nothing to read.
  useEffect(() => {
    if (kind === 'audio') speak(question.word.hanzi);
  }, [kind, question.word.hanzi]);

  const optionLabel = (w: VocabWord) =>
    opts === 'hanzi' ? displayHanzi(w, script) : displayGloss(w.english);

  const fraction = Math.max(0, Math.min(1, msLeft / totalMs));
  const wasCorrect = locked?.chosenId === question.word.id;
  // While the answer is up, the same bar runs the pause down — so the wait is
  // visible, and its colour doubles as the right/wrong signal.
  const revealing = locked !== null && revealTotalMs > 0;
  const barFraction = revealing
    ? Math.max(0, Math.min(1, revealLeft / revealTotalMs))
    : fraction;
  const barColour = locked
    ? wasCorrect
      ? 'bg-[#2E7D52]'
      : 'bg-cn-red'
    : fraction < 0.3
      ? 'bg-cn-red'
      : 'bg-cn-gold';

  const cancelQuit = () => {
    setConfirmingQuit(false);
    onPauseChange(false);
  };

  return (
    <div className="flex flex-col gap-3 pt-1">
      {confirmingQuit && (
        <ConfirmModal
          title="Quit this quiz?"
          message={`You are ${index + 1} of ${total} questions in. Your score for this run will be lost.`}
          confirmLabel="Quit"
          cancelLabel="Keep going"
          onConfirm={onQuit}
          onCancel={cancelQuit}
        />
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-cn-border dark:bg-cn-border-dark">
        <div
          className={`h-full rounded-full transition-colors ${barColour}`}
          style={{ width: `${(locked && !revealing ? 1 : barFraction) * 100}%` }}
        />
      </div>

      {/* Fixed height: the Next button is taller than the countdown it
          replaces, and without this the row grows and nudges the tiles down
          the moment you answer. */}
      <div className="relative flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-2xl border border-cn-border bg-cn-surface px-4 py-6 text-center dark:border-cn-border-dark dark:bg-cn-surface-dark">
        {/* The prompt is already the reading in pinyin → 中, so there is
            nothing to reveal there. */}
        {kind !== 'pinyin' && (
          <button
            onClick={onTogglePinyin}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-cn-muted/50 transition-colors hover:text-cn-red dark:text-cn-muted-dark/50 dark:hover:text-cn-red-light"
            title={config.showPinyin ? 'Hide the reading' : 'Show the reading after answering'}
            aria-label={config.showPinyin ? 'Hide the reading' : 'Show the reading after answering'}
            aria-pressed={config.showPinyin}
          >
            {config.showPinyin ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
              </svg>
            )}
          </button>
        )}
        <p className="text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          {PROMPT_HINTS[config.direction]}
        </p>
        {kind === 'hanzi' && (
          <p className="text-5xl font-bold leading-tight text-cn-ink dark:text-cn-cream">
            {displayHanzi(question.word, script)}
          </p>
        )}
        {kind === 'english' && (
          <p className="text-2xl font-bold leading-snug text-cn-ink dark:text-cn-cream">
            {displayGloss(question.word.english)}
          </p>
        )}
        {kind === 'pinyin' && (
          <p className="font-pinyin text-3xl font-bold tracking-wide text-cn-ink dark:text-cn-cream">
            {question.word.pinyin}
          </p>
        )}
        {kind === 'audio' && (
          <button
            onClick={() => speak(question.word.hanzi)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-cn-red text-white shadow-lg shadow-cn-red/25"
            aria-label="Play again"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
              <path d="M10 3.75a.75.75 0 0 0-1.264-.546L5.203 6.5H2.667a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75h2.536l3.533 3.296A.75.75 0 0 0 10 16.25V3.75ZM13.06 6.94a.75.75 0 0 1 1.06 0 5.5 5.5 0 0 1 0 6.12.75.75 0 1 1-1.06-1.06 4 4 0 0 0 0-4 .75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        )}

        {/* Reserved whether or not it is showing, so revealing the reading on
            answer does not move the tiles. It collapses only when the eye is
            switched off, which is the user's own doing. */}
        {config.showPinyin && kind !== 'pinyin' && (
          <p
            className={`font-pinyin text-base font-bold tracking-wide text-cn-red transition-opacity dark:text-cn-red-light ${
              locked ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={!locked}
          >
            {question.word.pinyin}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option, i) => {
          const tile = TILES[i % TILES.length];
          const isAnswer = option.id === question.word.id;
          const revealed = locked !== null;
          const isChosen = locked?.chosenId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onAnswer(option.id)}
              disabled={revealed}
              className={`flex min-h-[4.75rem] items-center gap-2.5 rounded-2xl px-3 py-4 text-left text-sm font-black text-white transition-all ${tile.bg} ${
                revealed
                  ? isAnswer
                    // The ring is drawn on the page, not the tile, so it has
                    // to contrast with the page — gold-light on cream paper
                    // came to 1.58:1 and simply vanished.
                    ? 'outline outline-[3px] outline-offset-2 outline-cn-ink dark:outline-cn-cream'
                    : 'saturate-[0.25] brightness-[0.62]'
                  : 'hover:-translate-y-0.5 hover:brightness-110'
              }`}
            >
              <span className="shrink-0 text-base opacity-85">
                {revealed && isAnswer ? '\u2713' : revealed && isChosen ? '\u2717' : tile.shape}
              </span>
              <span className={opts === 'hanzi' ? 'text-xl font-bold' : ''}>
                {optionLabel(option)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex h-6 items-center gap-2.5 font-pinyin text-xs font-bold tabular-nums text-cn-muted dark:text-cn-muted-dark">
        <button
          onClick={() => {
            setConfirmingQuit(true);
            onPauseChange(true);
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cn-red text-white shadow-sm shadow-cn-red/30 transition-colors hover:bg-cn-red-dark"
          title="Quit quiz"
          aria-label="Quit quiz"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
        <span>
          {index + 1}/{total}
        </span>
        {locked ? (
          <button
            onClick={onNext}
            className="rounded-lg bg-cn-gold px-2 py-0.5 font-black tabular-nums text-cn-ink shadow-sm shadow-cn-gold/30 transition-colors hover:bg-cn-gold-light"
          >
            Next{revealing ? ` (${Math.ceil(revealLeft / 1000)})` : ''}&nbsp;&rarr;
          </button>
        ) : (
          <span className={fraction < 0.3 ? 'text-cn-red dark:text-cn-red-light' : ''}>
            {(msLeft / 1000).toFixed(1)}s
          </span>
        )}

        {/* Score on the right, with what the last answer earned beside it. */}
        <span className="ml-auto flex items-center gap-2">
          {locked && lastPoints > 0 && (
            <span className="font-black text-[#2E7D52] dark:text-[#6FBF95]">+{lastPoints}</span>
          )}
          {streak >= 2 && <span className="text-cn-gold">&#128293;{streak}</span>}
          <span className="font-black text-cn-ink dark:text-cn-cream">
            {totalPoints.toLocaleString()}
          </span>
        </span>
      </div>
    </div>
  );
}
