import { useCallback } from 'react';
import type { VocabWord } from '../types';
import type { useVocab } from '../hooks/useVocab';
import type { useLists } from '../hooks/useLists';
import type { VisibilityState } from '../hooks/useVisibility';
import type { Script } from '../hooks/useScript';
import { VocabBrowser } from '../components/VocabBrowser';

export function BrowseScreen({
  vocab,
  lists,
  script,
  visibility,
  onToggleVisibility,
  onAddCustomWord,
  onDeleteCustomWord,
  onStartStudy,
  onHome,
}: {
  vocab: ReturnType<typeof useVocab>;
  lists: ReturnType<typeof useLists>;
  script: Script;
  visibility: VisibilityState;
  onToggleVisibility: (field: keyof VisibilityState) => void;
  onAddCustomWord: ReturnType<typeof useVocab>['addCustomWord'];
  onDeleteCustomWord: (wordId: string) => Promise<void>;
  onStartStudy: (words: VocabWord[], label: string, startIndex?: number) => void;
  onHome: () => void;
}) {
  const filterLabel = vocab.selectedLevels.length === 0
    ? 'All HSK'
    : vocab.isSearching
      ? 'Search results'
      : `HSK ${vocab.selectedLevels.join(', ')}`;

  const handleAddToList = useCallback(
    (listId: string, wordId: string) => {
      lists.addWordsToList(listId, [wordId]);
    },
    [lists]
  );

  const handleCreateListAndAdd = useCallback(
    async (name: string, wordId: string) => {
      const list = await lists.createList(name);
      await lists.addWordsToList(list.id, [wordId]);
    },
    [lists]
  );

  // Add currently filtered/displayed words to an existing list
  const handleAddFiltered = useCallback(
    (listId: string) => {
      lists.addWordsToList(listId, vocab.words.map((w) => w.id));
    },
    [lists, vocab.words]
  );

  // Create a new list and add currently filtered/displayed words
  const handleCreateListAndAddFiltered = useCallback(
    async (name: string) => {
      const list = await lists.createList(name);
      await lists.addWordsToList(list.id, vocab.words.map((w) => w.id));
    },
    [lists, vocab.words]
  );

  const handleStudyWord = useCallback(
    (wordId: string) => {
      const label = vocab.isSearching ? 'Search results' : filterLabel;
      const idx = vocab.words.findIndex((w) => w.id === wordId);
      onStartStudy(vocab.words, label, idx >= 0 ? idx : undefined);
    },
    [vocab.words, vocab.isSearching, filterLabel, onStartStudy]
  );

  // Study currently filtered words
  const handleStudyFiltered = useCallback(() => {
    if (vocab.words.length === 0) return;
    const label = vocab.selectedLevels.length === 0
      ? 'All HSK'
      : `HSK ${vocab.selectedLevels.join(', ')}`;
    onStartStudy(vocab.words, label);
  }, [vocab.words, vocab.selectedLevels, onStartStudy]);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onHome}
        className="flex w-fit items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-bold text-cn-red transition-colors hover:bg-cn-red/10 dark:text-cn-red-light"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z" clipRule="evenodd" />
        </svg>
        Home
      </button>
    <VocabBrowser
      words={vocab.words}
      dataLoading={!vocab.dbReady}
      selectedLevels={vocab.selectedLevels}
      onToggleLevel={vocab.toggleLevel}
      showCustom={vocab.showCustom}
      onToggleCustom={vocab.toggleCustom}
      hasCustomWords={vocab.hasCustomWords}
      onAddCustomWord={onAddCustomWord}
      onDeleteCustomWord={onDeleteCustomWord}
      searchQuery={vocab.searchQuery}
      onSearch={vocab.handleSearch}
      isSearching={vocab.isSearching}
      lists={lists.lists}
      onAddToList={handleAddToList}
      onCreateListAndAdd={handleCreateListAndAdd}
      onAddFiltered={handleAddFiltered}
      onCreateListAndAddFiltered={handleCreateListAndAddFiltered}
      onUpdateWord={vocab.updateWord}
      script={script}
      isFavorite={lists.isFavorite}
      onToggleFavorite={lists.toggleFavorite}
      visibility={visibility}
      onToggleVisibility={onToggleVisibility}
      onStudyWord={handleStudyWord}
      onStudyFiltered={handleStudyFiltered}
    />
    </div>
  );
}
