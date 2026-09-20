import { useState, useCallback, useRef, useEffect } from 'react';
import { useVocab } from './hooks/useVocab';
import { useLists } from './hooks/useLists';
import { useTexts } from './hooks/useTexts';
import { useDarkMode } from './hooks/useDarkMode';
import { useVisibility } from './hooks/useVisibility';
import { useScript } from './hooks/useScript';
import { useReverse } from './hooks/useReverse';
import { useRoute } from './hooks/useRoute';
import { useDecks } from './hooks/useDecks';
import { AppHeader } from './components/AppHeader';
import { FlashcardViewer } from './components/FlashcardViewer';
import { ImportShareModal } from './components/ImportShareModal';
import { ImportTextShareModal } from './components/ImportTextShareModal';
import { BrowseScreen } from './screens/BrowseScreen';
import { CardsScreen } from './screens/CardsScreen';
import { TextsScreen } from './screens/TextsScreen';
import { db } from './db';
import type { VocabWord } from './types';

const FAVORITES_ID = '__favorites__';

/** Capture a share param before the URL is cleaned up, so a refresh can't re-trigger the import. */
function readShareParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export function App() {
  const vocab = useVocab();
  const lists = useLists();
  const texts = useTexts();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { visibility, toggle: toggleVisibility } = useVisibility();
  const { script, toggle: toggleScript } = useScript();
  const { reverse, toggle: toggleReverse } = useReverse();
  const { route, navigate } = useRoute();
  const decks = useDecks({ dbReady: vocab.dbReady });

  // Reader toggles live here rather than in TextsScreen: that screen unmounts
  // on every tab switch, and resetting the reader each time would be a
  // regression. Both default off.
  const [textShowPinyin, setTextShowPinyin] = useState(false);
  const [textShowTranslation, setTextShowTranslation] = useState(false);

  const [studyWords, setStudyWords] = useState<VocabWord[] | null>(null);
  const [studyListName, setStudyListName] = useState('');
  const [studyStartIndex, setStudyStartIndex] = useState<number | undefined>(undefined);
  const [shareCode, setShareCode] = useState<string | null>(() => readShareParam('share'));
  const [textShareCode, setTextShareCode] = useState<string | null>(() => readShareParam('text'));
  const scrollPosRef = useRef(0);

  // Strip the share param from the URL once we've captured it so a refresh
  // doesn't re-trigger the import prompt, but keep everything else (e.g. PWA
  // scope). `share` is a list, `text` is a reading text.
  useEffect(() => {
    if (!shareCode && !textShareCode) return;
    const url = new URL(window.location.href);
    let changed = false;
    for (const param of ['share', 'text'] as const) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    }
    if (changed) window.history.replaceState({}, '', url.toString());
  }, [shareCode, textShareCode]);

  // Enter the flashcard overlay. Remembers the scroll position so closing the
  // overlay puts the user back where they were.
  const startStudy = useCallback(
    (words: VocabWord[], label: string, startIndex?: number) => {
      scrollPosRef.current = window.scrollY;
      setStudyWords(words);
      setStudyListName(label);
      setStudyStartIndex(startIndex);
    },
    []
  );

  const handleAddCustomWord = useCallback(
    async (input: { hanzi: string; pinyin: string; english: string; hskLevel: number }) => {
      const word = await vocab.addCustomWord(input);
      await decks.refresh();
      return word;
    },
    [vocab, decks]
  );

  const handleDeleteCustomWord = useCallback(
    async (wordId: string) => {
      await vocab.deleteCustomWord(wordId);
      await lists.removeWordFromAllLists(wordId);
      await decks.refresh();
    },
    [vocab, lists, decks]
  );

  // Update a word and immediately reflect the change in the active study set
  // so the flashcard re-renders without needing to exit and re-enter.
  const handleStudyWordUpdate = useCallback(
    async (id: string, updates: { english?: string; userNote?: string; englishOriginal?: string }) => {
      await vocab.updateWord(id, updates);
      const fresh = await db.vocab.get(id);
      if (!fresh) return;
      setStudyWords((prev) => prev?.map((w) => (w.id === id ? fresh : w)) ?? null);
    },
    [vocab]
  );

  if (vocab.loading) {
    return (
      <div className={dark ? 'dark' : ''}>
        <div className="flex min-h-screen items-center justify-center bg-cn-paper dark:bg-cn-paper-dark">
          <div className="flex flex-col items-center gap-3">
            <p className="text-5xl">&#23398;</p>
            <p className="text-cn-muted dark:text-cn-muted-dark">Loading vocabulary...</p>
          </div>
        </div>
      </div>
    );
  }

  // First-load failure (e.g. service-worker / fetch race on a fresh device).
  // Without this branch the user gets stuck on the inline VocabBrowser spinner.
  if (vocab.error && !vocab.dbReady) {
    return (
      <div className={dark ? 'dark' : ''}>
        <div className="flex min-h-screen items-center justify-center bg-cn-paper px-6 dark:bg-cn-paper-dark">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <p className="text-5xl">&#23398;</p>
            <p className="font-bold text-cn-ink dark:text-cn-cream">Couldn&rsquo;t load vocabulary</p>
            <p className="text-sm text-cn-muted dark:text-cn-muted-dark">{vocab.error}</p>
            <button
              onClick={vocab.retry}
              className="rounded-xl bg-cn-red px-6 py-2.5 font-bold text-white shadow-lg shadow-cn-red/30 transition-all hover:bg-cn-red-dark hover:shadow-xl"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (studyWords) {
    return (
      <div className={dark ? 'dark' : ''}>
        <FlashcardViewer
          words={studyWords}
          listName={studyListName}
          onClose={() => {
            setStudyWords(null);
            setStudyStartIndex(undefined);
            requestAnimationFrame(() => window.scrollTo(0, scrollPosRef.current));
          }}
          dark={dark}
          onToggleDark={toggleDark}
          script={script}
          onToggleScript={toggleScript}
          reverse={reverse}
          onToggleReverse={toggleReverse}
          onUpdateWord={handleStudyWordUpdate}
          startIndex={studyStartIndex}
        />
      </div>
    );
  }

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-cn-paper dark:bg-cn-paper-dark">
        <AppHeader
          route={route}
          onNavigate={navigate}
          badges={{
            cards: lists.lists.filter((l) => l.id !== FAVORITES_ID).length,
            texts: texts.texts.length,
          }}
          script={script}
          onToggleScript={toggleScript}
          reverse={reverse}
          onToggleReverse={toggleReverse}
          dark={dark}
          onToggleDark={toggleDark}
        />

        <main className="mx-auto max-w-3xl px-4 pb-4 pt-2">
          {route.tab === 'browse' && (
            <BrowseScreen
              vocab={vocab}
              lists={lists}
              script={script}
              visibility={visibility}
              onToggleVisibility={toggleVisibility}
              onAddCustomWord={handleAddCustomWord}
              onDeleteCustomWord={handleDeleteCustomWord}
              onStartStudy={startStudy}
            />
          )}

          {route.tab === 'cards' && (
            <CardsScreen
              vocab={vocab}
              lists={lists}
              decks={decks}
              openDeckId={route.deckId ?? null}
              onOpenDeck={(deckId) => navigate({ tab: 'cards', deckId })}
              onCloseDeck={() => navigate({ tab: 'cards' })}
              script={script}
              visibility={visibility}
              onToggleVisibility={toggleVisibility}
              onDeleteCustomWord={handleDeleteCustomWord}
              onStartStudy={startStudy}
              onBrowse={() => navigate({ tab: 'browse' })}
              onImportFromCode={setShareCode}
            />
          )}

          {route.tab === 'texts' && (
            <TextsScreen
              texts={texts}
              showPinyin={textShowPinyin}
              onTogglePinyin={() => setTextShowPinyin((v) => !v)}
              showTranslation={textShowTranslation}
              onToggleTranslation={() => setTextShowTranslation((v) => !v)}
              onImportFromCode={setTextShareCode}
            />
          )}
        </main>
      </div>

      {shareCode && (
        <ImportShareModal
          code={shareCode}
          onClose={() => setShareCode(null)}
          onImported={(listId) => {
            lists.refresh();
            vocab.refresh();
            decks.refresh();
            lists.setActiveListId(listId);
            navigate({ tab: 'cards' });
            setShareCode(null);
          }}
        />
      )}

      {textShareCode && (
        <ImportTextShareModal
          code={textShareCode}
          onImport={texts.importSharedText}
          onClose={() => setTextShareCode(null)}
          onImported={(textId) => {
            texts.setActiveTextId(textId);
            navigate({ tab: 'texts' });
            setTextShareCode(null);
          }}
        />
      )}
    </div>
  );
}
