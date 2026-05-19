import { useState, useEffect, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VocabWord, FlashcardList } from '../types';
import type { VisibilityState } from '../hooks/useVisibility';
import { type Script } from '../hooks/useScript';
import { getWordsByIds, stripTones } from '../utils/vocab-loader';
import { WordCard } from './WordCard';

type WordUpdates = { english?: string; userNote?: string; englishOriginal?: string };

function SortableWordCard(props: {
  word: VocabWord;
  isFavorite: boolean;
  onToggleFavorite: (wordId: string) => void;
  lists: FlashcardList[];
  onAddToList: (listId: string, wordId: string) => void;
  onCreateListAndAdd: (name: string, wordId: string) => void;
  onUpdateWord: (id: string, updates: WordUpdates) => Promise<void>;
  script: Script;
  visibility: VisibilityState;
  onRemove: (wordId: string) => void;
  onStudy?: (wordId: string) => void;
  editMode: boolean;
}) {
  const { editMode, onStudy, onRemove, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.word.id, disabled: !editMode });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <WordCard
        {...rest}
        compact
        editMode={editMode}
        dragHandleProps={editMode ? listeners : undefined}
        onRemove={editMode ? onRemove : undefined}
        onClick={!editMode && onStudy ? () => onStudy(props.word.id) : undefined}
      />
    </div>
  );
}

export function SortableWordList({
  wordIds,
  script = 'cn',
  visibility,
  onToggleVisibility,
  lists,
  isFavorite,
  onToggleFavorite,
  onAddToList,
  onCreateListAndAdd,
  onUpdateWord,
  onReorder,
  onRemove,
  onStudyWord,
  onBrowse,
  actions,
}: {
  wordIds: string[];
  script?: Script;
  visibility: VisibilityState;
  onToggleVisibility: (field: keyof VisibilityState) => void;
  lists: FlashcardList[];
  isFavorite: (wordId: string) => boolean;
  onToggleFavorite: (wordId: string) => void;
  onAddToList: (listId: string, wordId: string) => void;
  onCreateListAndAdd: (name: string, wordId: string) => void;
  onUpdateWord: (id: string, updates: WordUpdates) => Promise<void>;
  onReorder: (newIds: string[]) => void;
  onRemove: (wordId: string) => void;
  onStudyWord?: (wordId: string) => void;
  onBrowse?: () => void;
  actions?: React.ReactNode;
}) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);

  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    getWordsByIds(wordIds).then((fetched) => {
      const map = new Map(fetched.map((w) => [w.id, w]));
      setWords(wordIds.map((id) => map.get(id)).filter((w): w is VocabWord => !!w));
    });
  }, [wordIds]);

  // Patch the local snapshot in-place so edits show up the moment the modal
  // closes — wordIds doesn't change on edit, so the fetch effect above never
  // re-runs.
  const handleUpdateWord = useCallback(
    async (id: string, updates: WordUpdates) => {
      await onUpdateWord(id, updates);
      const [fresh] = await getWordsByIds([id]);
      if (!fresh) return;
      setWords((prev) => {
        const idx = prev.findIndex((w) => w.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = fresh;
        return next;
      });
    },
    [onUpdateWord]
  );

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, words.length));
  }, [words.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = wordIds.indexOf(active.id as string);
    const newIndex = wordIds.indexOf(over.id as string);
    onReorder(arrayMove(wordIds, oldIndex, newIndex));
  };

  const q = search.toLowerCase().trim();
  const qPlain = stripTones(q);
  const filtered = q
    ? words.filter(
        (w) =>
          w.hanzi.includes(q) ||
          (w.traditional?.includes(q) ?? false) ||
          w.pinyin.toLowerCase().includes(q) ||
          stripTones(w.pinyin.toLowerCase()).includes(qPlain) ||
          w.english.toLowerCase().includes(q)
      )
    : words;

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-cn-border py-12 dark:border-cn-border-dark">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-12 w-12 text-cn-muted/30 dark:text-cn-muted-dark/30">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <p className="text-cn-muted dark:text-cn-muted-dark">
          No words yet
        </p>
        {onBrowse && (
          <button
            onClick={onBrowse}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cn-red px-4 py-2 text-sm font-bold text-white shadow-md shadow-cn-red/20 transition-all hover:bg-cn-red-dark hover:shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            Browse vocab to add
          </button>
        )}
      </div>
    );
  }

  const renderCard = (word: VocabWord, enableSort: boolean) => (
    <SortableWordCard
      key={word.id}
      word={word}
      isFavorite={isFavorite(word.id)}
      onToggleFavorite={onToggleFavorite}
      lists={lists}
      onAddToList={onAddToList}
      onCreateListAndAdd={onCreateListAndAdd}
      onUpdateWord={handleUpdateWord}
      script={script}
      visibility={visibility}
      onRemove={onRemove}
      onStudy={onStudyWord}
      editMode={enableSort && editMode}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Search within list */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cn-muted/50 dark:text-cn-muted-dark/50">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search in list..."
          className="w-full rounded-xl border border-cn-border bg-cn-surface py-2.5 pl-10 pr-4 text-sm text-cn-ink outline-none transition-colors placeholder:text-cn-muted/40 focus:border-cn-red dark:border-cn-border-dark dark:bg-cn-surface-dark dark:text-cn-cream dark:placeholder:text-cn-muted-dark/40 dark:focus:border-cn-red-light"
        />
        {search && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cn-muted dark:text-cn-muted-dark">
            {filtered.length} / {words.length}
          </span>
        )}
      </div>

      {/* Sticky toolbar: Show toggles + Edit/Done + Study */}
      <div className="sticky top-[49px] z-30 -mx-4 flex items-center justify-between gap-2 bg-cn-paper/95 px-4 pb-2 pt-4 backdrop-blur dark:bg-cn-paper-dark/95">
        {editMode ? (
          <span className="text-xs text-cn-muted dark:text-cn-muted-dark">
            Drag to reorder · tap <span className="font-bold text-cn-red dark:text-cn-red-light">Done</span> to exit
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-cn-muted dark:text-cn-muted-dark">
              Show:
            </span>
            {(['hanzi', 'pinyin', 'english'] as const).map((field) => (
              <button
                key={field}
                onClick={() => onToggleVisibility(field)}
                className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                  visibility[field]
                    ? 'bg-cn-red/10 text-cn-red dark:bg-cn-red/20 dark:text-cn-red-light'
                    : 'bg-cn-surface text-cn-muted/40 dark:bg-cn-surface-dark dark:text-cn-muted-dark/40'
                }`}
              >
                {field === 'hanzi' ? '字' : field === 'pinyin' ? 'Pīn' : 'Eng'}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {!q && (
            <button
              onClick={() => setEditMode((e) => !e)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-colors sm:py-2 ${
                editMode
                  ? 'bg-cn-red text-white shadow-md shadow-cn-red/20'
                  : 'bg-cn-surface text-cn-muted hover:text-cn-ink dark:bg-cn-surface-dark dark:text-cn-muted-dark dark:hover:text-cn-cream'
              }`}
              title={editMode ? 'Done' : 'Edit list'}
            >
              {!editMode && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                </svg>
              )}
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
          {!editMode && actions}
        </div>
      </div>

      {q ? (
        /* When searching, show flat list (no drag) */
        <div className="flex flex-col gap-2">
          {filtered.slice(0, visibleCount).map((word) => renderCard(word, false))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-cn-muted dark:text-cn-muted-dark">
              No matches in this list
            </p>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={words.slice(0, visibleCount).map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {words.slice(0, visibleCount).map((word) => renderCard(word, true))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {(q ? filtered.length : words.length) > visibleCount && (
        <div ref={sentinelRef} className="h-1" />
      )}

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-cn-red p-3 text-white shadow-lg shadow-cn-red/30 transition-all hover:bg-cn-red-dark hover:shadow-xl active:scale-95"
          title="Scroll to top"
          aria-label="Scroll to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
