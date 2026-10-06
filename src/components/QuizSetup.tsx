import { useState, useEffect, useRef } from 'react';
import type { QuizConfig, QuizDirection, QuizDifficulty } from '../utils/quiz';
import {
  COUNT_OPTIONS,
  DIRECTION_LABELS,
  MIN_QUIZ_WORDS,
  describeSelection,
  type QuizSource,
} from '../utils/quiz';
export type { QuizSource };

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
            value === o.value
              ? 'border-cn-red bg-cn-red text-white'
              : 'border-cn-border text-cn-muted hover:text-cn-ink dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
        {label}
      </p>
      {children}
    </div>
  );
}

export function QuizSetup({
  sources,
  selectedIds,
  onSelectionChange,
  config,
  onConfigChange,
  onStart,
}: {
  sources: QuizSource[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  config: QuizConfig;
  onConfigChange: (c: QuizConfig) => void;
  onStart: () => void;
}) {
  // Collapsed by default. Picking a deck and pressing start is the whole job;
  // four rows of toggles on arrival makes it look like a configuration screen.
  const [showOptions, setShowOptions] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const selected = sources.filter((s) => selectedIds.includes(s.id));
  // Decks can overlap — a list may hold HSK 3 words — so the real pool is the
  // union. This is the ceiling; the exact figure comes from the words themselves.
  const totalWords = selected.reduce((sum, s) => sum + s.count, 0);
  const tooSmall = selected.length > 0 && totalWords < MIN_QUIZ_WORDS;
  const maxCount = totalWords;
  const effectiveCount = Math.min(config.count, maxCount);

  // Fixed rungs rather than "All 600": nobody sits through six hundred
  // multiple-choice questions, and offering it makes the real choices look
  // like a compromise.
  const countOptions = COUNT_OPTIONS.filter((n) => n >= MIN_QUIZ_WORDS && n <= maxCount);
  if (countOptions.length === 0 && maxCount >= MIN_QUIZ_WORDS) countOptions.push(maxCount);

  const summary = [
    `${effectiveCount} questions`,
    DIRECTION_LABELS[config.direction],
    config.difficulty === 'hard' ? 'Hard' : 'Normal',
    `${config.seconds}s`,
    config.revealSeconds === null ? 'manual next' : `next in ${config.revealSeconds}s`,
  ].join(' · ');
  const effectiveCountValue = countOptions.includes(effectiveCount) ? effectiveCount : countOptions[0];

  return (
    <div className="flex flex-col gap-4 pt-1">
      <Field label="Decks">
        <div ref={pickerRef} className="relative">
          <button
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            className="flex w-full items-center gap-2 rounded-xl border border-cn-border bg-cn-surface py-3 pl-3.5 pr-3 text-left dark:border-cn-border-dark dark:bg-cn-surface-dark"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-cn-ink dark:text-cn-cream">
                {describeSelection(selected)}
              </span>
              <span className="block font-pinyin text-[11px] tabular-nums text-cn-muted dark:text-cn-muted-dark">
                {totalWords.toLocaleString()} words
              </span>
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-cn-muted transition-transform dark:text-cn-muted-dark ${pickerOpen ? 'rotate-180' : ''}`}
            >
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          {pickerOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[55vh] overflow-y-auto rounded-xl border border-cn-border bg-cn-surface p-1 shadow-xl dark:border-cn-border-dark dark:bg-cn-surface-dark">
              {['Built in', 'Your list'].map((group) => {
                const inGroup = sources.filter((s) => s.sublabel === group);
                if (inGroup.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 px-3 py-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
                        {group === 'Built in' ? 'Built-in decks' : 'Your lists'}
                      </p>
                      {group === 'Built in' && (
                        <button
                          onClick={() => onSelectionChange(
                            inGroup.every((s) => selectedIds.includes(s.id))
                              ? selectedIds.filter((id) => !inGroup.some((s) => s.id === id))
                              : [...new Set([...selectedIds, ...inGroup.map((s) => s.id)])]
                          )}
                          className="ml-auto text-xs font-bold text-cn-red hover:underline dark:text-cn-red-light"
                        >
                          {inGroup.every((s) => selectedIds.includes(s.id)) ? 'None' : 'All'}
                        </button>
                      )}
                    </div>
                    {inGroup.map((s) => {
                      const on = selectedIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => onSelectionChange(
                            on ? selectedIds.filter((id) => id !== s.id) : [...selectedIds, s.id]
                          )}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-cn-ink transition-colors hover:bg-cn-gold/10 dark:text-cn-cream dark:hover:bg-cn-gold/10"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-black ${
                              on
                                ? 'border-cn-red bg-cn-red text-white'
                                : 'border-cn-border dark:border-cn-border-dark'
                            }`}
                            aria-hidden="true"
                          >
                            {on ? '\u2713' : ''}
                          </span>
                          <span className="truncate">{s.name}</span>
                          <span className="ml-auto font-pinyin text-xs tabular-nums text-cn-muted dark:text-cn-muted-dark">
                            {s.count.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {tooSmall && (
          <p className="text-xs text-cn-red dark:text-cn-red-light">
            A quiz needs at least {MIN_QUIZ_WORDS} words — pick another deck as well.
          </p>
        )}
      </Field>

      <button
        onClick={onStart}
        disabled={selected.length === 0 || tooSmall}
        className="rounded-2xl bg-cn-red px-6 py-4 text-sm font-black text-white shadow-lg shadow-cn-red/25 transition-all hover:bg-cn-red-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        Start · {effectiveCount} questions
      </button>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowOptions((v) => !v)}
          aria-expanded={showOptions}
          className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-left text-xs font-bold text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 shrink-0 transition-transform ${showOptions ? 'rotate-90' : ''}`}
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
          </svg>
          Options
          {!showOptions && (
            <span className="truncate font-normal text-cn-muted dark:text-cn-muted-dark">
              {summary}
            </span>
          )}
        </button>

        {showOptions && (
          <div className="flex flex-col gap-5 rounded-2xl border border-cn-border px-3.5 py-4 dark:border-cn-border-dark">
            <Field label="Questions">
              <Segmented
                options={countOptions.map((n) => ({ value: n, label: String(n) }))}
                value={effectiveCountValue}
                onChange={(count) => onConfigChange({ ...config, count })}
              />
            </Field>

            <Field label="Direction">
              <div className="flex flex-col gap-1.5">
                {[
                  ['hanzi-en', 'en-hanzi'],
                  ['hanzi-pinyin', 'pinyin-hanzi'],
                  ['audio-hanzi'],
                ].map((row, i) => (
                  <Segmented
                    key={i}
                    options={(row as QuizDirection[]).map((d) => ({
                      value: d,
                      label: DIRECTION_LABELS[d],
                    }))}
                    value={config.direction}
                    onChange={(direction) => onConfigChange({ ...config, direction })}
                  />
                ))}
              </div>
            </Field>

            <Field label="Wrong answers">
              <Segmented
                options={[
                  { value: 'normal' as QuizDifficulty, label: 'Normal' },
                  { value: 'hard' as QuizDifficulty, label: 'Hard' },
                ]}
                value={config.difficulty}
                onChange={(difficulty) => onConfigChange({ ...config, difficulty })}
              />
              <p className="border-l-2 border-cn-gold pl-2.5 text-xs leading-relaxed text-cn-muted dark:text-cn-muted-dark">
                {config.difficulty === 'hard'
                  ? 'Wrong answers share a character, a pinyin syllable or a similar meaning — the mistakes you would actually make.'
                  : 'Wrong answers are picked at random from the same deck.'}
              </p>
            </Field>

            <Field label="Seconds per question">
              <Segmented
                options={[5, 10, 20].map((n) => ({ value: n, label: String(n) }))}
                value={config.seconds}
                onChange={(seconds) => onConfigChange({ ...config, seconds })}
              />
            </Field>

            <Field label="After answering">
              <Segmented
                options={[
                  { value: 1, label: 'Next in 1s' },
                  { value: 3, label: 'Next in 3s' },
                  { value: 0, label: 'I tap Next' },
                ]}
                value={config.revealSeconds ?? 0}
                onChange={(v) => onConfigChange({ ...config, revealSeconds: v === 0 ? null : v })}
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}
