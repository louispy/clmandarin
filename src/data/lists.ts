import { db } from '../db';
import type { FlashcardList } from '../types';

/**
 * The only place in the app that touches the `lists` table.
 *
 * Hooks and utils call through here rather than reaching into Dexie directly,
 * so that when accounts arrive (see zdocs/BACKEND.md) the server calls land in
 * this file instead of being scattered across every call site. It is a thin
 * pass-through today — that is intentional.
 */
export const listRepo = {
  /** Most recently updated first. */
  all(): Promise<FlashcardList[]> {
    return db.lists.orderBy('updatedAt').reverse().toArray();
  },

  get(id: string): Promise<FlashcardList | undefined> {
    return db.lists.get(id);
  },

  /** Every list containing `wordId` — used when a custom word is deleted. */
  async withWord(wordId: string): Promise<FlashcardList[]> {
    const all = await db.lists.toArray();
    return all.filter((l) => l.wordIds.includes(wordId));
  },

  async add(list: FlashcardList): Promise<void> {
    await db.lists.add(list);
  },

  /** Upsert — used by file import, which may be overwriting an existing list. */
  async put(list: FlashcardList): Promise<void> {
    await db.lists.put(list);
  },

  /** Patch a list and stamp `updatedAt`. */
  async update(id: string, changes: Partial<FlashcardList>): Promise<void> {
    await db.lists.update(id, { ...changes, updatedAt: Date.now() });
  },

  /**
   * Patch without touching `updatedAt`. For bookkeeping the user didn't do —
   * writing a lazily generated shareToken shouldn't reshuffle their list order.
   */
  async updateQuiet(id: string, changes: Partial<FlashcardList>): Promise<void> {
    await db.lists.update(id, changes);
  },

  async remove(id: string): Promise<void> {
    await db.lists.delete(id);
  },

  /**
   * Add `list` only if its id is free. Wrapped in a transaction so concurrent
   * callers (StrictMode double-mount, overlapping refreshes) can't both see
   * "missing" and race on add().
   */
  async ensure(list: FlashcardList): Promise<void> {
    await db.transaction('rw', db.lists, async () => {
      const existing = await db.lists.get(list.id);
      if (existing) return;
      await db.lists.add(list);
    });
  },
};
