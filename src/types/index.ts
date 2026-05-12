export interface VocabWord {
  id: string;
  hskLevel: number;   // 0 = untagged custom, 1-6 = HSK level
  number: number;
  hanzi: string;               // simplified
  traditional?: string;        // Taiwan-standard traditional; omitted when identical to hanzi
  pinyin: string;
  english: string;             // displayed (canonical or user-edited)
  englishOriginal?: string;    // canonical backup, set only when user has edited an HSK word
  userNote?: string;           // user's personal note / disambiguation / examples
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
