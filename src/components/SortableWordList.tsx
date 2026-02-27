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
import type { VocabWord } from '../types';
import { getWordsByIds } from '../utils/vocab-loader';

function SortableItem({
  word,
  onRemove,
}: {
  word: VocabWord;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: word.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-cn-border bg-cn-surface px-4 py-3 dark:border-cn-border-dark dark:bg-cn-surface-dark"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-cn-muted/40 hover:text-cn-muted dark:text-cn-muted-dark/40 dark:hover:text-cn-muted-dark"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <span className="text-2xl font-bold text-cn-ink dark:text-cn-cream">{word.hanzi}</span>
        <span className="ml-3 text-lg text-cn-red dark:text-cn-red-light">{word.pinyin}</span>
        {word.english && (
          <span className="ml-3 text-base text-cn-muted dark:text-cn-muted-dark">{word.english}</span>
        )}
      </div>
      <button
        onClick={() => onRemove(word.id)}
        className="shrink-0 rounded-lg p-2 text-cn-muted/40 transition-colors hover:text-cn-red dark:text-cn-muted-dark/40 dark:hover:text-cn-red-light"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
    </div>
  );
}

export function SortableWordList({
  wordIds,
  onReorder,
  onRemove,
}: {
  wordIds: string[];
  onReorder: (newIds: string[]) => void;
  onRemove: (wordId: string) => void;
}) {
  const [words, setWords] = useState<VocabWord[]>([]);

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

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-cn-border py-12 dark:border-cn-border-dark">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-12 w-12 text-cn-muted/30 dark:text-cn-muted-dark/30">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <p className="text-cn-muted dark:text-cn-muted-dark">
          No words yet. Browse vocab and add some!
        </p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={wordIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {words.map((word) => (
            <SortableItem key={word.id} word={word} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
