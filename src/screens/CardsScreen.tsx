import { useCallback } from 'react';
import type { VocabWord } from '../types';
import type { useVocab } from '../hooks/useVocab';
import type { useLists } from '../hooks/useLists';
import type { VisibilityState } from '../hooks/useVisibility';
import type { Script } from '../hooks/useScript';
import { FlashcardManager } from '../components/FlashcardManager';
import { SortableWordList } from '../components/SortableWordList';
import { exportList } from '../utils/import-export';
import { isSharingConfigured } from '../utils/share';
import { getWordsByIds } from '../utils/vocab-loader';

const FAVORITES_ID = '__favorites__';

export function CardsScreen({
  vocab,
  lists,
  script,
  visibility,
  onToggleVisibility,
  onDeleteCustomWord,
  onStartStudy,
  onBrowse,
  onImportFromCode,
}: {
  vocab: ReturnType<typeof useVocab>;
  lists: ReturnType<typeof useLists>;
  script: Script;
  visibility: VisibilityState;
  onToggleVisibility: (field: keyof VisibilityState) => void;
  onDeleteCustomWord: (wordId: string) => Promise<void>;
  onStartStudy: (words: VocabWord[], label: string, startIndex?: number) => void;
  onBrowse: () => void;
  onImportFromCode: (code: string) => void;
}) {
  const { activeList } = lists;

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

  // Resolve the active list's ids to words, preserving the user's ordering.
  const orderedWords = useCallback(async (): Promise<VocabWord[]> => {
    if (!activeList) return [];
    const words = await getWordsByIds(activeList.wordIds);
    const map = new Map(words.map((w) => [w.id, w]));
    return activeList.wordIds
      .map((id) => map.get(id))
      .filter((w): w is VocabWord => !!w);
  }, [activeList]);

  const handleStudy = useCallback(async () => {
    if (!activeList) return;
    onStartStudy(await orderedWords(), activeList.name);
  }, [activeList, orderedWords, onStartStudy]);

  const handleStudyListWord = useCallback(
    async (wordId: string) => {
      if (!activeList) return;
      const ordered = await orderedWords();
      const idx = ordered.findIndex((w) => w.id === wordId);
      onStartStudy(ordered, activeList.name, idx >= 0 ? idx : undefined);
    },
    [activeList, orderedWords, onStartStudy]
  );

  const customCount = lists.lists.filter((l) => l.id !== FAVORITES_ID).length;

  return (
    <div className="flex flex-col gap-3">
      <FlashcardManager
        lists={lists.lists}
        activeListId={lists.activeListId}
        onSelect={lists.setActiveListId}
        onCreate={lists.createList}
        onDelete={lists.deleteList}
        onRename={lists.renameList}
        onExport={exportList}
        onClear={lists.clearList}
        onImportDone={lists.refresh}
        onImportFromCode={isSharingConfigured() ? onImportFromCode : undefined}
      />

      {!activeList && (
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
      )}

      {activeList && (
        <SortableWordList
          key={activeList.id}
          wordIds={activeList.wordIds}
          script={script}
          visibility={visibility}
          onToggleVisibility={onToggleVisibility}
          lists={lists.lists}
          isFavorite={lists.isFavorite}
          onToggleFavorite={lists.toggleFavorite}
          onAddToList={handleAddToList}
          onCreateListAndAdd={handleCreateListAndAdd}
          onUpdateWord={vocab.updateWord}
          onDeleteCustomWord={onDeleteCustomWord}
          onReorder={(ids) => lists.reorderList(activeList.id, ids)}
          onRemove={(wordId) => lists.removeWordFromList(activeList.id, wordId)}
          onStudyWord={handleStudyListWord}
          onBrowse={onBrowse}
          actions={
            activeList.wordIds.length > 0 ? (
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
      )}
    </div>
  );
}
