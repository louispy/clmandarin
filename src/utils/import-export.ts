import { db } from '../db';
import type { FlashcardList, FlashcardListFile, VocabWord } from '../types';
import { getWordsByIds } from './vocab-loader';
import { uuid } from './uuid';

export async function exportList(list: FlashcardList): Promise<void> {
  const words = await getWordsByIds(list.wordIds);
  // Strip the per-list shareToken — it's a secret used to derive the share-link
  // URL; including it in an export would let any recipient hijack the share.
  const { shareToken: _t, ...listForFile } = list;
  const file: FlashcardListFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    list: listForFile,
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

export async function importListFromBundle(
  data: FlashcardListFile
): Promise<{ list: FlashcardList; words: VocabWord[]; isNew: boolean }> {
  if (data.version !== 1) {
    throw new Error(`Unsupported bundle version: ${data.version}`);
  }

  // Upsert any words that might not be in DB (from shared / imported lists)
  if (data.words?.length) {
    await db.vocab.bulkPut(data.words);
  }

  const existing = await db.lists.get(data.list.id);
  const now = Date.now();
  const list: FlashcardList = { ...data.list, updatedAt: now };

  await db.lists.put(list);

  return { list, words: data.words, isNew: !existing };
}

/**
 * Find a local list that was previously imported from the given source. Used
 * to offer "Replace" vs "Add as a new copy" on re-imports.
 */
export async function findListBySourceId(
  sourceId: string
): Promise<FlashcardList | null> {
  const all = await db.lists.toArray();
  return all.find((l) => l.sourceId === sourceId) ?? null;
}

/**
 * Return a name that doesn't collide with any existing list. If `baseName` is
 * already free, returns it unchanged; otherwise tries `baseName (copy)`,
 * `baseName (copy 2)`, etc. until something fits.
 */
export async function getAvailableListName(baseName: string): Promise<string> {
  const all = await db.lists.toArray();
  const names = new Set(all.map((l) => l.name));
  if (!names.has(baseName)) return baseName;
  const copyName = `${baseName} (copy)`;
  if (!names.has(copyName)) return copyName;
  let i = 2;
  while (names.has(`${baseName} (copy ${i})`)) i++;
  return `${baseName} (copy ${i})`;
}

/**
 * Import a shared bundle (file or share link). Always assigns a fresh local
 * `id` and records the original creator's id under `sourceId`, so the
 * importer's DB never collides with the creator's. Callers wanting to update
 * a previously-imported copy must pass that copy's local id via `replaceLocalId`.
 */
export async function importSharedBundle(
  data: FlashcardListFile,
  options: { replaceLocalId?: string; nameOverride?: string } = {}
): Promise<{ list: FlashcardList; isReplace: boolean }> {
  if (data.version !== 1) {
    throw new Error(`Unsupported bundle version: ${data.version}`);
  }

  if (data.words?.length) {
    await db.vocab.bulkPut(data.words);
  }

  const now = Date.now();
  const isReplace = !!options.replaceLocalId;
  const list: FlashcardList = {
    ...data.list,
    id: options.replaceLocalId ?? uuid(),
    sourceId: data.list.id,
    name: options.nameOverride ?? data.list.name,
    updatedAt: now,
  };

  await db.lists.put(list);
  return { list, isReplace };
}

export async function importListFromFile(
  file: File
): Promise<{ list: FlashcardList; words: VocabWord[]; isNew: boolean }> {
  const text = await file.text();
  const data: FlashcardListFile = JSON.parse(text);
  return importListFromBundle(data);
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
