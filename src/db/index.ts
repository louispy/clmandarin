import Dexie, { type EntityTable } from 'dexie';
import type { VocabWord, FlashcardList, MandarinText } from '../types';

const db = new Dexie('clmandarin') as Dexie & {
  vocab: EntityTable<VocabWord, 'id'>;
  lists: EntityTable<FlashcardList, 'id'>;
  texts: EntityTable<MandarinText, 'id'>;
};

db.version(1).stores({
  vocab: 'id, hskLevel, hanzi, pinyin',
  lists: 'id, name, updatedAt',
});

// v2: user-authored reading texts (the "Texts" feature). Additive — existing
// vocab/lists stores are unchanged, so no data migration is required.
db.version(2).stores({
  vocab: 'id, hskLevel, hanzi, pinyin',
  lists: 'id, name, updatedAt',
  texts: 'id, title, updatedAt',
});

export { db };
