import { useState, useEffect } from 'react';
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
  sortable: boolean;
}) {
  const { sortable, onStudy, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.word.id, disabled: !sortable });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <WordCard
        {...rest}
        dragHandleProps={sortable ? { ...attributes, ...listeners } : undefined}
        onClick={onStudy ? () => onStudy(props.word.id) : undefined}
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
}) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getWordsByIds(wordIds).then((fetched) => {
      const map = new Map(fetched.map((w) => [w.id, w]));
      setWords(wordIds.map((id) => map.get(id)).filter((w): w is VocabWord => !!w));
    });
  }, [wordIds]);

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

  const renderCard = (word: VocabWord, sortable: boolean) => (
    <SortableWordCard
      key={word.id}
      word={word}
      isFavorite={isFavorite(word.id)}
      onToggleFavorite={onToggleFavorite}
      lists={lists}
      onAddToList={onAddToList}
      onCreateListAndAdd={onCreateListAndAdd}
      onUpdateWord={onUpdateWord}
      script={script}
      visibility={visibility}
      onRemove={onRemove}
      onStudy={onStudyWord}
      sortable={sortable}
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

      {/* Visibility toggle */}
      <div className="flex items-center gap-1 px-1">
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

      {q ? (
        /* When searching, show flat list (no drag) */
        <div className="flex flex-col gap-2">
          {filtered.map((word) => renderCard(word, false))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-cn-muted dark:text-cn-muted-dark">
              No matches in this list
            </p>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={wordIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {words.map((word) => renderCard(word, true))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
