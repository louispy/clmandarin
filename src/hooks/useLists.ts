import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { FlashcardList } from '../types';

const FAVORITES_ID = '__favorites__';

async function ensureFavorites(): Promise<void> {
  const existing = await db.lists.get(FAVORITES_ID);
  if (!existing) {
    await db.lists.add({
      id: FAVORITES_ID,
      name: 'Favorites',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordIds: [],
    });
  }
}

export function useLists() {
  const [lists, setLists] = useState<FlashcardList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);

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

  const createList = useCallback(
    async (name: string) => {
      const now = Date.now();
      const list: FlashcardList = {
        id: crypto.randomUUID(),
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
      if (activeListId === id) setActiveListId(null);
      await refresh();
    },
    [activeListId, refresh]
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
    setActiveListId,
    favorites,
    isFavorite,
    toggleFavorite,
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
