import type { Deck } from '../hooks/useDecks';

/**
 * The built-in decks, listed above the user's own lists on the Cards tab.
 * A deck showing "Edited" has a saved copy that Reset will discard.
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
        HSK levels
      </p>
      <div className="flex flex-col gap-1.5">
        {visible.map((deck) => (
          <button
            key={deck.id}
            onClick={() => onOpen(deck.id)}
            className="flex items-center gap-3 rounded-2xl border border-cn-border bg-cn-surface px-3.5 py-3 text-left transition-colors hover:border-cn-red/40 dark:border-cn-border-dark dark:bg-cn-surface-dark dark:hover:border-cn-red/40"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-cn-ink dark:text-cn-cream">
                {deck.name}
              </p>
              <p className="text-xs tabular-nums text-cn-muted dark:text-cn-muted-dark">
                {deck.wordIds.length.toLocaleString()} words
              </p>
            </div>
            {deck.edited ? (
              <span className="shrink-0 rounded-full bg-cn-red/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cn-red dark:text-cn-red-light">
                Edited
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-cn-gold/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cn-gold-dark dark:text-cn-gold-light">
                Built in
              </span>
            )}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-cn-muted dark:text-cn-muted-dark">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
