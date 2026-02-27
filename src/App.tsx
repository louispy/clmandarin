import { useState, useCallback } from 'react';
import { useVocab } from './hooks/useVocab';
import { useLists } from './hooks/useLists';
import { useDarkMode } from './hooks/useDarkMode';
import { useVisibility } from './hooks/useVisibility';
import { VocabBrowser } from './components/VocabBrowser';
import { FlashcardManager } from './components/FlashcardManager';
import { SortableWordList } from './components/SortableWordList';
import { FlashcardViewer } from './components/FlashcardViewer';
import { FileImport } from './components/FileImport';
import { exportList } from './utils/import-export';
import { getWordsByLevel, getWordsByIds } from './utils/vocab-loader';
import type { VocabWord } from './types';

type View = 'browse' | 'flashcards';

export function App() {
  const vocab = useVocab();
  const listsHook = useLists();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { visibility, toggle: toggleVisibility } = useVisibility();
  const [view, setView] = useState<View>('browse');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [studyWords, setStudyWords] = useState<VocabWord[] | null>(null);
  const [studyListName, setStudyListName] = useState('');
  const [studyStartIndex, setStudyStartIndex] = useState<number | undefined>(undefined);

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

  const handleAddLevel = useCallback(
    async (listId: string, level: number) => {
      const words = await getWordsByLevel(level);
      listsHook.addWordsToList(listId, words.map((w) => w.id));
    },
    [listsHook]
  );

  const handleCreateListAndAddLevel = useCallback(
    async (name: string, level: number) => {
      const list = await listsHook.createList(name);
      const words = await getWordsByLevel(level);
      await listsHook.addWordsToList(list.id, words.map((w) => w.id));
    },
    [listsHook]
  );

  const handleStudy = useCallback(async () => {
    if (!listsHook.activeList) return;
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
    async (wordId: string, allWords: VocabWord[], label: string) => {
      const idx = allWords.findIndex((w) => w.id === wordId);
      setStudyWords(allWords);
      setStudyListName(label);
      setStudyStartIndex(idx >= 0 ? idx : undefined);
    },
    []
  );

  const handleStudyLevel = useCallback(async (level: number) => {
    const words = await getWordsByLevel(level);
    setStudyWords(words);
    setStudyListName(`HSK ${level}`);
    setStudyStartIndex(undefined);
  }, []);

  const handleStudyListWord = useCallback(
    async (wordId: string) => {
      if (!listsHook.activeList) return;
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

  if (studyWords) {
    return (
      <div className={dark ? 'dark' : ''}>
        <FlashcardViewer
          words={studyWords}
          listName={studyListName}
          onClose={() => { setStudyWords(null); setStudyStartIndex(undefined); }}
          dark={dark}
          onToggleDark={toggleDark}
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
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <h1 className="text-xl font-black tracking-tight text-cn-red dark:text-cn-red-light">
              CL<span className="text-cn-gold">&#20013;</span>Mandarin
            </h1>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setView('browse')}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  view === 'browse'
                    ? 'bg-cn-red text-white shadow-md shadow-cn-red/20'
                    : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
                }`}
              >
                Browse
              </button>
              <button
                onClick={() => setView('flashcards')}
                className={`relative rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                  view === 'flashcards'
                    ? 'bg-cn-red text-white shadow-md shadow-cn-red/20'
                    : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
                }`}
              >
                Flashcards
                {listsHook.lists.length > 1 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cn-gold text-[10px] font-black text-white">
                    {listsHook.lists.length}
                  </span>
                )}
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={toggleDark}
                className="ml-2 rounded-xl p-2 text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream"
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
        <main className="mx-auto max-w-3xl px-4 py-6">
          {view === 'browse' && (
            <VocabBrowser
              words={vocab.words}
              selectedLevel={vocab.selectedLevel}
              onSelectLevel={vocab.setSelectedLevel}
              searchQuery={vocab.searchQuery}
              onSearch={vocab.handleSearch}
              isSearching={vocab.isSearching}
              lists={listsHook.lists}
              onAddToList={handleAddToList}
              onCreateListAndAdd={handleCreateListAndAdd}
              onAddLevel={handleAddLevel}
              onCreateListAndAddLevel={handleCreateListAndAddLevel}
              isFavorite={listsHook.isFavorite}
              onToggleFavorite={listsHook.toggleFavorite}
              visibility={visibility}
              onToggleVisibility={toggleVisibility}
              viewMode={viewMode}
              onToggleViewMode={() => setViewMode((v) => (v === 'list' ? 'grid' : 'list'))}
              onStudyWord={(wordId) => handleStudyFromWord(wordId, vocab.words, vocab.isSearching ? 'Search results' : `HSK ${vocab.selectedLevel}`)}
              onStudyLevel={handleStudyLevel}
            />
          )}

          {view === 'flashcards' && (
            <div className="flex flex-col gap-8">
              <FlashcardManager
                lists={listsHook.lists}
                activeListId={listsHook.activeListId}
                onSelect={listsHook.setActiveListId}
                onCreate={listsHook.createList}
                onDelete={listsHook.deleteList}
                onRename={listsHook.renameList}
                onExport={exportList}
              />

              <FileImport onDone={listsHook.refresh} />

              {listsHook.activeList && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-cn-ink dark:text-cn-cream">
                        {listsHook.activeList.name}
                      </h3>
                      <p className="text-sm text-cn-muted dark:text-cn-muted-dark">
                        {listsHook.activeList.wordIds.length} word{listsHook.activeList.wordIds.length !== 1 ? 's' : ''} — drag to reorder
                      </p>
                    </div>
                    {listsHook.activeList.wordIds.length > 0 && (
                      <button
                        onClick={handleStudy}
                        className="rounded-xl bg-cn-red px-6 py-2.5 font-bold text-white shadow-lg shadow-cn-red/30 transition-all hover:bg-cn-red-dark hover:shadow-xl"
                      >
                        Study
                      </button>
                    )}
                  </div>
                  <SortableWordList
                    wordIds={listsHook.activeList.wordIds}
                    onReorder={(ids) =>
                      listsHook.reorderList(listsHook.activeList!.id, ids)
                    }
                    onRemove={(wordId) =>
                      listsHook.removeWordFromList(listsHook.activeList!.id, wordId)
                    }
                    onStudyWord={handleStudyListWord}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
