import { useState } from 'react';
import type { useDecks } from '../hooks/useDecks';
import type { useLists } from '../hooks/useLists';
import { useChengyu } from '../hooks/useChengyu';
import { ChengyuCard } from '../components/ChengyuCard';

const TILE_HANZI: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 0: '我',
};

function QuickLink({
  label,
  glyph,
  count,
  gold,
  onClick,
}: {
  label: string;
  glyph: string;
  count?: number;
  gold?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-2xl border border-cn-border bg-cn-surface px-3 py-3 text-left text-sm font-bold text-cn-ink transition-colors hover:border-cn-red/40 dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${
          gold ? 'bg-cn-gold/15 text-cn-gold-dark dark:text-cn-gold-light' : 'bg-cn-red/10 text-cn-red dark:text-cn-red-light'
        }`}
      >
        {glyph}
      </span>
      <span className="truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto shrink-0 font-pinyin text-[11px] tabular-nums text-cn-muted dark:text-cn-muted-dark">
          {count}
        </span>
      )}
    </button>
  );
}

export function HomeScreen({
  decks,
  lists,
  onSearch,
  onOpenDeck,
  onOpenLists,
  onOpenTexts,
  onBrowse,
  textCount,
}: {
  decks: ReturnType<typeof useDecks>;
  lists: ReturnType<typeof useLists>;
  onSearch: (query: string) => void;
  onOpenDeck: (deckId: string) => void;
  onOpenLists: (listId?: string) => void;
  onOpenTexts: () => void;
  onBrowse: () => void;
  textCount: number;
}) {
  const chengyu = useChengyu();
  const [query, setQuery] = useState('');

  const favorites = lists.favorites;
  const myListCount = lists.lists.filter((l) => l.id !== lists.FAVORITES_ID).length;
  const tiles = decks.decks.filter((d) => d.level > 0 || d.wordIds.length > 0);

  return (
    <div className="flex flex-col gap-4 pt-1">
      <ChengyuCard
        entry={chengyu.entry}
        isToday={chengyu.isToday}
        onReroll={chengyu.reroll}
        loading={chengyu.loading}
        failed={chengyu.failed}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) onSearch(query.trim());
        }}
        className="flex items-center gap-2 rounded-2xl border border-cn-border bg-cn-surface px-4 py-3 focus-within:border-cn-red/50 dark:border-cn-border-dark dark:bg-cn-surface-dark"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-cn-muted dark:text-cn-muted-dark">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 5,000 HSK words…"
          className="w-full bg-transparent text-sm text-cn-ink outline-none placeholder:text-cn-muted dark:text-cn-cream dark:placeholder:text-cn-muted-dark"
          aria-label="Search vocabulary"
        />
      </form>

      <div className="flex flex-col gap-1.5">
        <p className="px-0.5 text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          Levels
        </p>
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((deck) => (
            <button
              key={deck.id}
              onClick={() => onOpenDeck(deck.id)}
              className="relative flex flex-col items-start gap-0.5 overflow-hidden rounded-2xl border border-cn-border bg-cn-surface px-3 py-2.5 text-left transition-colors hover:border-cn-red/40 dark:border-cn-border-dark dark:bg-cn-surface-dark"
            >
              <span className="pointer-events-none absolute right-1.5 top-0.5 text-2xl font-bold text-cn-red opacity-[0.09]">
                {TILE_HANZI[deck.level] ?? ''}
              </span>
              <span className="text-[13px] font-black text-cn-ink dark:text-cn-cream">{deck.name}</span>
              <span className="font-pinyin text-[11px] tabular-nums text-cn-muted dark:text-cn-muted-dark">
                {deck.wordIds.length.toLocaleString()} words
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="px-0.5 text-[10px] font-black uppercase tracking-widest text-cn-muted dark:text-cn-muted-dark">
          Jump to
        </p>
        <div className="grid grid-cols-2 gap-2">
          <QuickLink
            label="Favorites"
            glyph="★"
            gold
            count={favorites?.wordIds.length}
            onClick={() => onOpenLists(lists.FAVORITES_ID)}
          />
          <QuickLink label="My lists" glyph="▤" count={myListCount} onClick={() => onOpenLists()} />
          <QuickLink label="All words" glyph="中" onClick={onBrowse} />
          <QuickLink label="Texts" glyph="文" count={textCount} onClick={onOpenTexts} />
        </div>
      </div>
    </div>
  );
}
