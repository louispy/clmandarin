import { getCanonicalWordIdsByLevel, getCustomWordIds } from './vocab-loader';

/**
 * Built-in decks: HSK 1-6 plus the user's own words.
 *
 * A deck is **derived** until the user edits it. Until then nothing is stored,
 * so a vocab data update flows in automatically. The first reorder or removal
 * writes a real row into the `lists` table under the deck's id, after which the
 * deck behaves exactly like any user list — and **Reset** deletes that row to
 * go back to derived. See zdocs/PLAN.md decision 3.
 */
export interface DeckDef {
  id: string;
  name: string;
  /** HSK level, or 0 for the user's own words. */
  level: number;
}

export const MY_WORDS_DECK_ID = '__mywords__';

export const DECK_DEFS: DeckDef[] = [
  { id: '__hsk1__', name: 'HSK 1', level: 1 },
  { id: '__hsk2__', name: 'HSK 2', level: 2 },
  { id: '__hsk3__', name: 'HSK 3', level: 3 },
  { id: '__hsk4__', name: 'HSK 4', level: 4 },
  { id: '__hsk5__', name: 'HSK 5', level: 5 },
  { id: '__hsk6__', name: 'HSK 6', level: 6 },
  { id: MY_WORDS_DECK_ID, name: 'My words', level: 0 },
];

const DECK_IDS = new Set(DECK_DEFS.map((d) => d.id));

/**
 * True for a built-in deck id. Used to keep decks out of the user's list
 * collection — they must not appear in "add to list" menus, since adding an
 * arbitrary word to "HSK 3" is meaningless.
 */
export function isDeckId(id: string): boolean {
  return DECK_IDS.has(id);
}

export function getDeckDef(id: string): DeckDef | undefined {
  return DECK_DEFS.find((d) => d.id === id);
}

/** The deck's contents as they would be with no user edits at all. */
export function deriveDeckWordIds(def: DeckDef): Promise<string[]> {
  return def.level === 0
    ? getCustomWordIds()
    : getCanonicalWordIdsByLevel(def.level);
}
