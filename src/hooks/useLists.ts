import { useState, useEffect, useCallback } from 'react';
import { listRepo } from '../data/lists';
import { isDeckId } from '../utils/decks';
import type { FlashcardList } from '../types';
import { uuid } from '../utils/uuid';

const FAVORITES_ID = '__favorites__';

async function ensureFavorites(): Promise<void> {
  const now = Date.now();
  await listRepo.ensure({
    id: FAVORITES_ID,
    name: 'Favorites',
    createdAt: now,
    updatedAt: now,
    wordIds: [],
  });
}

export function useLists() {
  const [lists, setLists] = useState<FlashcardList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await ensureFavorites();
    // Built-in decks share the lists table once edited, but they are not the
    // user's lists — they must never show up in "add to list" menus or the
    // list selector. useDecks owns them.
    const all = (await listRepo.all()).filter((l) => !isDeckId(l.id));
    // Always put Favorites first
    const favIdx = all.findIndex((l) => l.id === FAVORITES_ID);
    if (favIdx > 0) {
      const [fav] = all.splice(favIdx, 1);
      all.unshift(fav);
    }
    setLists(all);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Default selection (derived): favorites if it has words, otherwise the
  // most recent custom list — so an empty Favorites doesn't shadow a list
  // the user actually built. User selection in `selectedListId` always wins.
  let activeListId = selectedListId;
  if (activeListId === null && lists.length > 0) {
    const favorites = lists.find((l) => l.id === FAVORITES_ID);
    if (favorites && favorites.wordIds.length > 0) {
      activeListId = FAVORITES_ID;
    } else {
      const firstCustom = lists.find((l) => l.id !== FAVORITES_ID);
      activeListId = firstCustom?.id ?? favorites?.id ?? null;
    }
  }

  const activeList = lists.find((l) => l.id === activeListId) ?? null;
  const favorites = lists.find((l) => l.id === FAVORITES_ID) ?? null;
  const favoriteWordIds = new Set(favorites?.wordIds ?? []);

  const isFavorite = useCallback(
    (wordId: string) => favoriteWordIds.has(wordId),
    [favoriteWordIds]
  );

  const toggleFavorite = useCallback(
    async (wordId: string) => {
      const fav = await listRepo.get(FAVORITES_ID);
      if (!fav) return;
      const has = fav.wordIds.includes(wordId);
      await listRepo.update(FAVORITES_ID, {
        wordIds: has
          ? fav.wordIds.filter((id) => id !== wordId)
          : [...fav.wordIds, wordId],
      });
      await refresh();
    },
    [refresh]
  );

  const clearList = useCallback(
    async (id: string) => {
      await listRepo.update(id, { wordIds: [] });
      await refresh();
    },
    [refresh]
  );

  const createList = useCallback(
    async (name: string) => {
      const now = Date.now();
      const list: FlashcardList = {
        id: uuid(),
        name,
        createdAt: now,
        updatedAt: now,
        wordIds: [],
      };
      await listRepo.add(list);
      await refresh();
      return list;
    },
    [refresh]
  );

  const deleteList = useCallback(
    async (id: string) => {
      if (id === FAVORITES_ID) return; // Can't delete Favorites
      await listRepo.remove(id);
      setSelectedListId((curr) => (curr === id ? null : curr));
      await refresh();
    },
    [refresh]
  );

  const renameList = useCallback(
    async (id: string, name: string) => {
      if (id === FAVORITES_ID) return; // Can't rename Favorites
      await listRepo.update(id, { name });
      await refresh();
    },
    [refresh]
  );

  const addWordsToList = useCallback(
    async (listId: string, wordIds: string[]) => {
      const list = await listRepo.get(listId);
      if (!list) return;
      const existing = new Set(list.wordIds);
      const newIds = wordIds.filter((id) => !existing.has(id));
      if (newIds.length === 0) return;
      await listRepo.update(listId, { wordIds: [...list.wordIds, ...newIds] });
      await refresh();
    },
    [refresh]
  );

  const removeWordFromList = useCallback(
    async (listId: string, wordId: string) => {
      const list = await listRepo.get(listId);
      if (!list) return;
      await listRepo.update(listId, {
        wordIds: list.wordIds.filter((id) => id !== wordId),
      });
      await refresh();
    },
    [refresh]
  );

  const removeWordFromAllLists = useCallback(
    async (wordId: string) => {
      const affected = await listRepo.withWord(wordId);
      await Promise.all(
        affected.map((l) =>
          listRepo.update(l.id, {
            wordIds: l.wordIds.filter((id) => id !== wordId),
          })
        )
      );
      await refresh();
    },
    [refresh]
  );

  const reorderList = useCallback(
    async (listId: string, wordIds: string[]) => {
      await listRepo.update(listId, { wordIds });
      await refresh();
    },
    [refresh]
  );

  return {
    lists,
    activeList,
    activeListId,
    setActiveListId: setSelectedListId,
    favorites,
    isFavorite,
    toggleFavorite,
    clearList,
    createList,
    deleteList,
    renameList,
    addWordsToList,
    removeWordFromList,
    removeWordFromAllLists,
    reorderList,
    refresh,
    FAVORITES_ID,
  };
}
