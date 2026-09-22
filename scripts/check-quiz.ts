/**
 * Sanity checks for the quiz engine, run against the real HSK data.
 *
 * The project has no test runner, so this follows the same pattern as
 * validate-chengyu.ts: a script you can run.
 *
 *   npm run check:quiz
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildQuestions, scoreAnswer, canQuiz, quizzableWords, OPTION_COUNT } from '../src/utils/quiz';
import type { VocabWord } from '../src/types';

const ROOT = resolve(import.meta.dirname, '..');
const all: VocabWord[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/hsk-all.json'), 'utf8')
);
const pool = all.filter((w) => w.hskLevel === 3);

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
};

check('canQuiz needs four words', !canQuiz(3) && canQuiz(4));

// Every option tile must have something written on it, and no question may
// have two defensible answers.
{
  const everything = buildQuestions(all, { count: 400, direction: 'hanzi-en', difficulty: 'hard', seconds: 10, revealSeconds: 3 });
  const blank = everything.flatMap((q) => q.options).filter((o) => !String(o.english ?? '').trim());
  check('no option is blank', blank.length === 0);
  const gloss = (w: VocabWord) => String(w.english ?? '').trim().toLowerCase();
  // Every option distinct from every other, not merely from the answer —
  // two distractors sharing a meaning is just as broken as one matching it.
  const ambiguous = everything.filter(
    (q) => new Set(q.options.map(gloss)).size !== q.options.length
  );
  check('no two options in a question mean the same thing', ambiguous.length === 0);
  if (ambiguous.length) {
    console.log('      e.g.', ambiguous[0].word.hanzi, '->', ambiguous[0].options.map((o) => o.english).join(' | '));
  }
  const particles = everything.filter((q) => ['啊', '呀', '哎', '嗯', '之'].includes(q.word.hanzi));
  check('particles are never asked', particles.length === 0);
  check('particles are never offered',
    everything.flatMap((q) => q.options).every((o) => !['啊', '呀', '哎', '嗯', '之'].includes(o.hanzi)));
  const dropped = all.length - quizzableWords(all).length;
  console.log(`      (${dropped} of ${all.length} words excluded as unquizzable)`);
}

for (const difficulty of ['normal', 'hard'] as const) {
  const qs = buildQuestions(pool, { count: 20, direction: 'hanzi-en', difficulty, seconds: 10, revealSeconds: 3 });
  check(`${difficulty}: builds the requested count`, qs.length === 20);
  check(`${difficulty}: every question has ${OPTION_COUNT} options`,
    qs.every((q) => q.options.length === OPTION_COUNT));
  check(`${difficulty}: the answer is among the options`,
    qs.every((q) => q.options.some((o) => o.id === q.word.id)));
  check(`${difficulty}: options are distinct`,
    qs.every((q) => new Set(q.options.map((o) => o.id)).size === OPTION_COUNT));
  check(`${difficulty}: no distractor repeats the answer's gloss`,
    qs.every((q) => q.options.filter((o) => o.english === q.word.english).length === 1));
  check(`${difficulty}: no question repeats`,
    new Set(qs.map((q) => q.word.id)).size === qs.length);
}

// Every direction must be free of options that are equally defensible: sharing
// a meaning when a meaning is asked, or a reading when a reading is.
for (const direction of ['hanzi-en', 'en-hanzi', 'hanzi-pinyin', 'pinyin-hanzi', 'audio-hanzi'] as const) {
  const qs = buildQuestions(all, { count: 300, direction, difficulty: 'hard', seconds: 10, revealSeconds: 3 });
  const key = (w: VocabWord) =>
    direction === 'hanzi-en' || direction === 'en-hanzi'
      ? String(w.english ?? '').trim().toLowerCase()
      : w.pinyin.toLowerCase().replace(/\s+/g, ' ').trim();
  const bad = qs.filter((q) => new Set(q.options.map(key)).size !== q.options.length);
  check(`${direction}: every option is distinguishable from the rest`, bad.length === 0);
  if (bad.length) {
    console.log('      e.g.', bad[0].word.hanzi, '->', bad[0].options.map((o) => `${o.hanzi}/${o.pinyin}`).join(', '));
  }
}

// The smallest legal deck must still fill every option slot. Built from
// quizzable words, since a deck of four particles is legitimately unquizzable.
const tiny = quizzableWords(pool).slice(0, 4);
const tq = buildQuestions(tiny, { count: 10, direction: 'en-hanzi', difficulty: 'hard', seconds: 5, revealSeconds: 3 });
check('a four-word deck yields four questions', tq.length === 4);
check('a deck of only particles is refused',
  buildQuestions(all.filter((w) => ['啊', '呀', '哎', '嗯', '之', '的'].includes(w.hanzi)),
    { count: 10, direction: 'hanzi-en', difficulty: 'normal', seconds: 10, revealSeconds: 3 }).length === 0);
check('a four-word deck still fills every slot',
  tq.every((q) => q.options.length === OPTION_COUNT));

check('a timeout scores nothing', scoreAnswer(0, 10_000, 3) === 0);
check('fast with a streak beats slow without',
  scoreAnswer(9_500, 10_000, 5) > scoreAnswer(500, 10_000, 0));
check('a perfect answer tops out at 300', scoreAnswer(10_000, 10_000, 99) === 300);
check('the streak multiplier is capped',
  scoreAnswer(10_000, 10_000, 5) === scoreAnswer(10_000, 10_000, 50));

// Hard mode is only worth having if its distractors are genuinely confusable.
const overlapRate = (difficulty: 'normal' | 'hard') => {
  const qs = buildQuestions(pool, { count: 200, direction: 'hanzi-en', difficulty, seconds: 10, revealSeconds: 3 });
  let shared = 0;
  let total = 0;
  for (const q of qs) {
    for (const o of q.options) {
      if (o.id === q.word.id) continue;
      total++;
      if ([...o.hanzi].some((c) => q.word.hanzi.includes(c))) shared++;
    }
  }
  return shared / total;
};
const normal = overlapRate('normal');
const hard = overlapRate('hard');
console.log(
  `\ndistractors sharing a character with the answer:  normal ${(normal * 100).toFixed(1)}%   hard ${(hard * 100).toFixed(1)}%`
);
check('hard mode is substantially more confusable', hard > normal * 2);

console.log(failures === 0 ? '\n✓ all checks passed\n' : `\n✖ ${failures} failed\n`);
process.exit(failures === 0 ? 0 : 1);
