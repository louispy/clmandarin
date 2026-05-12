import * as cheerio from 'cheerio';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Converter } from 'opencc-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');

const toTraditional = Converter({ from: 'cn', to: 'tw' });

interface ScrapedWord {
  id: string;
  hskLevel: number;
  number: number;
  hanzi: string;
  traditional?: string;
  pinyin: string;
  english: string;
}

const EXPECTED_COUNTS: Record<number, number> = {
  1: 150,
  2: 150,
  3: 300,
  4: 600,
  5: 1300,
  6: 2500,
};

async function scrapeLevel(level: number): Promise<ScrapedWord[]> {
  const url = `https://mandarinbean.com/hsk-${level}-vocabulary-list/`;
  console.log(`Fetching HSK ${level} from ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch HSK ${level}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const words: ScrapedWord[] = [];

  $('figure.wp-block-table table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const numText = $(cells[0]).text().trim();
    // Skip category header rows (HSK 1): empty number cell + <strong> in Chinese cell
    if (numText === '' && $(cells[1]).find('strong').length > 0) return;
    // Skip rows with empty number (shouldn't happen after header filter, but safety)
    if (numText === '') return;

    const num = parseInt(numText, 10);
    if (isNaN(num)) return;

    const hanzi = $(cells[1]).text().trim();
    const pinyin = $(cells[2]).text().trim().replace(/\u00a0/g, ' ').trim();
    const english = $(cells[3]).text().trim().replace(/\u2019/g, "'");
    const traditional = toTraditional(hanzi);

    const entry: ScrapedWord = {
      id: `hsk${level}-${String(num).padStart(3, '0')}`,
      hskLevel: level,
      number: num,
      hanzi,
      pinyin,
      english,
    };
    if (traditional !== hanzi) entry.traditional = traditional;

    words.push(entry);
  });

  return words;
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const allWords: ScrapedWord[] = [];

  for (let level = 1; level <= 6; level++) {
    const words = await scrapeLevel(level);

    const expected = EXPECTED_COUNTS[level];
    if (words.length !== expected) {
      console.warn(
        `⚠ HSK ${level}: got ${words.length} words, expected ${expected}`
      );
    } else {
      console.log(`✓ HSK ${level}: ${words.length} words`);
    }
    allWords.push(...words);
  }

  const outPath = join(OUTPUT_DIR, 'hsk-all.json');
  writeFileSync(outPath, JSON.stringify(allWords));
  console.log(`\nDone! ${allWords.length} total words written to ${outPath}`);
}

main().catch((err) => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
