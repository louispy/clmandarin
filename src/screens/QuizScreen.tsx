import { useState, useMemo, useCallback } from 'react';
import type { useDecks } from '../hooks/useDecks';
import type { useLists } from '../hooks/useLists';
import type { Script } from '../hooks/useScript';
import { useQuiz } from '../hooks/useQuiz';
import { QuizSetup, type QuizSource } from '../components/QuizSetup';
import { QuizRun } from '../components/QuizRun';
import { QuizResults } from '../components/QuizResults';
import { getWordsByIds } from '../utils/vocab-loader';

export function QuizScreen({
  decks,
  lists,
  script,
}: {
  decks: ReturnType<typeof useDecks>;
  lists: ReturnType<typeof useLists>;
  script: Script;
}) {
  const quiz = useQuiz();
  const [sourceId, setSourceId] = useState<string | null>(null);

  const sources = useMemo<QuizSource[]>(() => {
    const fromDecks = decks.decks
      .filter((d) => d.wordIds.length > 0)
      .map((d) => ({ id: d.id, name: d.name, sublabel: 'Built in', count: d.wordIds.length }));
    const fromLists = lists.lists
      .filter((l) => l.wordIds.length > 0)
      .map((l) => ({ id: l.id, name: l.name, sublabel: 'Your list', count: l.wordIds.length }));
    return [...fromDecks, ...fromLists];
  }, [decks.decks, lists.lists]);

  const selected = sources.find((s) => s.id === sourceId) ?? sources[0] ?? null;

  const wordIdsFor = useCallback(
    (id: string): string[] =>
      decks.decks.find((d) => d.id === id)?.wordIds ??
      lists.lists.find((l) => l.id === id)?.wordIds ??
      [],
    [decks.decks, lists.lists]
  );

  const handleStart = useCallback(async () => {
    if (!selected) return;
    const words = await getWordsByIds(wordIdsFor(selected.id));
    quiz.start(words, { ...quiz.config, count: Math.min(quiz.config.count, words.length) }, selected.name);
  }, [selected, wordIdsFor, quiz]);

  const missedIds = quiz.missed.map((a) => a.word.id);

  const handleAddMissedToFavorites = useCallback(async () => {
    await lists.addWordsToList(lists.FAVORITES_ID, missedIds);
  }, [lists, missedIds]);

  const handleSaveMissedAsList = useCallback(async () => {
    const stamp = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const list = await lists.createList(`${quiz.sourceName} misses · ${stamp}`);
    await lists.addWordsToList(list.id, missedIds);
  }, [lists, missedIds, quiz.sourceName]);

  const handleQuit = useCallback(() => {
    if (quiz.index > 0 && !window.confirm('Quit this quiz? Your score will be lost.')) return;
    quiz.quit();
  }, [quiz]);

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-cn-border px-6 py-16 text-center dark:border-cn-border-dark">
        <span className="text-4xl">&#9889;</span>
        <p className="font-bold text-cn-ink dark:text-cn-cream">Nothing to quiz yet</p>
        <p className="max-w-sm text-sm text-cn-muted dark:text-cn-muted-dark">
          Vocabulary is still loading. Once it is ready, every HSK deck and every list you make
          can be quizzed.
        </p>
      </div>
    );
  }

  if (quiz.phase === 'running' && quiz.question) {
    return (
      <QuizRun
        question={quiz.question}
        config={quiz.config}
        index={quiz.index}
        total={quiz.total}
        msLeft={quiz.msLeft}
        totalMs={quiz.totalMs}
        locked={quiz.locked}
        streak={quiz.streak}
        script={script}
        onAnswer={quiz.answer}
        onQuit={handleQuit}
      />
    );
  }

  if (quiz.phase === 'results') {
    return (
      <QuizResults
        sourceName={quiz.sourceName}
        answers={quiz.answers}
        missed={quiz.missed}
        totalPoints={quiz.totalPoints}
        correctCount={quiz.correctCount}
        bestStreak={quiz.bestStreak}
        script={script}
        onAddMissedToFavorites={handleAddMissedToFavorites}
        onSaveMissedAsList={handleSaveMissedAsList}
        onPlayAgain={handleStart}
        onBackToSetup={quiz.quit}
      />
    );
  }

  return (
    <QuizSetup
      sources={sources}
      sourceId={selected?.id ?? null}
      onSourceChange={setSourceId}
      config={quiz.config}
      onConfigChange={quiz.setConfig}
      onStart={handleStart}
    />
  );
}
