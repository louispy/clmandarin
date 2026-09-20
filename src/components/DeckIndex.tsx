import type { Deck } from '../hooks/useDecks';
import { DECK_GLYPH } from '../utils/decks';

/**
 * The built-in decks, above the user's own lists on the Cards tab.
 *
 * A compact grid rather than full-width rows: seven decks as rows pushed the
 * user's own lists below the fold on a phone. The "Built in" label lives on the
 * section heading, so a tile only needs a marker when it has been edited.
 */
export function DeckIndex({
  decks,
  onOpen,
}: {
  decks: Deck[];
  onOpen: (deckId: string) => void;
}) {
  // "My words" is empty until the user adds one — hide it rather than show a
  // permanently empty deck.
  const visible = decks.filter((d) => d.level > 0 || d.wordIds.length > 0);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-0.5 text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
        HSK levels · built in
      </p>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((deck) => (
          <button
            key={deck.id}
            onClick={() => onOpen(deck.id)}
            className="relative flex flex-col items-start gap-0.5 overflow-hidden rounded-2xl border border-cn-border bg-cn-surface px-3 py-2.5 text-left transition-colors hover:border-cn-red/40 dark:border-cn-border-dark dark:bg-cn-surface-dark"
          >
            <span className="pointer-events-none absolute right-1.5 top-0.5 text-2xl font-bold text-cn-red opacity-[0.09]">
              {DECK_GLYPH[deck.level] ?? ''}
            </span>
            <span className="text-[13px] font-black text-cn-ink dark:text-cn-cream">
              {deck.name}
            </span>
            <span className="font-pinyin text-[11px] tabular-nums text-cn-muted dark:text-cn-muted-dark">
              {deck.wordIds.length.toLocaleString()}
              {deck.edited && (
                <span className="ml-1.5 font-black uppercase tracking-wider text-cn-red dark:text-cn-red-light">
                  edited
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
