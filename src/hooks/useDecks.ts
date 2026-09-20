import { useState, useEffect, useCallback } from 'react';
import { listRepo } from '../data/lists';
import { DECK_DEFS, deriveDeckWordIds, type DeckDef } from '../utils/decks';

export interface Deck extends DeckDef {
  /** Effective contents: the user's saved row if edited, otherwise derived. */
  wordIds: string[];
  /** True once the user has reordered or removed something. */
  edited: boolean;
}

/**
 * Built-in decks, lazily stored. Nothing is written until the user edits a
 * deck; `reset` throws the saved copy away and the deck goes back to tracking
 * the vocab data. See zdocs/PLAN.md decision 3.
 */
export function useDecks(deps: { dbReady: boolean }) {
  const { dbReady } = deps;
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!dbReady) return;
    const next = await Promise.all(
      DECK_DEFS.map(async (def): Promise<Deck> => {
        const saved = await listRepo.get(def.id);
        if (saved) return { ...def, wordIds: saved.wordIds, edited: true };
        return { ...def, wordIds: await deriveDeckWordIds(def), edited: false };
      })
    );
    setDecks(next);
    setLoading(false);
  }, [dbReady]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Persist a deck's contents. Upsert rather than update: the first edit is
   * also the moment the row comes into existence.
   */
  const saveDeck = useCallback(
    async (deckId: string, wordIds: string[]) => {
      const def = DECK_DEFS.find((d) => d.id === deckId);
      if (!def) return;
      const existing = await listRepo.get(deckId);
      const now = Date.now();
      await listRepo.put({
        id: deckId,
        name: def.name,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        wordIds,
      });
      await refresh();
    },
    [refresh]
  );

  /** Discard the user's edits and go back to the canonical contents. */
  const resetDeck = useCallback(
    async (deckId: string) => {
      await listRepo.remove(deckId);
      await refresh();
    },
    [refresh]
  );

  const getDeck = useCallback(
    (deckId: string | null) => decks.find((d) => d.id === deckId) ?? null,
    [decks]
  );

  return { decks, loading, refresh, saveDeck, resetDeck, getDeck };
}
