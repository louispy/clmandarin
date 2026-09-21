import { useState, useMemo, useCallback } from 'react';
import type { useDecks } from '../hooks/useDecks';
import type { useLists } from '../hooks/useLists';
import type { Script } from '../hooks/useScript';
import { useQuiz } from '../hooks/useQuiz';
import { QuizSetup, type QuizSource } from '../components/QuizSetup';
import { QuizRun } from '../components/QuizRun';
import { QuizResults } from '../components/QuizResults';
import { getWordsByIds } from '../utils/vocab-loader';
import { quizzableWords, MIN_QUIZ_WORDS } from '../utils/quiz';

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
  // Set when a deck turns out to have too few words that work as questions.
  const [tooFew, setTooFew] = useState(false);

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
    // The deck's size counts every word; the quiz can only use the ones that
    // carry a meaning worth choosing between, so a small deck can still come
    // up short here.
    const usable = quizzableWords(words);
    const started = quiz.start(
      usable,
      { ...quiz.config, count: Math.min(quiz.config.count, usable.length) },
      selected.name
    );
    setTooFew(!started);
  }, [selected, wordIdsFor, quiz]);

  const missedIds = quiz.missed.map((a) => a.word.id);

  const handleAddMissedToList = useCallback(
    async (listId: string) => {
      await lists.addWordsToList(listId, missedIds);
    },
    [lists, missedIds]
  );

  const handleCreateListWithMissed = useCallback(
    async (name: string) => {
      const list = await lists.createList(name);
      await lists.addWordsToList(list.id, missedIds);
    },
    [lists, missedIds]
  );


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
        revealLeft={quiz.revealLeft}
        revealTotalMs={quiz.revealTotalMs}
        locked={quiz.locked}
        streak={quiz.streak}
        script={script}
        onAnswer={quiz.answer}
        onNext={quiz.next}
        onQuit={quiz.quit}
        onPauseChange={quiz.pause}
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
        lists={lists.lists}
        onAddMissedToList={handleAddMissedToList}
        onCreateListWithMissed={handleCreateListWithMissed}
        onPlayAgain={handleStart}
        onBackToSetup={quiz.quit}
      />
    );
  }

  return (
    <>
      {tooFew && (
        <p className="mb-3 rounded-xl border-l-2 border-cn-red bg-cn-red/5 px-3 py-2 text-xs text-cn-red dark:text-cn-red-light">
          This deck doesn&rsquo;t have {MIN_QUIZ_WORDS} words that work as questions — particles
          like 的 and 吗 have no meaning to choose between. Pick a bigger deck.
        </p>
      )}
      <QuizSetup
        sources={sources}
        sourceId={selected?.id ?? null}
        onSourceChange={(id) => { setSourceId(id); setTooFew(false); }}
        config={quiz.config}
        onConfigChange={quiz.setConfig}
        onStart={handleStart}
      />
    </>
  );
}
