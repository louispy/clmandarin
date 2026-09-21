import { useEffect, useState } from 'react';
import type { VocabWord } from '../types';
import { displayHanzi, type Script } from '../hooks/useScript';
import { speak } from '../utils/speech';
import { optionKind, promptKind, PROMPT_HINTS, type QuizConfig, type QuizQuestion } from '../utils/quiz';
import { ConfirmModal } from './ConfirmModal';

// Kahoot's four shapes. The shape matters as much as the colour: it keeps the
// tiles distinguishable for anyone who can't separate red from green.
const TILES = [
  { shape: '▲', bg: 'bg-[#C41E3A]' },
  { shape: '◆', bg: 'bg-[#1F6FA8]' },
  { shape: '●', bg: 'bg-[#B8860B]' },
  { shape: '■', bg: 'bg-[#2E7D52]' },
];

export function QuizRun({
  question,
  config,
  index,
  total,
  msLeft,
  totalMs,
  locked,
  streak,
  script,
  onAnswer,
  onQuit,
  onPauseChange,
}: {
  question: QuizQuestion;
  config: QuizConfig;
  index: number;
  total: number;
  msLeft: number;
  totalMs: number;
  locked: { chosenId: string | null } | null;
  streak: number;
  script: Script;
  onAnswer: (wordId: string) => void;
  onQuit: () => void;
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
    opts === 'hanzi' ? displayHanzi(w, script) : w.english;

  const fraction = Math.max(0, Math.min(1, msLeft / totalMs));

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
          className={`h-full rounded-full transition-colors ${fraction < 0.3 ? 'bg-cn-red' : 'bg-cn-gold'}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-3 font-pinyin text-xs font-bold tabular-nums text-cn-muted dark:text-cn-muted-dark">
        <button
          onClick={() => {
            setConfirmingQuit(true);
            onPauseChange(true);
          }}
          className="text-cn-red hover:underline dark:text-cn-red-light"
        >
          Quit
        </button>
        <span>
          {index + 1} / {total}
        </span>
        <span className={fraction < 0.3 ? 'text-cn-red dark:text-cn-red-light' : ''}>
          {(msLeft / 1000).toFixed(1)}s
        </span>
        {streak >= 2 && <span className="ml-auto text-cn-gold">&#128293; {streak}</span>}
      </div>

      <div className="flex min-h-[9rem] flex-col items-center justify-center gap-2 rounded-2xl border border-cn-border bg-cn-surface px-4 py-6 text-center dark:border-cn-border-dark dark:bg-cn-surface-dark">
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
            {question.word.english}
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
      </div>

      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option, i) => {
          const tile = TILES[i % TILES.length];
          const isAnswer = option.id === question.word.id;
          const revealed = locked !== null;
          return (
            <button
              key={option.id}
              onClick={() => onAnswer(option.id)}
              disabled={revealed}
              className={`flex min-h-[4.75rem] items-center gap-2.5 rounded-2xl px-3 py-4 text-left text-sm font-black text-white transition-all ${tile.bg} ${
                revealed
                  ? isAnswer
                    ? 'outline outline-[3px] outline-offset-2 outline-cn-gold-light'
                    : 'saturate-[0.25] brightness-[0.62]'
                  : 'hover:-translate-y-0.5 hover:brightness-110'
              }`}
            >
              <span className="shrink-0 text-base opacity-85">{tile.shape}</span>
              <span className={opts === 'hanzi' ? 'text-xl font-bold' : ''}>
                {optionLabel(option)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
