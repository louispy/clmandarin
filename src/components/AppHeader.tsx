import type { Route, Tab } from '../hooks/useRoute';
import type { Script } from '../hooks/useScript';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'browse', label: 'Home' },
  { tab: 'cards', label: 'Cards' },
  { tab: 'texts', label: 'Texts' },
];

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-2 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cn-gold text-[9px] font-black text-white">
      {count}
    </span>
  );
}

export function AppHeader({
  route,
  onNavigate,
  badges,
  script,
  onToggleScript,
  reverse,
  onToggleReverse,
  dark,
  onToggleDark,
}: {
  route: Route;
  onNavigate: (next: Route) => void;
  badges: Partial<Record<Tab, number>>;
  script: Script;
  onToggleScript: () => void;
  reverse: boolean;
  onToggleReverse: () => void;
  dark: boolean;
  onToggleDark: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-cn-border bg-cn-paper/95 backdrop-blur dark:border-cn-border-dark dark:bg-cn-paper-dark/95">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 px-2 py-3 sm:gap-2 sm:px-4">
        <h1 className="shrink-0 whitespace-nowrap text-2xl font-black tracking-tight text-cn-red dark:text-cn-red-light sm:text-3xl">
          CL<span className="text-cn-gold">&#20013;</span>M
        </h1>

        <div className="flex items-center gap-0.5 sm:gap-2">
          <div className="grid grid-cols-3 gap-0.5 rounded-xl border border-cn-border bg-cn-surface p-0.5 dark:border-cn-border-dark dark:bg-cn-surface-dark">
            {TABS.map(({ tab, label }) => (
              <button
                key={tab}
                onClick={() => onNavigate({ tab } as Route)}
                className={`relative rounded-lg px-2 py-1.5 text-xs font-bold transition-all sm:px-3 sm:text-sm ${
                  route.tab === tab
                    ? 'bg-cn-red text-white shadow-sm shadow-cn-red/20'
                    : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
                }`}
              >
                {label}
                <TabBadge count={badges[tab] ?? 0} />
              </button>
            ))}
          </div>

          {/* Script toggle */}
          <button
            onClick={onToggleScript}
            className={`rounded-xl px-1.5 py-1 text-xs font-bold transition-colors sm:px-2 sm:text-sm ${
              script === 'tw'
                ? 'text-cn-red dark:text-cn-red-light'
                : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
            }`}
            title={script === 'cn' ? 'Show traditional (繁)' : 'Show simplified (简)'}
            aria-label="Toggle script"
          >
            {script === 'cn' ? '简' : '繁'}
          </button>

          {/* Reverse mode toggle (flashcards study direction) */}
          <button
            onClick={onToggleReverse}
            className={`shrink-0 whitespace-nowrap rounded-xl px-1.5 py-1 text-[10px] font-bold transition-colors sm:px-2 sm:text-sm ${
              reverse
                ? 'text-cn-red dark:text-cn-red-light'
                : 'text-cn-muted hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream'
            }`}
            title={reverse ? 'Flashcards: English → Hanzi (tap to switch)' : 'Flashcards: Hanzi → English (tap to switch)'}
            aria-label="Toggle reverse mode"
          >
            {reverse ? 'EN→中' : '中→EN'}
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="rounded-xl p-1.5 text-cn-muted transition-colors hover:text-cn-ink dark:text-cn-muted-dark dark:hover:text-cn-cream sm:p-2"
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.061l1.061-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.061 1.06l1.06 1.061ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
