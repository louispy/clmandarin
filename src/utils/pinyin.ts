const TONE_MARKS: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

function applyToneToSyllable(syllable: string): string {
  const match = syllable.match(/^([a-zü]+)([1-5])$/i);
  if (!match) return syllable;
  const baseRaw = match[1].toLowerCase();
  const tone = parseInt(match[2], 10);
  // 'v' is a common keyboard substitute for ü
  const base = baseRaw.replace(/v/g, 'ü');
  if (tone === 5) return base;

  let vowelIdx = -1;
  if (base.includes('a')) vowelIdx = base.indexOf('a');
  else if (base.includes('e')) vowelIdx = base.indexOf('e');
  else if (base.includes('ou')) vowelIdx = base.indexOf('o');
  else {
    for (let i = base.length - 1; i >= 0; i--) {
      if ('aeiouü'.includes(base[i])) {
        vowelIdx = i;
        break;
      }
    }
  }
  if (vowelIdx === -1) return base;

  const ch = base[vowelIdx];
  const marked = TONE_MARKS[ch]?.[tone] ?? ch;
  return base.slice(0, vowelIdx) + marked + base.slice(vowelIdx + 1);
}

// "ni3 hao3" → "nǐ hǎo"; passes through already-marked input unchanged.
export function numberedToMarked(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((syl) => (/[1-5]$/.test(syl) ? applyToneToSyllable(syl) : syl))
    .join(' ');
}

let pinyinProPromise: Promise<typeof import('pinyin-pro')> | null = null;

export function loadPinyinPro(): Promise<typeof import('pinyin-pro')> {
  if (!pinyinProPromise) {
    pinyinProPromise = import('pinyin-pro');
  }
  return pinyinProPromise;
}

export async function hanziToPinyin(hanzi: string): Promise<string> {
  const { pinyin } = await loadPinyinPro();
  return pinyin(hanzi, { toneType: 'symbol', type: 'string' });
}
