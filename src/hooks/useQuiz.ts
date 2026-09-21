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
  count: 10,
  direction: 'hanzi-en',
  difficulty: 'hard',
  seconds: 10,
  revealSeconds: 3,
};

export function useQuiz() {
  const [phase, setPhase] = useState<QuizPhase>('setup');
  const [config, setConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);
  const [sourceName, setSourceName] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [msLeft, setMsLeft] = useState(0);
  const [locked, setLocked] = useState<{ chosenId: string | null } | null>(null);
  /** Time left on the pause after answering, so the UI can show it running out. */
  const [revealLeft, setRevealLeft] = useState(0);
  // The old window.confirm on quit froze the countdown by blocking the thread.
  // An in-app confirmation has to stop it deliberately, or deciding whether to
  // quit costs the user the question.
  const [paused, setPaused] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  // The loop reads these through refs so it never needs re-creating mid-run.
  const msLeftRef = useRef(0);
  const lockedRef = useRef(false);
  const pausedRef = useRef(false);
  const revealLeftRef = useRef(0);

  const totalMs = config.seconds * 1000;
  const revealTotalMs = (config.revealSeconds ?? 0) * 1000;
  // Held in a ref so the pause started inside commit() uses the value in force
  // when the answer was given.
  const revealRef = useRef<number | null>(config.revealSeconds);
  useEffect(() => {
    revealRef.current = config.revealSeconds;
  }, [config.revealSeconds]);

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const setLeft = useCallback((ms: number) => {
    msLeftRef.current = ms;
    setMsLeft(ms);
  }, []);

  const setReveal = useCallback((ms: number) => {
    revealLeftRef.current = ms;
    setRevealLeft(ms);
  }, []);

  // Mirrors of state the timer loop and commit() read. Using refs rather than
  // reading through a state updater matters: an updater with side effects in
  // it is invoked twice under StrictMode, which would record every answer
  // twice.
  const questionsRef = useRef<QuizQuestion[]>([]);
  const indexRef = useRef(0);
  const answersRef = useRef<QuizAnswer[]>([]);

  /** Move to the next question, or finish. Safe to call twice. */
  const advance = useCallback(() => {
    if (!lockedRef.current) return;
    lockedRef.current = false;
    setLocked(null);
    setReveal(0);
    const next = indexRef.current + 1;
    if (next >= questionsRef.current.length) {
      setPhase('results');
      return;
    }
    indexRef.current = next;
    setIndex(next);
    setLeft(totalMs);
  }, [totalMs, setLeft, setReveal]);

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

      // Null reveal means the user decides when to move on; otherwise the
      // countdown below runs it down so the wait is visible rather than a
      // blind setTimeout.
      setReveal(revealRef.current === null ? 0 : revealRef.current * 1000);
    },
    [totalMs, setReveal]
  );

  // The timer loop calls these without depending on them, so the effects below
  // keep the refs pointing at the current closures.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);
  const advanceFnRef = useRef<() => void>(() => {});
  useEffect(() => {
    advanceFnRef.current = advance;
  }, [advance]);

  // The countdown. Driven from performance.now() deltas rather than
  // accumulating setInterval ticks, which drift. Pauses while the browser tab
  // is hidden: a notification mid-question should not cost the user the point.
  useEffect(() => {
    if (phase !== 'running') return;

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (document.hidden || pausedRef.current) {
        lastRef.current = now;
        return;
      }
      if (lastRef.current === null) {
        lastRef.current = now;
        return;
      }
      const dt = now - lastRef.current;
      lastRef.current = now;

      // While the answer is on screen the question clock is stopped and this
      // runs the pause down instead. A null reveal waits for the user.
      if (lockedRef.current) {
        if (revealRef.current === null) return;
        const remaining = revealLeftRef.current - dt;
        if (remaining <= 0) {
          setReveal(0);
          advanceFnRef.current();
          return;
        }
        setReveal(remaining);
        return;
      }

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
  }, [phase, setLeft, setReveal]);

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
      setReveal(0);
      pausedRef.current = false;
      setPaused(false);
      setPhase('running');
      return true;
    },
    [clearTimers, setLeft, setReveal]
  );

  const quit = useCallback(() => {
    clearTimers();
    lockedRef.current = false;
    setLocked(null);
    setPhase('setup');
  }, [clearTimers]);

  const answer = useCallback((wordId: string) => commitRef.current(wordId), []);

  const pause = useCallback((next: boolean) => {
    pausedRef.current = next;
    setPaused(next);
  }, []);

  const question = questions[index] ?? null;
  const totalPoints = answers.reduce((sum, a) => sum + a.points, 0);
  /** What the most recent answer was worth, for the +N on screen. */
  const lastPoints = answers.length ? answers[answers.length - 1].points : 0;
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
    revealLeft,
    revealTotalMs,
    locked,
    paused,
    pause,
    next: advance,
    answers,
    totalPoints,
    lastPoints,
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
