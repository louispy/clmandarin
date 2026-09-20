import { db } from '../db';
import type { MandarinText } from '../types';

/**
 * The only place in the app that touches the `texts` table.
 * See the note in `lists.ts` — same reasoning.
 */
export const textRepo = {
  /** Most recently updated first. */
  all(): Promise<MandarinText[]> {
    return db.texts.orderBy('updatedAt').reverse().toArray();
  },

  get(id: string): Promise<MandarinText | undefined> {
    return db.texts.get(id);
  },

  async add(text: MandarinText): Promise<void> {
    await db.texts.add(text);
  },

  async put(text: MandarinText): Promise<void> {
    await db.texts.put(text);
  },

  /** Patch a text and stamp `updatedAt`. */
  async update(id: string, changes: Partial<MandarinText>): Promise<void> {
    await db.texts.update(id, { ...changes, updatedAt: Date.now() });
  },

  /** Patch without touching `updatedAt` — see `listRepo.updateQuiet`. */
  async updateQuiet(id: string, changes: Partial<MandarinText>): Promise<void> {
    await db.texts.update(id, changes);
  },

  async remove(id: string): Promise<void> {
    await db.texts.delete(id);
  },
};
