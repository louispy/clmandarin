import { useState, useRef, useCallback, useEffect } from 'react';
import type { VocabWord } from '../types';
import {
  buildQuestions,
  scoreAnswer,
  canQuiz,
  type QuizConfig,
  type QuizQuestion,
} from '../utils/quiz';

export type QuizPhase = 'setup' | 'running' | 'results';

export interface QuizAnswer {
  word: VocabWord;
  /** null when the timer ran out. */
  chosenId: string | null;
  correct: boolean;
  /** Milliseconds taken; equal to the limit on a timeout. */
  ms: number;
  points: number;
}

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  count: 20,
  direction: 'hanzi-en',
  difficulty: 'hard',
  seconds: 10,
};

/** How long the right/wrong colours stay up before the next question. */
const FEEDBACK_MS = 900;

export function useQuiz() {
  const [phase, setPhase] = useState<QuizPhase>('setup');
  const [config, setConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);
  const [sourceName, setSourceName] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [msLeft, setMsLeft] = useState(0);
  const [locked, setLocked] = useState<{ chosenId: string | null } | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The loop reads these through refs so it never needs re-creating mid-run.
  const msLeftRef = useRef(0);
  const lockedRef = useRef(false);

  const totalMs = config.seconds * 1000;

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (advanceRef.current !== null) clearTimeout(advanceRef.current);
    rafRef.current = null;
    advanceRef.current = null;
    lastRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const setLeft = useCallback((ms: number) => {
    msLeftRef.current = ms;
    setMsLeft(ms);
  }, []);

  // Mirrors of state the timer loop and commit() read. Using refs rather than
  // reading through a state updater matters: an updater with side effects in
  // it is invoked twice under StrictMode, which would record every answer
  // twice.
  const questionsRef = useRef<QuizQuestion[]>([]);
  const indexRef = useRef(0);
  const answersRef = useRef<QuizAnswer[]>([]);

  // Lock in an answer. `chosenId` is null when the timer expired.
  const commit = useCallback(
    (chosenId: string | null) => {
      if (lockedRef.current) return;
      const q = questionsRef.current[indexRef.current];
      if (!q) return;

      lockedRef.current = true;
      setLocked({ chosenId });

      const correct = chosenId === q.word.id;
      const remaining = Math.max(0, msLeftRef.current);
      const streak = countTrailingCorrect(answersRef.current);
      const entry: QuizAnswer = {
        word: q.word,
        chosenId,
        correct,
        ms: totalMs - remaining,
        points: correct ? scoreAnswer(remaining, totalMs, streak) : 0,
      };
      answersRef.current = [...answersRef.current, entry];
      setAnswers(answersRef.current);

      advanceRef.current = setTimeout(() => {
        lockedRef.current = false;
        setLocked(null);
        const next = indexRef.current + 1;
        if (next >= questionsRef.current.length) {
          setPhase('results');
          return;
        }
        indexRef.current = next;
        setIndex(next);
        setLeft(totalMs);
      }, FEEDBACK_MS);
    },
    [totalMs, setLeft]
  );

  // The timer loop calls commit without depending on it, so the effect below
  // keeps the ref pointing at the current closure.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  // The countdown. Driven from performance.now() deltas rather than
  // accumulating setInterval ticks, which drift. Pauses while the browser tab
  // is hidden: a notification mid-question should not cost the user the point.
  useEffect(() => {
    if (phase !== 'running') return;

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (document.hidden || lockedRef.current) {
        lastRef.current = now;
        return;
      }
      if (lastRef.current === null) {
        lastRef.current = now;
        return;
      }
      const dt = now - lastRef.current;
      lastRef.current = now;
      const next = msLeftRef.current - dt;
      if (next <= 0) {
        setLeft(0);
        commitRef.current(null);
        return;
      }
      setLeft(next);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastRef.current = null;
    };
  }, [phase, setLeft]);

  const start = useCallback(
    (words: VocabWord[], nextConfig: QuizConfig, label: string) => {
      if (!canQuiz(words.length)) return false;
      clearTimers();
      const built = buildQuestions(words, nextConfig);
      if (built.length === 0) return false;
      setConfig(nextConfig);
      setSourceName(label);
      setQuestions(built);
      questionsRef.current = built;
      setAnswers([]);
      answersRef.current = [];
      setIndex(0);
      indexRef.current = 0;
      setLocked(null);
      lockedRef.current = false;
      setLeft(nextConfig.seconds * 1000);
      setPhase('running');
      return true;
    },
    [clearTimers, setLeft]
  );

  const quit = useCallback(() => {
    clearTimers();
    lockedRef.current = false;
    setLocked(null);
    setPhase('setup');
  }, [clearTimers]);

  const answer = useCallback((wordId: string) => commitRef.current(wordId), []);

  const question = questions[index] ?? null;
  const totalPoints = answers.reduce((sum, a) => sum + a.points, 0);
  const correctCount = answers.filter((a) => a.correct).length;
  const missed = answers.filter((a) => !a.correct);

  return {
    phase,
    config,
    setConfig,
    sourceName,
    question,
    index,
    total: questions.length,
    msLeft,
    totalMs,
    locked,
    answers,
    totalPoints,
    correctCount,
    missed,
    streak: countTrailingCorrect(answers),
    bestStreak: bestRun(answers),
    start,
    answer,
    quit,
  };
}

function countTrailingCorrect(answers: QuizAnswer[]): number {
  let n = 0;
  for (let i = answers.length - 1; i >= 0 && answers[i].correct; i--) n++;
  return n;
}

function bestRun(answers: QuizAnswer[]): number {
  let best = 0;
  let run = 0;
  for (const a of answers) {
    run = a.correct ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}
