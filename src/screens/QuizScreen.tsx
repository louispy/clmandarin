import { useState, useMemo, useCallback, useRef } from 'react';
import type { useDecks } from '../hooks/useDecks';
import type { useLists } from '../hooks/useLists';
import type { Script } from '../hooks/useScript';
import { useQuiz, type QuizSummary } from '../hooks/useQuiz';
import { QuizSetup } from '../components/QuizSetup';
import { QuizRun } from '../components/QuizRun';
import { QuizResults } from '../components/QuizResults';
import { getWordsByIds } from '../utils/vocab-loader';
import { quizzableWords, describeSelection, MIN_QUIZ_WORDS, type QuizSource } from '../utils/quiz';
import { recordRun, type QuizRecord } from '../utils/quiz-record';

const SOURCE_KEY = 'clm-quiz-source';

function loadSourceIds(): string[] {
  try {
    const raw = localStorage.getItem(SOURCE_KEY);
    if (!raw) return [];
    // Older builds stored a single id as a bare string.
    const parsed: unknown = raw.startsWith('[') ? JSON.parse(raw) : [raw];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function QuizScreen({
  decks,
  lists,
  script,
}: {
  decks: ReturnType<typeof useDecks>;
  lists: ReturnType<typeof useLists>;
  script: Script;
}) {
  const [outcome, setOutcome] = useState<{ previous: QuizRecord | null; isBest: boolean; isFirst: boolean } | null>(null);
  // Set from useQuiz's finish callback rather than an effect watching the
  // phase, so the write happens once on the event that caused it.
  const sourceIdRef = useRef<string | null>(null);
  const quiz = useQuiz({
    onFinish: useCallback((summary: QuizSummary) => {
      setOutcome(recordRun(sourceIdRef.current, summary));
    }, []),
  });
  const [sourceIds, setSourceIds] = useState<string[]>(loadSourceIds);
  // Set when a deck turns out to have too few words that work as questions.
  const [tooFew, setTooFew] = useState(false);

  const sources = useMemo<QuizSource[]>(() => {
    const fromDecks = decks.decks
      .filter((d) => d.wordIds.length > 0)
      .map((d) => ({ id: d.id, name: d.name, sublabel: 'Built in', count: d.wordIds.length, level: d.level }));
    const fromLists = lists.lists
      .filter((l) => l.wordIds.length > 0)
      .map((l) => ({ id: l.id, name: l.name, sublabel: 'Your list', count: l.wordIds.length, level: 0 }));
    return [...fromDecks, ...fromLists];
  }, [decks.decks, lists.lists]);

  // Remembered decks may since have been deleted, so drop anything that no
  // longer exists and fall back to the first available rather than an empty
  // picker.
  const validIds = sourceIds.filter((id) => sources.some((s) => s.id === id));
  const activeIds = validIds.length > 0 ? validIds : sources.slice(0, 1).map((s) => s.id);
  const selected = sources.filter((s) => activeIds.includes(s.id));

  const chooseSources = useCallback((ids: string[]) => {
    setSourceIds(ids);
    setTooFew(false);
    try {
      localStorage.setItem(SOURCE_KEY, JSON.stringify(ids));
    } catch {
      // Private browsing throws; the picker still works for this session.
    }
  }, []);

  /** Word ids across every chosen deck, de-duplicated — decks can overlap. */
  const wordIdsFor = useCallback(
    (ids: string[]): string[] => {
      const out = new Set<string>();
      for (const id of ids) {
        const from =
          decks.decks.find((d) => d.id === id)?.wordIds ??
          lists.lists.find((l) => l.id === id)?.wordIds ??
          [];
        for (const wordId of from) out.add(wordId);
      }
      return [...out];
    },
    [decks.decks, lists.lists]
  );

  const handleStart = useCallback(async () => {
    if (selected.length === 0) return;
    // Bests are keyed on the whole selection, so replaying the same combination
    // builds a record while a different one simply starts its own.
    sourceIdRef.current = [...activeIds].sort().join('+');
    setOutcome(null);
    const words = await getWordsByIds(wordIdsFor(activeIds));
    // The deck's size counts every word; the quiz can only use the ones that
    // carry a meaning worth choosing between, so a small deck can still come
    // up short here.
    const usable = quizzableWords(words);
    const started = quiz.start(
      usable,
      { ...quiz.config, count: Math.min(quiz.config.count, usable.length) },
      describeSelection(selected)
    );
    setTooFew(!started);
  }, [selected, activeIds, wordIdsFor, quiz]);

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
        totalPoints={quiz.totalPoints}
        lastPoints={quiz.lastPoints}
        script={script}
        onAnswer={quiz.answer}
        onNext={quiz.next}
        onTogglePinyin={() => quiz.setConfig({ ...quiz.config, showPinyin: !quiz.config.showPinyin })}
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
        outcome={outcome}
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
        selectedIds={activeIds}
        onSelectionChange={chooseSources}
        config={quiz.config}
        onConfigChange={quiz.setConfig}
        onStart={handleStart}
      />
    </>
  );
}
