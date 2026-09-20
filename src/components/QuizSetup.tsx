import type { QuizConfig, QuizDirection, QuizDifficulty } from '../utils/quiz';
import { DIRECTION_LABELS, MIN_QUIZ_WORDS } from '../utils/quiz';

export interface QuizSource {
  id: string;
  name: string;
  sublabel: string;
  count: number;
}

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
  sourceId,
  onSourceChange,
  config,
  onConfigChange,
  onStart,
}: {
  sources: QuizSource[];
  sourceId: string | null;
  onSourceChange: (id: string) => void;
  config: QuizConfig;
  onConfigChange: (c: QuizConfig) => void;
  onStart: () => void;
}) {
  const source = sources.find((s) => s.id === sourceId) ?? null;
  const tooSmall = !!source && source.count < MIN_QUIZ_WORDS;
  const maxCount = source ? source.count : 0;

  const countOptions = [10, 20, maxCount].filter(
    (n, i, arr) => n >= MIN_QUIZ_WORDS && arr.indexOf(n) === i && n <= maxCount
  );

  return (
    <div className="flex flex-col gap-5 pt-1">
      <Field label="Deck">
        <select
          value={sourceId ?? ''}
          onChange={(e) => onSourceChange(e.target.value)}
          className="w-full rounded-xl border border-cn-border bg-cn-surface px-3 py-3 text-sm font-bold text-cn-ink outline-none dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream"
        >
          {['Built in', 'Your list'].map((group) => {
            const inGroup = sources.filter((s) => s.sublabel === group);
            if (inGroup.length === 0) return null;
            return (
              <optgroup key={group} label={group === 'Built in' ? 'Built-in decks' : 'Your lists'}>
                {inGroup.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.count < MIN_QUIZ_WORDS}>
                    {s.name} — {s.count.toLocaleString()} words
                    {s.count < MIN_QUIZ_WORDS ? ' (too few)' : ''}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        {tooSmall && (
          <p className="text-xs text-cn-red dark:text-cn-red-light">
            A quiz needs at least {MIN_QUIZ_WORDS} words — there aren&rsquo;t enough here to build
            four answers to choose from.
          </p>
        )}
      </Field>

      <Field label="Questions">
        <Segmented
          options={countOptions.map((n) => ({
            value: n,
            label: n === maxCount && n !== 10 && n !== 20 ? `All ${n}` : String(n),
          }))}
          value={Math.min(config.count, maxCount)}
          onChange={(count) => onConfigChange({ ...config, count })}
        />
      </Field>

      <Field label="Direction">
        <div className="flex flex-col gap-1.5">
          <Segmented
            options={(['hanzi-en', 'en-hanzi'] as QuizDirection[]).map((d) => ({
              value: d,
              label: DIRECTION_LABELS[d],
            }))}
            value={config.direction}
            onChange={(direction) => onConfigChange({ ...config, direction })}
          />
          <Segmented
            options={(['pinyin-hanzi', 'audio-hanzi'] as QuizDirection[]).map((d) => ({
              value: d,
              label: DIRECTION_LABELS[d],
            }))}
            value={config.direction}
            onChange={(direction) => onConfigChange({ ...config, direction })}
          />
        </div>
      </Field>

      <Field label="Distractors">
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

      <button
        onClick={onStart}
        disabled={!source || tooSmall}
        className="rounded-2xl bg-cn-red px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-cn-red/25 transition-all hover:bg-cn-red-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        Start · {Math.min(config.count, maxCount)} questions
      </button>
    </div>
  );
}
