import { useCallback, useState } from 'react';
import type { VocabWord } from '../types';
import type { useVocab } from '../hooks/useVocab';
import type { useLists } from '../hooks/useLists';
import type { useDecks } from '../hooks/useDecks';
import type { VisibilityState } from '../hooks/useVisibility';
import type { Script } from '../hooks/useScript';
import { FlashcardManager } from '../components/FlashcardManager';
import { SortableWordList } from '../components/SortableWordList';
import { DeckIndex } from '../components/DeckIndex';
import { exportList } from '../utils/import-export';
import { isSharingConfigured } from '../utils/share';
import { getWordsByIds } from '../utils/vocab-loader';

const FAVORITES_ID = '__favorites__';

/** Resolve ids to words, preserving the given ordering. */
async function resolveOrdered(wordIds: string[]): Promise<VocabWord[]> {
  const words = await getWordsByIds(wordIds);
  const map = new Map(words.map((w) => [w.id, w]));
  return wordIds.map((id) => map.get(id)).filter((w): w is VocabWord => !!w);
}

function StudyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-xl bg-cn-red text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark hover:shadow-lg sm:h-auto sm:w-auto sm:px-4 sm:py-2"
      title="Study"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 sm:hidden">
        <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
      </svg>
      <span className="hidden sm:inline">Study</span>
    </button>
  );
}

export function CardsScreen({
  vocab,
  lists,
  decks,
  openDeckId,
  onOpenDeck,
  onCloseDeck,
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
  decks: ReturnType<typeof useDecks>;
  openDeckId: string | null;
  onOpenDeck: (deckId: string) => void;
  onCloseDeck: () => void;
  script: Script;
  visibility: VisibilityState;
  onToggleVisibility: (field: keyof VisibilityState) => void;
  onDeleteCustomWord: (wordId: string) => Promise<void>;
  onStartStudy: (words: VocabWord[], label: string, startIndex?: number) => void;
  onBrowse: () => void;
  onImportFromCode: (code: string) => void;
}) {
  const { activeList } = lists;
  const openDeck = decks.getDeck(openDeckId);
  const [duplicating, setDuplicating] = useState(false);

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

  const startStudyFrom = useCallback(
    async (wordIds: string[], label: string, fromWordId?: string) => {
      const ordered = await resolveOrdered(wordIds);
      const idx = fromWordId ? ordered.findIndex((w) => w.id === fromWordId) : -1;
      onStartStudy(ordered, label, idx >= 0 ? idx : undefined);
    },
    [onStartStudy]
  );

  // Copy a built-in deck into a real, fully-owned list so the user can
  // rearrange it without touching the canonical deck.
  const handleDuplicateDeck = useCallback(async () => {
    if (!openDeck || duplicating) return;
    setDuplicating(true);
    try {
      const list = await lists.createList(`${openDeck.name} (copy)`);
      await lists.addWordsToList(list.id, openDeck.wordIds);
      lists.setActiveListId(list.id);
      onCloseDeck();
    } finally {
      setDuplicating(false);
    }
  }, [openDeck, duplicating, lists, onCloseDeck]);

  const handleResetDeck = useCallback(async () => {
    if (!openDeck) return;
    const ok = window.confirm(
      `Reset ${openDeck.name} to the original word list? Your changes to this deck will be discarded.`
    );
    if (!ok) return;
    await decks.resetDeck(openDeck.id);
  }, [openDeck, decks]);

  const customCount = lists.lists.filter((l) => l.id !== FAVORITES_ID).length;

  // ---- Built-in deck detail -------------------------------------------------
  if (openDeck) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 py-1">
          <button
            onClick={onCloseDeck}
            className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-sm font-bold text-cn-red transition-colors hover:bg-cn-red/10 dark:text-cn-red-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z" clipRule="evenodd" />
            </svg>
            Decks
          </button>
          <p className="truncate font-bold text-cn-ink dark:text-cn-cream">{openDeck.name}</p>
          {openDeck.edited && (
            <span className="shrink-0 rounded-full bg-cn-red/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cn-red dark:text-cn-red-light">
              Edited
            </span>
          )}
          <span className="ml-auto shrink-0 text-xs font-bold tabular-nums text-cn-muted dark:text-cn-muted-dark">
            {openDeck.wordIds.length.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDuplicateDeck}
            disabled={duplicating}
            className="rounded-xl border border-cn-border px-3 py-1.5 text-xs font-bold text-cn-muted transition-colors hover:text-cn-ink disabled:opacity-50 dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream"
          >
            {duplicating ? 'Copying…' : 'Duplicate to my lists'}
          </button>
          {openDeck.edited && (
            <button
              onClick={handleResetDeck}
              className="rounded-xl border border-cn-border px-3 py-1.5 text-xs font-bold text-cn-muted transition-colors hover:text-cn-ink dark:border-cn-border-dark dark:text-cn-muted-dark dark:hover:text-cn-cream"
            >
              Reset to original
            </button>
          )}
        </div>

        <SortableWordList
          key={openDeck.id}
          wordIds={openDeck.wordIds}
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
          onReorder={(ids) => decks.saveDeck(openDeck.id, ids)}
          onRemove={(wordId) =>
            decks.saveDeck(openDeck.id, openDeck.wordIds.filter((id) => id !== wordId))
          }
          onStudyWord={(wordId) => startStudyFrom(openDeck.wordIds, openDeck.name, wordId)}
          onBrowse={onBrowse}
          actions={
            openDeck.wordIds.length > 0 ? (
              <StudyButton onClick={() => startStudyFrom(openDeck.wordIds, openDeck.name)} />
            ) : null
          }
        />
      </div>
    );
  }

  // ---- Deck index + the user's own lists ------------------------------------
  return (
    <div className="flex flex-col gap-4">
      <DeckIndex decks={decks.decks} onOpen={onOpenDeck} />

      <div className="flex flex-col gap-3">
        <p className="px-0.5 text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          Your lists
        </p>

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
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-cn-border px-6 py-12 text-center dark:border-cn-border-dark">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-10 w-10 text-cn-muted/40 dark:text-cn-muted-dark/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            <p className="font-bold text-cn-ink dark:text-cn-cream">Pick a flashcard list</p>
            <p className="max-w-sm text-sm text-cn-muted dark:text-cn-muted-dark">
              {customCount > 0
                ? 'Tap the selector above to choose one of your lists.'
                : 'Tap + above to create your first list, or open a deck above and duplicate it.'}
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
            onStudyWord={(wordId) => startStudyFrom(activeList.wordIds, activeList.name, wordId)}
            onBrowse={onBrowse}
            actions={
              activeList.wordIds.length > 0 ? (
                <StudyButton onClick={() => startStudyFrom(activeList.wordIds, activeList.name)} />
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}
