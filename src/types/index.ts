export interface VocabWord {
  id: string;
  hskLevel: number;   // 0 = untagged custom, 1-6 = HSK level
  number: number;
  hanzi: string;
  pinyin: string;
  english: string;
  source?: 'custom';
  createdAt?: number;
}

export interface FlashcardList {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  wordIds: string[];
}

export interface FlashcardListFile {
  version: 1;
  exportedAt: string;
  list: FlashcardList;
  words: VocabWord[];
}
