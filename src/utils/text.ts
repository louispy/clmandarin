import { loadPinyinPro } from './pinyin';

// One displayable unit of a sentence: a single character plus its pinyin.
// Non-Chinese characters (punctuation, spaces, latin) carry an empty pinyin and
// isHanzi=false so the reader can render them inline without a ruby annotation.
export interface PinyinToken {
  char: string;
  pinyin: string;
  isHanzi: boolean;
}

const SENTENCE_TERMINATORS = '。！？!?…';

// Split a block of hanzi into sentences. Breaks on Chinese/ASCII sentence-ending
// punctuation (kept attached to the sentence it ends) and on newlines. Sentence
// index is the stable key used for per-sentence translations, so the splitting
// rules must stay deterministic — editing the body can shift these indices.
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let buf = '';
  const flush = () => {
    const trimmed = buf.trim();
    if (trimmed) sentences.push(trimmed);
    buf = '';
  };
  for (const ch of text) {
    if (ch === '\n') {
      flush();
      continue;
    }
    buf += ch;
    if (SENTENCE_TERMINATORS.includes(ch)) flush();
  }
  flush();
  return sentences;
}

// Convert a sentence into per-character pinyin tokens for ruby rendering.
export async function sentenceToTokens(sentence: string): Promise<PinyinToken[]> {
  const { pinyin } = await loadPinyinPro();
  const items = pinyin(sentence, { type: 'all', toneType: 'symbol' });
  return items.map((item) => ({
    char: item.origin,
    pinyin: item.isZh ? item.pinyin : '',
    isHanzi: !!item.isZh,
  }));
}
