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
import type { VisibilityState } from '../hooks/useVisibility';
import { displayHanzi, type Script } from '../hooks/useScript';
import { getWordsByIds, stripTones } from '../utils/vocab-loader';
import { speak } from '../utils/speech';
import { NoAudioModal } from './NoAudioModal';

function SortableItem({
  word,
  script,
  visibility,
  onRemove,
  onStudy,
}: {
  word: VocabWord;
  script: Script;
  visibility: VisibilityState;
  onRemove: (id: string) => void;
  onStudy?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: word.id });
  const [showNoAudio, setShowNoAudio] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await speak(word.hanzi);
    if (!ok) setShowNoAudio(true);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 rounded-xl border border-cn-border bg-cn-surface px-4 py-3 dark:border-cn-border-dark dark:bg-cn-surface-dark"
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1.5 cursor-grab touch-none text-cn-muted/40 hover:text-cn-muted dark:text-cn-muted-dark/40 dark:hover:text-cn-muted-dark"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 4.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onStudy?.(word.id)}>
        {visibility.hanzi ? (
          <p className="text-2xl font-bold text-cn-ink dark:text-cn-cream">{displayHanzi(word, script)}</p>
        ) : (
          <p className="text-2xl font-bold text-cn-muted/30 dark:text-cn-muted-dark/30">· · ·</p>
        )}
        {visibility.pinyin ? (
          <p className="mt-0.5 text-base font-medium text-cn-red dark:text-cn-red-light">{word.pinyin}</p>
        ) : (
          <p className="mt-0.5 text-base text-cn-muted/30 dark:text-cn-muted-dark/30">· · ·</p>
        )}
        {visibility.english ? (
          <p className="mt-0.5 text-sm text-cn-muted dark:text-cn-muted-dark">{word.english || '—'}</p>
        ) : (
          <p className="mt-0.5 text-sm text-cn-muted/30 dark:text-cn-muted-dark/30">· · ·</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={handleSpeak}
          className="rounded-lg p-1.5 text-cn-muted/40 transition-colors hover:text-cn-red dark:text-cn-muted-dark/40 dark:hover:text-cn-red-light"
          title="Play pronunciation"
          aria-label="Play pronunciation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M10 3.75a.75.75 0 0 0-1.264-.546L4.703 7H3.167a.75.75 0 0 0-.7.48A6.985 6.985 0 0 0 2 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.061 5.5 5.5 0 0 1 0 7.778.75.75 0 1 0 1.06 1.06 7 7 0 0 0 0-9.899Z" />
            <path d="M13.829 7.172a.75.75 0 0 0-1.061 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 1 0 1.06 1.06 4 4 0 0 0 0-5.656Z" />
          </svg>
        </button>
        <button
          onClick={() => onRemove(word.id)}
          className="rounded-lg p-1.5 text-cn-muted/40 transition-colors hover:text-cn-red dark:text-cn-muted-dark/40 dark:hover:text-cn-red-light"
          title="Remove from list"
          aria-label="Remove from list"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
      {showNoAudio && <NoAudioModal onClose={() => setShowNoAudio(false)} />}
    </div>
  );
}

export function SortableWordList({
  wordIds,
  script = 'cn',
  visibility,
  onToggleVisibility,
  onReorder,
  onRemove,
  onStudyWord,
}: {
  wordIds: string[];
  script?: Script;
  visibility: VisibilityState;
  onToggleVisibility: (field: keyof VisibilityState) => void;
  onReorder: (newIds: string[]) => void;
  onRemove: (wordId: string) => void;
  onStudyWord?: (wordId: string) => void;
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
          {filtered.map((word) => (
            <SortableItem key={word.id} word={word} script={script} visibility={visibility} onRemove={onRemove} onStudy={onStudyWord} />
          ))}
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
              {words.map((word) => (
                <SortableItem key={word.id} word={word} script={script} visibility={visibility} onRemove={onRemove} onStudy={onStudyWord} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
