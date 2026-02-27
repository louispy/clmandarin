# CLMandarin - Project Plan

## Overview

Offline-first web app for studying HSK 1-6 Mandarin vocabulary using flashcard lists. Vocab data scraped from MandarinBean. Users create custom flashcard lists (like Spotify playlists), reorder words, select entire HSK levels, and save/load lists as files.

---

## Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Scraper | Node.js + Cheerio | Same language as frontend, lightweight HTML parsing |
| Frontend | Vite + React + TypeScript | Fast dev, good list/state handling, easy PWA setup |
| Styling | TailwindCSS | Rapid UI, utility-first, small bundle |
| Storage | IndexedDB (Dexie.js) | Structured offline storage, handles 5000+ records well |
| Offline | vite-plugin-pwa | Service worker generation, PWA manifest |
| DnD | @dnd-kit/core | Lightweight drag-and-drop for list reordering |

---

## Data Source: MandarinBean

**URL Pattern**: `https://mandarinbean.com/hsk-{1-6}-vocabulary-list/`

Each page has a single `<table>` inside `<figure class="wp-block-table">` with 4 columns:

| Column | Content |
|--------|---------|
| No | Sequential number |
| Chinese | Hanzi characters |
| Pinyin | Romanized with tone marks |
| English | Translation |

**Word counts**: HSK1: 150, HSK2: 150, HSK3: 300, HSK4: 600, HSK5: 1300, HSK6: 2500 = **5,000 total**

**Edge cases to handle**:
- HSK 1 has 13 category header rows (empty first cell + `<strong>` in second) — skip these
- Strip `&nbsp;` padding from pinyin
- Decode HTML entities (`&#8217;` → `'`)
- Some entries have empty English translations (particles like 的, 了)
- Some Chinese cells have alternate forms in parentheses, e.g. `这 (这儿)`

---

## Architecture

```
clmandarin/
├── scraper/
│   ├── scrape.ts          # Cheerio-based scraper
│   └── validate.ts        # Validate scraped data integrity
├── public/
│   └── data/
│       ├── hsk-1.json     # Scraped vocab (bundled as static assets)
│       ├── hsk-2.json
│       ├── hsk-3.json
│       ├── hsk-4.json
│       ├── hsk-5.json
│       └── hsk-6.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── VocabBrowser.tsx      # Browse HSK levels, search/filter words
│   │   ├── WordCard.tsx          # Single word display (hanzi, pinyin, english)
│   │   ├── FlashcardList.tsx     # A user-created list of words
│   │   ├── ListManager.tsx       # CRUD for flashcard lists
│   │   ├── ListSelector.tsx      # Pick HSK levels / bulk add
│   │   ├── SortableWordList.tsx  # Drag-and-drop reorderable list
│   │   └── FlashcardViewer.tsx   # Study mode: flip through cards
│   ├── hooks/
│   │   ├── useVocab.ts           # Load/query vocab data
│   │   ├── useLists.ts           # CRUD operations on flashcard lists
│   │   └── useFileIO.ts         # Save/load list files
│   ├── db/
│   │   └── index.ts              # Dexie.js schema & database setup
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── utils/
│       ├── import-export.ts      # JSON file import/export logic
│       └── vocab-loader.ts       # Fetch & cache static JSON vocab data
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md
├── README.md
└── PLAN.md
```

---

## Data Models

```typescript
// A single vocabulary word (from scraped data)
interface VocabWord {
  id: string;           // e.g. "hsk1-042"
  hskLevel: number;     // 1-6
  number: number;       // position within HSK level
  hanzi: string;        // e.g. "学校"
  pinyin: string;       // e.g. "xuéxiào"
  english: string;      // e.g. "school"
}

// A user-created flashcard list
interface FlashcardList {
  id: string;           // UUID
  name: string;         // user-given name
  description?: string;
  createdAt: number;    // timestamp
  updatedAt: number;
  wordIds: string[];    // ordered array of VocabWord ids
}

// For file export/import
interface FlashcardListFile {
  version: 1;
  exportedAt: string;   // ISO date
  list: FlashcardList;
  words: VocabWord[];   // denormalized for portability
}
```

---

## Implementation Phases

### Phase 1: Scraper (Step 1)
- [x] Research MandarinBean HTML structure ✓
- [ ] Set up Node.js scraper with Cheerio
- [ ] Scrape HSK 1-6, output to `public/data/hsk-{n}.json`
- [ ] Validate: correct word counts, no empty hanzi, pinyin trimmed
- [ ] Commit scraped data to repo (static asset, no runtime scraping)

### Phase 1: Core App (Step 2)
- [ ] Scaffold Vite + React + TS + Tailwind project
- [ ] Set up Dexie.js database schema
- [ ] Vocab loader: fetch static JSON → populate IndexedDB on first load
- [ ] Vocab browser: paginated list per HSK level, search by hanzi/pinyin/english
- [ ] Word card component: shows hanzi (large), pinyin, english

### Phase 1: Flashcard Lists (Step 3)
- [ ] List manager: create, rename, delete lists
- [ ] Add words to lists (star button on word cards)
- [ ] Add entire HSK level(s) to a list via level selector
- [ ] Drag-and-drop reorder words within a list
- [ ] Flashcard study mode: flip through cards one by one

### Phase 1: File I/O (Step 4)
- [ ] Export list as `.json` file (download)
- [ ] Import list from `.json` file (file picker)
- [ ] Bulk import: load multiple `.json` files at once
- [ ] Folder import via File System Access API (Chromium) with fallback to multi-file `<input>`

### Phase 1: PWA & Offline (Step 5)
- [ ] Configure vite-plugin-pwa (manifest, service worker, icons)
- [ ] Precache static vocab JSON files
- [ ] Cache-first strategy for all app assets
- [ ] Add install prompt / offline indicator

### Phase 2: Online Sharing (Future — Pending)
- [ ] Backend API (maybe Cloudflare Workers or similar edge function)
- [ ] Generate shareable link from list → short URL that resolves to list JSON
- [ ] Import from shared link
- [ ] Optional: user accounts for managing shared lists

---

## File I/O Strategy

**Best practice for loading saved flashcard lists:**

1. **Primary**: IndexedDB stores all lists locally. App loads them on startup automatically.
2. **Export**: User clicks "Export" → downloads `listname.clmandarin.json` file.
3. **Import single file**: Standard `<input type="file" accept=".json">`.
4. **Import multiple files**: `<input type="file" multiple accept=".json">` — works everywhere.
5. **Import folder** (Chromium only): `window.showDirectoryPicker()` → reads all `.json` files in the selected folder. Gracefully hidden on unsupported browsers.
6. **File naming convention**: `{list-name}.clmandarin.json` to make files identifiable.

The app detects duplicates by list `id` on import — prompts to merge/replace/skip.

---

## UI Wireframe (Rough)

```
┌─────────────────────────────────────────┐
│  CLMandarin              [My Lists ▾]   │
├─────────────────────────────────────────┤
│                                         │
│  HSK Levels: [1] [2] [3] [4] [5] [6]   │
│                                         │
│  🔍 Search words...                     │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  学校                    [+ ☆]  │    │
│  │  xuéxiào                        │    │
│  │  school                         │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │  老师                    [+ ☆]  │    │
│  │  lǎoshī                        │    │
│  │  teacher                        │    │
│  └─────────────────────────────────┘    │
│  ...                                    │
│                                         │
├─────────────────────────────────────────┤
│  [Import] [Export] [+ New List]         │
└─────────────────────────────────────────┘
```

Study mode:
```
┌─────────────────────────────────────────┐
│  ← Back          3 / 150                │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│              学 校                       │
│                                         │
│          (tap to reveal)                │
│                                         │
│           xuéxiào                       │
│           school                        │
│                                         │
│                                         │
│        [← Prev]    [Next →]            │
└─────────────────────────────────────────┘
```
