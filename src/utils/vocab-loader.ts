import { db } from '../db';
import type { VocabWord } from '../types';

/** Strip tone marks: ǐ → i, ā → a, ü → u, etc. */
export function stripTones(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'u');
}

export async function loadVocabIntoDb(): Promise<void> {
  const count = await db.vocab.count();
  if (count > 0) return; // already loaded

  const response = await fetch(`${import.meta.env.BASE_URL}data/hsk-all.json`);
  const allWords = (await response.json()) as VocabWord[];
  await db.vocab.bulkAdd(allWords);
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
