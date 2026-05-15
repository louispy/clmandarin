import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { FlashcardList } from '../types';
import { uuid } from '../utils/uuid';

const FAVORITES_ID = '__favorites__';

async function ensureFavorites(): Promise<void> {
  // Wrap the read + add so concurrent callers (StrictMode double-mount,
  // overlapping refresh()s) can't both see "missing" and race on add().
  await db.transaction('rw', db.lists, async () => {
    const existing = await db.lists.get(FAVORITES_ID);
    if (existing) return;
    await db.lists.add({
      id: FAVORITES_ID,
      name: 'Favorites',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordIds: [],
    });
  });
}

export function useLists() {
  const [lists, setLists] = useState<FlashcardList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await ensureFavorites();
    const all = await db.lists.orderBy('updatedAt').reverse().toArray();
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
      const fav = await db.lists.get(FAVORITES_ID);
      if (!fav) return;
      const has = fav.wordIds.includes(wordId);
      await db.lists.update(FAVORITES_ID, {
        wordIds: has
          ? fav.wordIds.filter((id) => id !== wordId)
          : [...fav.wordIds, wordId],
        updatedAt: Date.now(),
      });
      await refresh();
    },
    [refresh]
  );

  const clearList = useCallback(
    async (id: string) => {
      await db.lists.update(id, {
        wordIds: [],
        updatedAt: Date.now(),
      });
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
      await db.lists.add(list);
      await refresh();
      return list;
    },
    [refresh]
  );

  const deleteList = useCallback(
    async (id: string) => {
      if (id === FAVORITES_ID) return; // Can't delete Favorites
      await db.lists.delete(id);
      setSelectedListId((curr) => (curr === id ? null : curr));
      await refresh();
    },
    [refresh]
  );

  const renameList = useCallback(
    async (id: string, name: string) => {
      if (id === FAVORITES_ID) return; // Can't rename Favorites
      await db.lists.update(id, { name, updatedAt: Date.now() });
      await refresh();
    },
    [refresh]
  );

  const addWordsToList = useCallback(
    async (listId: string, wordIds: string[]) => {
      const list = await db.lists.get(listId);
      if (!list) return;
      const existing = new Set(list.wordIds);
      const newIds = wordIds.filter((id) => !existing.has(id));
      if (newIds.length === 0) return;
      await db.lists.update(listId, {
        wordIds: [...list.wordIds, ...newIds],
        updatedAt: Date.now(),
      });
      await refresh();
    },
    [refresh]
  );

  const removeWordFromList = useCallback(
    async (listId: string, wordId: string) => {
      const list = await db.lists.get(listId);
      if (!list) return;
      await db.lists.update(listId, {
        wordIds: list.wordIds.filter((id) => id !== wordId),
        updatedAt: Date.now(),
      });
      await refresh();
    },
    [refresh]
  );

  const reorderList = useCallback(
    async (listId: string, wordIds: string[]) => {
      await db.lists.update(listId, { wordIds, updatedAt: Date.now() });
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
    reorderList,
    refresh,
    FAVORITES_ID,
  };
}
