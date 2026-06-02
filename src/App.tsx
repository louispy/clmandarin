import { useState, useCallback, useRef, useEffect } from 'react';
import { useVocab } from './hooks/useVocab';
import { useLists } from './hooks/useLists';
import { useDarkMode } from './hooks/useDarkMode';
import { useVisibility } from './hooks/useVisibility';
import { useScript } from './hooks/useScript';
import { useReverse } from './hooks/useReverse';
import { VocabBrowser } from './components/VocabBrowser';
import { FlashcardManager } from './components/FlashcardManager';
import { SortableWordList } from './components/SortableWordList';
import { FlashcardViewer } from './components/FlashcardViewer';
import { ImportShareModal } from './components/ImportShareModal';
import { exportList } from './utils/import-export';
import { isSharingConfigured } from './utils/share';
import { getWordsByIds } from './utils/vocab-loader';
import { db } from './db';
import type { VocabWord } from './types';

type View = 'browse' | 'flashcards';

export function App() {
  const vocab = useVocab();
  const listsHook = useLists();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { visibility, toggle: toggleVisibility } = useVisibility();
  const { script, toggle: toggleScript } = useScript();
  const { reverse, toggle: toggleReverse } = useReverse();
  const [view, setView] = useState<View>('browse');
  const [studyWords, setStudyWords] = useState<VocabWord[] | null>(null);
  const [studyListName, setStudyListName] = useState('');
  const [studyStartIndex, setStudyStartIndex] = useState<number | undefined>(undefined);
  const [shareCode, setShareCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('share');
  });
  const scrollPosRef = useRef(0);

  // Strip the ?share= from the URL once we've captured it so a refresh doesn't
  // re-trigger the import prompt, but keep everything else (e.g. PWA scope).
  useEffect(() => {
    if (!shareCode) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('share')) {
      url.searchParams.delete('share');
      window.history.replaceState({}, '', url.toString());
    }
  }, [shareCode]);

  // Switching tabs reuses the same scroll container, so the previous view's
  // scroll position leaks through. Force the top after the new view mounts.
  const navigateTo = useCallback((next: View) => {
    setView(next);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, []);

  const handleAddToList = useCallback(
    (listId: string, wordId: string) => {
      listsHook.addWordsToList(listId, [wordId]);
    },
    [listsHook]
  );

  const handleCreateListAndAdd = useCallback(
    async (name: string, wordId: string) => {
      const list = await listsHook.createList(name);
      await listsHook.addWordsToList(list.id, [wordId]);
    },
    [listsHook]
  );

  // Add currently filtered/displayed words to an existing list
  const handleAddFiltered = useCallback(
    (listId: string) => {
      listsHook.addWordsToList(listId, vocab.words.map((w) => w.id));
    },
    [listsHook, vocab.words]
  );

  // Create a new list and add currently filtered/displayed words
  const handleCreateListAndAddFiltered = useCallback(
    async (name: string) => {
      const list = await listsHook.createList(name);
      await listsHook.addWordsToList(list.id, vocab.words.map((w) => w.id));
    },
    [listsHook, vocab.words]
  );

  const handleDeleteCustomWord = useCallback(
    async (wordId: string) => {
      await vocab.deleteCustomWord(wordId);
      await listsHook.removeWordFromAllLists(wordId);
    },
    [vocab, listsHook]
  );

  const handleStudy = useCallback(async () => {
    if (!listsHook.activeList) return;
    scrollPosRef.current = window.scrollY;
    const words = await getWordsByIds(listsHook.activeList.wordIds);
    const map = new Map(words.map((w) => [w.id, w]));
    const ordered = listsHook.activeList.wordIds
      .map((id) => map.get(id))
      .filter((w): w is VocabWord => !!w);
    setStudyWords(ordered);
    setStudyListName(listsHook.activeList.name);
    setStudyStartIndex(undefined);
  }, [listsHook.activeList]);

  const handleStudyFromWord = useCallback(
    (wordId: string, allWords: VocabWord[], label: string) => {
      scrollPosRef.current = window.scrollY;
      const idx = allWords.findIndex((w) => w.id === wordId);
      setStudyWords(allWords);
      setStudyListName(label);
      setStudyStartIndex(idx >= 0 ? idx : undefined);
    },
    []
  );

  // Study currently filtered words
  const handleStudyFiltered = useCallback(() => {
    if (vocab.words.length === 0) return;
    scrollPosRef.current = window.scrollY;
    const levels = vocab.selectedLevels;
    const label = levels.length === 0
      ? 'All HSK'
      : `HSK ${levels.join(', ')}`;
    setStudyWords(vocab.words);
    setStudyListName(label);
    setStudyStartIndex(undefined);
  }, [vocab.words, vocab.selectedLevels]);

  const filterLabel = vocab.selectedLevels.length === 0
    ? 'All HSK'
    : vocab.isSearching
      ? 'Search results'
      : `HSK ${vocab.selectedLevels.join(', ')}`;

  const handleStudyListWord = useCallback(
    async (wordId: string) => {
      if (!listsHook.activeList) return;
      scrollPosRef.current = window.scrollY;
      const words = await getWordsByIds(listsHook.activeList.wordIds);
      const map = new Map(words.map((w) => [w.id, w]));
      const ordered = listsHook.activeList.wordIds
        .map((id) => map.get(id))
        .filter((w): w is VocabWord => !!w);
      const idx = ordered.findIndex((w) => w.id === wordId);
      setStudyWords(ordered);
      setStudyListName(listsHook.activeList.name);
      setStudyStartIndex(idx >= 0 ? idx : undefined);
    },
    [listsHook.activeList]
  );

  // Update a word and immediately reflect the change in the active study set
  // so the flashcard re-renders without needing to exit and re-enter.
  const handleStudyWordUpdate = useCallback(
    async (id: string, updates: { english?: string; userNote?: string; englishOriginal?: string }) => {
      await vocab.updateWord(id, updates);
      const fresh = await db.vocab.get(id);
      if (!fresh) return;
      setStudyWords((prev) => prev?.map((w) => (w.id === id ? fresh : w)) ?? null);
    },
    [vocab]
  );

  if (vocab.loading) {
    return (
      <div className={dark ? 'dark' : ''}>
        <div className="flex min-h-screen items-center justify-center bg-cn-paper dark:bg-cn-paper-dark">
          <div className="flex flex-col items-center gap-3">
            <p className="text-5xl">&#23398;</p>
            <p className="text-cn-muted dark:text-cn-muted-dark">Loading vocabulary...</p>
          </div>
        </div>
      </div>
    );
  }

  // First-load failure (e.g. service-worker / fetch race on a fresh device).
  // Without this branch the user gets stuck on the inline VocabBrowser spinner.
  if (vocab.error && !vocab.dbReady) {
    return (
      <div className={dark ? 'dark' : ''}>
        <div className="flex min-h-screen items-center justify-center bg-cn-paper px-6 dark:bg-cn-paper-dark">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-5xl">&#23398;</p>
            <p className="font-bold text-cn-ink dark:text-cn-cream">Couldn&rsquo;t load vocabulary</p>
            <p className="text-sm text-cn-muted dark:text-cn-muted-dark">{vocab.error}</p>
            <button
              onClick={vocab.retry}
              className="rounded-xl bg-cn-red px-6 py-2.5 font-bold text-white shadow-lg shadow-cn-red/30 transition-all hover:bg-cn-red-dark hover:shadow-xl"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (studyWords) {
    return (
      <div className={dark ? 'dark' : ''}>
        <FlashcardViewer
          words={studyWords}
          listName={studyListName}
          onClose={() => {
            setStudyWords(null);
            setStudyStartIndex(undefined);
            requestAnimationFrame(() => window.scrollTo(0, scrollPosRef.current));
          }}
          dark={dark}
          onToggleDark={toggleDark}
          script={script}
          onToggleScript={toggleScript}
          reverse={reverse}
          onToggleReverse={toggleReverse}
          onUpdateWord={handleStudyWordUpdate}
          startIndex={studyStartIndex}
        />
      </div>
    );
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-cn-paper dark:bg-cn-paper-dark">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-cn-border bg-cn-paper/95 backdrop-blur dark:border-cn-border-dark dark:bg-cn-paper-dark/95">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 px-2 py-3 sm:gap-2 sm:px-4">
            <h1 className="shrink-0 whitespace-nowrap text-2xl font-black tracking-tight text-cn-red dark:text-cn-red-light sm:text-3xl">
              CL<span className="text-cn-gold">&#20013;</span>M
            </h1>

            <div className="flex items-center gap-0.5 sm:gap-2">
              <div className="grid grid-cols-2 gap-0.5 rounded-xl border border-cn-border bg-cn-surface p-0.5 dark:border-cn-border-dark dark:bg-cn-surface-dark">
                <button
                  onClick={() => navigateTo('browse')}
                  className={`rounded-lg px-2 py-1.5 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                    view === 'browse'
                      ? 'bg-cn-red text-white shadow-sm shadow-cn-red/20'
                      : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => navigateTo('flashcards')}
                  className={`relative rounded-lg px-2 py-1.5 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                    view === 'flashcards'
                      ? 'bg-cn-red text-white shadow-sm shadow-cn-red/20'
                      : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
                  }`}
                >
                  Flashcards
                  {(() => {
                    const customCount = listsHook.lists.filter((l) => l.id !== '__favorites__').length;
                    return customCount > 0 ? (
                      <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cn-gold text-[9px] font-black text-white">
                        {customCount}
                      </span>
                    ) : null;
                  })()}
                </button>
              </div>

              {/* Script toggle */}
              <button
                onClick={toggleScript}
                className={`rounded-xl px-1.5 py-1 text-xs font-bold transition-colors sm:px-2 sm:text-sm ${
                  script === 'tw'
                    ? 'text-cn-red dark:text-cn-red-light'
                    : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
                }`}
                title={script === 'cn' ? 'Show traditional (繁)' : 'Show simplified (简)'}
                aria-label="Toggle script"
              >
                {script === 'cn' ? '简' : '繁'}
              </button>

              {/* Reverse mode toggle (flashcards study direction) */}
              <button
                onClick={toggleReverse}
                className={`shrink-0 whitespace-nowrap rounded-xl px-1.5 py-1 text-[10px] font-bold transition-colors sm:px-2 sm:text-sm ${
                  reverse
                    ? 'text-cn-red dark:text-cn-red-light'
                    : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
                }`}
                title={reverse ? 'Flashcards: English → Hanzi (tap to switch)' : 'Flashcards: Hanzi → English (tap to switch)'}
                aria-label="Toggle reverse mode"
              >
                {reverse ? 'EN→中' : '中→EN'}
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className="rounded-xl p-1.5 text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream sm:p-2"
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.061l1.061-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.061 1.06l1.06 1.061ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                    <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="mx-auto max-w-3xl px-4 pb-4 pt-2">
          {view === 'browse' && (
            <VocabBrowser
              words={vocab.words}
              dataLoading={!vocab.dbReady}
              selectedLevels={vocab.selectedLevels}
              onToggleLevel={vocab.toggleLevel}
              showCustom={vocab.showCustom}
              onToggleCustom={vocab.toggleCustom}
              hasCustomWords={vocab.hasCustomWords}
              onAddCustomWord={vocab.addCustomWord}
              onDeleteCustomWord={handleDeleteCustomWord}
              searchQuery={vocab.searchQuery}
              onSearch={vocab.handleSearch}
              isSearching={vocab.isSearching}
              lists={listsHook.lists}
              onAddToList={handleAddToList}
              onCreateListAndAdd={handleCreateListAndAdd}
              onAddFiltered={handleAddFiltered}
              onCreateListAndAddFiltered={handleCreateListAndAddFiltered}
              onUpdateWord={vocab.updateWord}
              script={script}
              isFavorite={listsHook.isFavorite}
              onToggleFavorite={listsHook.toggleFavorite}
              visibility={visibility}
              onToggleVisibility={toggleVisibility}
              onStudyWord={(wordId) => handleStudyFromWord(wordId, vocab.words, vocab.isSearching ? 'Search results' : filterLabel)}
              onStudyFiltered={handleStudyFiltered}
            />
          )}

          {view === 'flashcards' && (
            <div className="flex flex-col gap-3">
              <FlashcardManager
                lists={listsHook.lists}
                activeListId={listsHook.activeListId}
                onSelect={listsHook.setActiveListId}
                onCreate={listsHook.createList}
                onDelete={listsHook.deleteList}
                onRename={listsHook.renameList}
                onExport={exportList}
                onClear={listsHook.clearList}
                onImportDone={listsHook.refresh}
                onImportFromCode={isSharingConfigured() ? setShareCode : undefined}
              />

              {!listsHook.activeList && (() => {
                const customCount = listsHook.lists.filter((l) => l.id !== '__favorites__').length;
                return (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-cn-border px-6 py-16 text-center dark:border-cn-border-dark sm:py-24">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-cn-muted/40 dark:text-cn-muted-dark/40">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                    <p className="font-bold text-cn-ink dark:text-cn-cream">
                      Pick a flashcard list
                    </p>
                    <p className="max-w-sm text-sm text-cn-muted dark:text-cn-muted-dark">
                      {customCount > 0
                        ? 'Tap the selector above to choose one of your lists.'
                        : 'Tap + above to create your first list, or favorite words from Home to fill your Favorites list.'}
                    </p>
                  </div>
                );
              })()}

              {listsHook.activeList && (
                <div className="flex flex-col gap-3">
                  <SortableWordList
                    key={listsHook.activeList.id}
                    wordIds={listsHook.activeList.wordIds}
                    script={script}
                    visibility={visibility}
                    onToggleVisibility={toggleVisibility}
                    lists={listsHook.lists}
                    isFavorite={listsHook.isFavorite}
                    onToggleFavorite={listsHook.toggleFavorite}
                    onAddToList={handleAddToList}
                    onCreateListAndAdd={handleCreateListAndAdd}
                    onUpdateWord={vocab.updateWord}
                    onDeleteCustomWord={handleDeleteCustomWord}
                    onReorder={(ids) =>
                      listsHook.reorderList(listsHook.activeList!.id, ids)
                    }
                    onRemove={(wordId) =>
                      listsHook.removeWordFromList(listsHook.activeList!.id, wordId)
                    }
                    onStudyWord={handleStudyListWord}
                    onBrowse={() => navigateTo('browse')}
                    actions={
                      listsHook.activeList.wordIds.length > 0 ? (
                        <button
                          onClick={handleStudy}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-cn-red text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark hover:shadow-lg sm:h-auto sm:w-auto sm:px-4 sm:py-2"
                          title="Study"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 sm:hidden">
                            <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
                          </svg>
                          <span className="hidden sm:inline">Study</span>
                        </button>
                      ) : null
                    }
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {shareCode && (
        <ImportShareModal
          code={shareCode}
          onClose={() => setShareCode(null)}
          onImported={(listId) => {
            listsHook.refresh();
            vocab.refresh();
            listsHook.setActiveListId(listId);
            navigateTo('flashcards');
            setShareCode(null);
          }}
        />
      )}
    </div>
  );
}
