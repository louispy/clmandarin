import Dexie, { type EntityTable } from 'dexie';
import type { VocabWord, FlashcardList } from '../types';

const db = new Dexie('clmandarin') as Dexie & {
  vocab: EntityTable<VocabWord, 'id'>;
  lists: EntityTable<FlashcardList, 'id'>;
};

db.version(1).stores({
  vocab: 'id, hskLevel, hanzi, pinyin',
  lists: 'id, name, updatedAt',
});

export { db };
