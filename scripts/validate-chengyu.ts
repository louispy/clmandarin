/**
 * Validates public/data/chengyu.json and scores each entry for learner
 * accessibility.
 *
 * The score is the share of an entry's characters that appear somewhere in
 * HSK 1-4 vocabulary. A chengyu built from characters the learner already
 * knows is decodable and satisfying; one full of characters they have never
 * seen is just noise on the home screen. Entries are ranked by it so the
 * weakest are easy to spot and replace.
 *
 *   npm run chengyu
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Entry {
  hanzi: string;
  pinyin: string;
  literal: string;
  meaning: string;
  type: 'chengyu' | 'suyu';
}

interface Word {
  hanzi: string;
  hskLevel: number;
}

const ROOT = resolve(import.meta.dirname, '..');
const CJK = /[一-鿿]/u;

function chars(s: string): string[] {
  return [...s].filter((c) => CJK.test(c));
}

const entries: Entry[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/chengyu.json'), 'utf8')
);
const vocab: Word[] = JSON.parse(
  readFileSync(resolve(ROOT, 'public/data/hsk-all.json'), 'utf8')
);

// Every character appearing anywhere in HSK 1-4.
const known = new Set<string>();
for (const w of vocab) {
  if (w.hskLevel >= 1 && w.hskLevel <= 4) chars(w.hanzi).forEach((c) => known.add(c));
}

const errors: string[] = [];
const seen = new Map<string, number>();

entries.forEach((e, i) => {
  const at = `[${i}] ${e.hanzi ?? '(no hanzi)'}`;
  for (const field of ['hanzi', 'pinyin', 'literal', 'meaning', 'type'] as const) {
    if (!e[field] || !String(e[field]).trim()) errors.push(`${at}: missing ${field}`);
  }
  if (e.type !== 'chengyu' && e.type !== 'suyu') {
    errors.push(`${at}: type must be chengyu or suyu, got "${e.type}"`);
  }

  // One pinyin syllable per character. Catches dropped or doubled syllables,
  // which is the most common hand-authoring mistake.
  const nChars = chars(e.hanzi ?? '').length;
  const nSyl = (e.pinyin ?? '').split(/\s+/).filter(Boolean).length;
  if (nChars && nSyl && nChars !== nSyl) {
    errors.push(`${at}: ${nChars} characters but ${nSyl} pinyin syllables — "${e.pinyin}"`);
  }

  const prev = seen.get(e.hanzi);
  if (prev !== undefined) errors.push(`${at}: duplicate of entry [${prev}]`);
  else seen.set(e.hanzi, i);
});

const scored = entries
  .map((e) => {
    const cs = chars(e.hanzi);
    const hits = cs.filter((c) => known.has(c)).length;
    return { e, coverage: cs.length ? hits / cs.length : 0, unknown: cs.filter((c) => !known.has(c)) };
  })
  .sort((a, b) => a.coverage - b.coverage);

const avg = scored.reduce((s, x) => s + x.coverage, 0) / (scored.length || 1);
const byType = entries.reduce<Record<string, number>>((acc, e) => {
  acc[e.type] = (acc[e.type] ?? 0) + 1;
  return acc;
}, {});

console.log(`\n${entries.length} entries  ${JSON.stringify(byType)}`);
console.log(`HSK 1-4 character coverage: ${(avg * 100).toFixed(1)}% average\n`);

console.log('Least accessible (characters not in HSK 1-4):');
for (const { e, coverage, unknown } of scored.slice(0, 12)) {
  console.log(
    `  ${(coverage * 100).toFixed(0).padStart(3)}%  ${e.hanzi.padEnd(8)} ${unknown.join(' ') || '—'}`
  );
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} problem(s):`);
  errors.forEach((e) => console.error(`  ${e}`));
  process.exit(1);
}
console.log('\n✓ valid\n');
