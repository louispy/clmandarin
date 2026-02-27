import { db } from '../db';
import type { FlashcardList, FlashcardListFile, VocabWord } from '../types';
import { getWordsByIds } from './vocab-loader';

export async function exportList(list: FlashcardList): Promise<void> {
  const words = await getWordsByIds(list.wordIds);
  const file: FlashcardListFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    list,
    words,
  };

  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${list.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.clmandarin.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importListFromFile(
  file: File
): Promise<{ list: FlashcardList; words: VocabWord[]; isNew: boolean }> {
  const text = await file.text();
  const data: FlashcardListFile = JSON.parse(text);

  if (data.version !== 1) {
    throw new Error(`Unsupported file version: ${data.version}`);
  }

  // Upsert any words that might not be in DB (from shared lists)
  if (data.words?.length) {
    await db.vocab.bulkPut(data.words);
  }

  const existing = await db.lists.get(data.list.id);
  const now = Date.now();

  const list: FlashcardList = {
    ...data.list,
    updatedAt: now,
  };

  await db.lists.put(list);

  return { list, words: data.words, isNew: !existing };
}

export async function importMultipleFiles(
  files: FileList | File[]
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  for (const file of files) {
    if (!file.name.endsWith('.json')) {
      errors.push(`${file.name}: not a JSON file`);
      continue;
    }
    try {
      await importListFromFile(file);
      imported++;
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return { imported, errors };
}
