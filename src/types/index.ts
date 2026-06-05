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
  // Original creator's list id, set when the list was imported from a file or
  // share link. Used to recognize re-imports of the same source so the user
  // can choose between updating in place or saving as a new copy.
  sourceId?: string;
  // Per-list secret used to derive a stable share-link code as
  // sha256(id + shareToken). Lazily generated on first share, persisted in
  // IndexedDB. Never sent to the Worker or included in exports — only the
  // owner's device can recompute the URL.
  shareToken?: string;
}

export interface FlashcardListFile {
  version: 1;
  exportedAt: string;
  list: FlashcardList;
  words: VocabWord[];
}

// A user-authored Mandarin reading text. The body is raw hanzi; pinyin is
// auto-derived for display (never stored), and translations are the user's own
// per-sentence notes keyed by sentence index (see splitSentences).
export interface MandarinText {
  id: string;                          // UUID
  title: string;
  body: string;                        // raw hanzi the user entered
  translations: Record<number, string>; // sentence index → manual translation
  createdAt: number;
  updatedAt: number;
  // Original creator's text id, set when imported from a share link. Used to
  // recognize re-imports of the same source (mirrors FlashcardList.sourceId).
  sourceId?: string;
  // Per-text secret for deriving a stable share code. Never exported or shared.
  shareToken?: string;
}

export interface MandarinTextFile {
  version: 1;
  kind: 'text';                        // discriminates from FlashcardListFile
  exportedAt: string;
  text: MandarinText;
}
