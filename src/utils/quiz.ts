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
  /**
   * How long the answer stays on screen before the next question, or null to
   * wait for the user to press Next.
   */
  revealSeconds: number | null;
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

/**
 * Particles and interjections, which make hopeless multiple-choice questions:
 * there is no meaning to pick out of four options. Listed by character rather
 * than detected from the gloss, because a gloss-based rule would also catch
 * 井 ("well", the noun) along with 嗯 ("Well", the noise).
 *
 * The purely grammatical ones (的, 了, 吗, 呢, 得, 着, 过, 吧, 地, 啦, 嘛, 嘿)
 * already have an empty gloss in the source data and are excluded by that.
 */
const UNQUIZZABLE = new Set([
  '啊', '呀', '哎', '哦', '嗯', '唉', '哇', '哼', '呵', '哈', '喂（叹词）', '之',
]);

/** Normalised gloss, for comparing two words' meanings. */
function glossKey(word: VocabWord): string {
  return String(word.english ?? '').trim().toLowerCase();
}

/**
 * Whether a word can carry a question or a distractor.
 *
 * Excludes words the scraper left without a gloss — 15 of them, all
 * grammatical particles — which would otherwise render as a blank answer tile.
 */
export function isQuizzable(word: VocabWord): boolean {
  return glossKey(word).length > 0 && !UNQUIZZABLE.has(word.hanzi);
}

export function quizzableWords(words: VocabWord[]): VocabWord[] {
  return words.filter(isQuizzable);
}

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
  // Compare glosses normalised. A third of the vocabulary shares a gloss with
  // at least one other word (情况 / 形势 / 局面 are all "situation"), and 326
  // pairs differ only by capitalisation — an exact match would let "How" in as
  // a distractor for "how", giving the question two right answers.
  const answerGloss = glossKey(answer);
  const candidates = pool.filter(
    (w) => w.id !== answer.id && glossKey(w) !== answerGloss
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
  const pool = quizzableWords(words);
  if (!canQuiz(pool.length)) return [];
  const picked = shuffle(pool).slice(0, Math.min(config.count, pool.length));
  return picked.map((word) => {
    const distractors = pickDistractors(word, pool, config.difficulty);
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

/**
 * A gloss as it should appear on screen.
 *
 * The source data is inconsistent about capitalisation — "If" and "ah" and
 * "Be quiet" all sit in the same deck — which made four answer tiles look
 * arbitrary.
 *
 * Leading punctuation is skipped so "(for books)" capitalises inside its
 * bracket, but a leading digit is not, so "100 percent" is left alone. Nothing
 * past the first letter is touched, which keeps "I, me" and "we, us (pl.)"
 * intact.
 */
export function displayGloss(english: string): string {
  const text = String(english ?? '').trim();
  const i = text.search(/\p{L}/u);
  if (i === -1) return text;
  // Only a run of punctuation may precede the letter we capitalise.
  if (/[\p{N}]/u.test(text.slice(0, i))) return text;
  return text.slice(0, i) + text[i].toUpperCase() + text.slice(i + 1);
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
