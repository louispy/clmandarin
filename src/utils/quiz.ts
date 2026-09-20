import type { VocabWord } from '../types';
import { stripTones } from './vocab-loader';

/** What the prompt shows, and therefore what the four options are. */
export type QuizDirection = 'hanzi-en' | 'en-hanzi' | 'pinyin-hanzi' | 'audio-hanzi';
export type QuizDifficulty = 'normal' | 'hard';

export interface QuizConfig {
  count: number;
  direction: QuizDirection;
  difficulty: QuizDifficulty;
  /** Seconds allowed per question. */
  seconds: number;
}

export interface QuizQuestion {
  /** The correct answer. */
  word: VocabWord;
  /** Four words including the answer, already shuffled. */
  options: VocabWord[];
}

export const OPTION_COUNT = 4;

/** A deck smaller than this cannot produce a full set of distractors. */
export const MIN_QUIZ_WORDS = OPTION_COUNT;

export function canQuiz(wordCount: number): boolean {
  return wordCount >= MIN_QUIZ_WORDS;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Meaningful words in a gloss — "to", "a", "the" say nothing about similarity. */
function glossTokens(english: string): Set<string> {
  return new Set(
    english
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 3)
  );
}

function syllables(pinyin: string): Set<string> {
  return new Set(stripTones(pinyin.toLowerCase()).split(/\s+/).filter(Boolean));
}

/**
 * How easily a candidate could be mistaken for the answer.
 *
 * Four random glosses from the same deck are eliminable on vibes, which makes
 * the quiz a reading-speed test rather than a recall test. Distractors that
 * share a character, a pinyin syllable or a chunk of meaning are the mistakes
 * a learner would actually make.
 */
function confusability(answer: VocabWord, candidate: VocabWord): number {
  let score = 0;

  const answerChars = new Set([...answer.hanzi]);
  for (const c of candidate.hanzi) if (answerChars.has(c)) score += 3;

  const answerSyl = syllables(answer.pinyin);
  for (const s of syllables(candidate.pinyin)) if (answerSyl.has(s)) score += 2;

  const answerGloss = glossTokens(answer.english);
  for (const t of glossTokens(candidate.english)) if (answerGloss.has(t)) score += 2;

  return score;
}

function pickDistractors(
  answer: VocabWord,
  pool: VocabWord[],
  difficulty: QuizDifficulty
): VocabWord[] {
  const need = OPTION_COUNT - 1;
  const candidates = pool.filter(
    (w) => w.id !== answer.id && w.english !== answer.english
  );
  if (candidates.length <= need) return candidates;

  if (difficulty === 'normal') return shuffle(candidates).slice(0, need);

  // Hard: prefer confusable words, but keep some randomness so the same answer
  // doesn't always draw the same three distractors. Anything scoring zero is
  // shuffled in at the end, which also covers pools with no similar words.
  const scored = candidates
    .map((w) => ({ w, score: confusability(answer, w) }))
    .sort((a, b) => b.score - a.score);
  const similar = scored.filter((s) => s.score > 0).map((s) => s.w);
  const rest = shuffle(scored.filter((s) => s.score === 0).map((s) => s.w));
  const top = shuffle(similar.slice(0, need * 3)).slice(0, need);
  return [...top, ...rest].slice(0, need);
}

/**
 * Build a run. Questions are drawn without repeats; `count` is capped at the
 * number of words available.
 */
export function buildQuestions(words: VocabWord[], config: QuizConfig): QuizQuestion[] {
  if (!canQuiz(words.length)) return [];
  const picked = shuffle(words).slice(0, Math.min(config.count, words.length));
  return picked.map((word) => {
    const distractors = pickDistractors(word, words, config.difficulty);
    return { word, options: shuffle([word, ...distractors]) };
  });
}

export const STREAK_CAP = 5;

/**
 * Correct answers are worth a flat base plus a bonus for the time left and a
 * multiplier for the current streak. A flat point per correct answer would
 * make the timer decorative, and speed pressure is the whole difference
 * between this and a flashcard deck.
 */
export function scoreAnswer(msRemaining: number, msTotal: number, streak: number): number {
  if (msRemaining <= 0) return 0;
  const speed = Math.max(0, Math.min(1, msRemaining / msTotal));
  const base = 100 + Math.round(100 * speed);
  const multiplier = 1 + Math.min(streak, STREAK_CAP) * 0.1;
  return Math.round(base * multiplier);
}

/** What the prompt side shows for a direction. */
export function promptKind(direction: QuizDirection): 'hanzi' | 'english' | 'pinyin' | 'audio' {
  switch (direction) {
    case 'hanzi-en': return 'hanzi';
    case 'en-hanzi': return 'english';
    case 'pinyin-hanzi': return 'pinyin';
    case 'audio-hanzi': return 'audio';
  }
}

/** What the four option tiles show for a direction. */
export function optionKind(direction: QuizDirection): 'hanzi' | 'english' {
  return direction === 'hanzi-en' ? 'english' : 'hanzi';
}

export const DIRECTION_LABELS: Record<QuizDirection, string> = {
  'hanzi-en': '中 → EN',
  'en-hanzi': 'EN → 中',
  'pinyin-hanzi': 'Pinyin → 中',
  'audio-hanzi': '♪ → 中',
};

export const PROMPT_HINTS: Record<QuizDirection, string> = {
  'hanzi-en': 'What does this mean?',
  'en-hanzi': 'Which word is this?',
  'pinyin-hanzi': 'Which word is this?',
  'audio-hanzi': 'Which word did you hear?',
};
