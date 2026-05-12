import { db } from '../db';
import type { VocabWord } from '../types';

/** Strip tone marks: ǐ → i, ā → a, ü → u, etc. */
export function stripTones(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'u');
}

const DATA_VERSION = 2;
const DATA_VERSION_KEY = 'clmandarin-data-version';

export async function loadVocabIntoDb(): Promise<void> {
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  const upToDate = storedVersion === String(DATA_VERSION);
  const count = await db.vocab.count();

  if (count > 0 && upToDate) return;

  const response = await fetch(`${import.meta.env.BASE_URL}data/hsk-all.json`);
  const allWords = (await response.json()) as VocabWord[];

  if (count === 0) {
    await db.vocab.bulkAdd(allWords);
  } else {
    // Merge in new canonical fields while preserving user edits (englishOriginal, userNote, custom english)
    const existing = await db.vocab.bulkGet(allWords.map((w) => w.id));
    const merged: VocabWord[] = allWords.map((next, i) => {
      const old = existing[i];
      if (!old || old.source === 'custom') return old ?? next;
      const result: VocabWord = { ...next };
      if (old.englishOriginal) {
        // User has edited english — keep their version, refresh the canonical
        result.english = old.english;
        result.englishOriginal = next.english;
      }
      if (old.userNote) result.userNote = old.userNote;
      return result;
    });
    await db.vocab.bulkPut(merged);
  }

  localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
}

export async function getAllWords(): Promise<VocabWord[]> {
  return db.vocab.orderBy('id').toArray();
}

export async function getWordsByLevel(level: number): Promise<VocabWord[]> {
  return db.vocab.where('hskLevel').equals(level).sortBy('number');
}

export async function getWordsByLevels(levels: number[]): Promise<VocabWord[]> {
  return db.vocab.where('hskLevel').anyOf(levels).sortBy('id');
}

export async function getFilteredWords(opts: {
  levels: number[];
  showCustom: boolean;
}): Promise<VocabWord[]> {
  if (opts.levels.length === 0 && !opts.showCustom) {
    return getAllWords();
  }
  const results = new Map<string, VocabWord>();
  if (opts.levels.length > 0) {
    const byLevel = await db.vocab.where('hskLevel').anyOf(opts.levels).toArray();
    byLevel.forEach((w) => results.set(w.id, w));
  }
  if (opts.showCustom) {
    const customs = await db.vocab.filter((w) => w.source === 'custom').toArray();
    customs.forEach((w) => results.set(w.id, w));
  }
  return Array.from(results.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export async function updateWord(
  id: string,
  updates: Partial<Pick<VocabWord, 'english' | 'userNote' | 'englishOriginal'>>
): Promise<void> {
  const word = await db.vocab.get(id);
  if (!word) return;

  const next: VocabWord = { ...word, ...updates };

  // Auto-stash original english on first user edit of an HSK word
  const isExplicitOriginalChange = 'englishOriginal' in updates;
  if (
    !isExplicitOriginalChange &&
    updates.english !== undefined &&
    word.source !== 'custom' &&
    !word.englishOriginal &&
    updates.english !== word.english
  ) {
    next.englishOriginal = word.english;
  }

  // Clean up empty optional fields so they don't litter the record
  if (!next.englishOriginal) delete next.englishOriginal;
  if (!next.userNote || !next.userNote.trim()) delete next.userNote;

  await db.vocab.put(next);
}

export async function addCustomWord(input: {
  hanzi: string;
  pinyin: string;
  english: string;
  hskLevel: number;
}): Promise<VocabWord> {
  const word: VocabWord = {
    id: `custom-${crypto.randomUUID()}`,
    hskLevel: input.hskLevel,
    number: 0,
    hanzi: input.hanzi.trim(),
    pinyin: input.pinyin.trim(),
    english: input.english.trim(),
    source: 'custom',
    createdAt: Date.now(),
  };
  await db.vocab.add(word);
  return word;
}

export async function getWordsByIds(ids: string[]): Promise<VocabWord[]> {
  const words = await db.vocab.bulkGet(ids);
  return words.filter((w): w is VocabWord => w !== undefined);
}

export async function searchWords(query: string): Promise<VocabWord[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const qPlain = stripTones(q);
  return db.vocab
    .filter(
      (w) =>
        w.hanzi.includes(q) ||
        w.pinyin.toLowerCase().includes(q) ||
        stripTones(w.pinyin.toLowerCase()).includes(qPlain) ||
        w.english.toLowerCase().includes(q)
    )
    .limit(50)
    .toArray();
}
