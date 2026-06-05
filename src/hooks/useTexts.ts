import { useState, useEffect, useCallback } from 'react';
import { db } from '../db';
import type { MandarinText, MandarinTextFile } from '../types';
import { uuid } from '../utils/uuid';

export async function findTextBySourceId(sourceId: string): Promise<MandarinText | null> {
  const all = await db.texts.toArray();
  return all.find((t) => t.sourceId === sourceId) ?? null;
}

// Return a title that doesn't collide with any existing text, mirroring
// getAvailableListName: baseTitle, then "baseTitle (copy)", "(copy 2)", …
// `ignoreId` excludes the record being replaced so a replace doesn't fight its
// own title.
export async function getAvailableTitle(baseTitle: string, ignoreId?: string): Promise<string> {
  const all = await db.texts.toArray();
  const titles = new Set(all.filter((t) => t.id !== ignoreId).map((t) => t.title));
  if (!titles.has(baseTitle)) return baseTitle;
  const copy = `${baseTitle} (copy)`;
  if (!titles.has(copy)) return copy;
  let i = 2;
  while (titles.has(`${baseTitle} (copy ${i})`)) i++;
  return `${baseTitle} (copy ${i})`;
}

export function useTexts() {
  const [texts, setTexts] = useState<MandarinText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const all = await db.texts.orderBy('updatedAt').reverse().toArray();
    setTexts(all);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Default to the most recently updated text until the user picks one.
  let activeTextId = selectedTextId;
  if (activeTextId === null && texts.length > 0) {
    activeTextId = texts[0].id;
  }
  const activeText = texts.find((t) => t.id === activeTextId) ?? null;

  const createText = useCallback(
    async (title: string, body: string) => {
      const now = Date.now();
      const text: MandarinText = {
        id: uuid(),
        title,
        body,
        translations: {},
        createdAt: now,
        updatedAt: now,
      };
      await db.texts.add(text);
      await refresh();
      return text;
    },
    [refresh]
  );

  const updateText = useCallback(
    async (id: string, updates: Partial<Pick<MandarinText, 'title' | 'body'>>) => {
      await db.texts.update(id, { ...updates, updatedAt: Date.now() });
      await refresh();
    },
    [refresh]
  );

  const setTranslation = useCallback(
    async (id: string, sentenceIndex: number, value: string) => {
      const text = await db.texts.get(id);
      if (!text) return;
      const translations = { ...text.translations };
      const trimmed = value.trim();
      if (trimmed) translations[sentenceIndex] = trimmed;
      else delete translations[sentenceIndex];
      await db.texts.update(id, { translations, updatedAt: Date.now() });
      await refresh();
    },
    [refresh]
  );

  // Import a shared text bundle. Replaces an existing local copy in place when
  // replaceLocalId is given (same-source re-import); otherwise adds a new text.
  const importSharedText = useCallback(
    async (
      file: MandarinTextFile,
      opts: { replaceLocalId?: string; titleOverride?: string } = {}
    ) => {
      const now = Date.now();
      const src = file.text;
      const id = opts.replaceLocalId ?? uuid();
      const existing = opts.replaceLocalId != null ? await db.texts.get(opts.replaceLocalId) : null;
      const created = existing?.createdAt ?? now;
      // Title resolution mirrors flashcard import: an explicit override wins;
      // a replace preserves the local title (any rename the user made); a new /
      // copy import auto-disambiguates against existing titles so the selector
      // never shows two identically-named texts.
      const title = opts.titleOverride?.trim()
        ? opts.titleOverride.trim()
        : existing
          ? existing.title
          : await getAvailableTitle(src.title);
      const text: MandarinText = {
        id,
        title,
        body: src.body,
        translations: src.translations ?? {},
        sourceId: src.id,
        createdAt: created,
        updatedAt: now,
      };
      await db.texts.put(text);
      await refresh();
      return text;
    },
    [refresh]
  );

  const deleteText = useCallback(
    async (id: string) => {
      await db.texts.delete(id);
      setSelectedTextId((curr) => (curr === id ? null : curr));
      await refresh();
    },
    [refresh]
  );

  return {
    texts,
    activeText,
    activeTextId,
    setActiveTextId: setSelectedTextId,
    createText,
    updateText,
    setTranslation,
    importSharedText,
    deleteText,
    refresh,
  };
}
