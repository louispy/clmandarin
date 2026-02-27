export interface VocabWord {
  id: string;
  hskLevel: number;
  number: number;
  hanzi: string;
  pinyin: string;
  english: string;
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
