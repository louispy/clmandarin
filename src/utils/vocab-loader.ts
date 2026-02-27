import { db } from '../db';
import type { VocabWord } from '../types';

const HSK_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export async function loadVocabIntoDb(): Promise<void> {
  const count = await db.vocab.count();
  if (count > 0) return; // already loaded

  for (const level of HSK_LEVELS) {
    const response = await fetch(`${import.meta.env.BASE_URL}data/hsk-${level}.json`);
    const words: VocabWord[] = await response.json();
    await db.vocab.bulkPut(words);
  }
}

export async function getWordsByLevel(level: number): Promise<VocabWord[]> {
  return db.vocab.where('hskLevel').equals(level).sortBy('number');
}

export async function getWordsByIds(ids: string[]): Promise<VocabWord[]> {
  const words = await db.vocab.bulkGet(ids);
  return words.filter((w): w is VocabWord => w !== undefined);
}

export async function searchWords(query: string): Promise<VocabWord[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return db.vocab
    .filter(
      (w) =>
        w.hanzi.includes(q) ||
        w.pinyin.toLowerCase().includes(q) ||
        w.english.toLowerCase().includes(q)
    )
    .limit(50)
    .toArray();
}
