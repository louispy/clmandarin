import type { MandarinText, MandarinTextFile } from '../types';
import { db } from '../db';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string | undefined;
const CODE_HEX_CHARS = 8;
// The Worker rejects any share whose serialized JSON exceeds 100k (it measures
// string length). Cap the whole bundle a little under that so a friendly error
// fires before the request, with headroom for the response/edge variance. This
// covers body AND translations AND title together, not just one field.
const MAX_BUNDLE_LENGTH = 95_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// Namespaced with a "t:" prefix so a text and a list can never collide on the
// same KV code even if their ids/tokens happened to hash alike.
async function computeShareCode(textId: string, token: string): Promise<string> {
  const buf = new TextEncoder().encode(`t:${textId}:${token}`);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return bytesToHex(new Uint8Array(digest)).slice(0, CODE_HEX_CHARS);
}

function stripPrivateFields(text: MandarinText): MandarinText {
  const { shareToken: _t, ...rest } = text;
  return rest;
}

export function buildTextShareUrl(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}?text=${code}`;
}

/**
 * Bundle a text and POST it to the Worker. The share code is derived
 * deterministically from the text id and a per-text secret, so re-sharing the
 * same text yields a stable URL and overwrites the previous KV entry.
 */
export async function createTextShare(
  text: MandarinText
): Promise<{ code: string; expiresAt: string }> {
  if (!WORKER_URL) throw new Error('Sharing is not configured (VITE_WORKER_URL is missing).');

  // Re-read so a token written on a previous share isn't lost to the React cache.
  const fresh = (await db.texts.get(text.id)) ?? text;
  let token = fresh.shareToken;
  if (!token) {
    token = generateShareToken();
    await db.texts.update(text.id, { shareToken: token });
  }

  const code = await computeShareCode(text.id, token);
  const bundle: MandarinTextFile = {
    version: 1,
    kind: 'text',
    exportedAt: new Date().toISOString(),
    text: stripPrivateFields(fresh),
  };

  // Measure the actual serialized payload (body + translations + title +
  // structure) against the Worker's limit, so the friendly error fires before
  // the request instead of relying on a raw 413.
  const payload = JSON.stringify(bundle);
  if (payload.length > MAX_BUNDLE_LENGTH) {
    throw new Error(
      `This text and its translations are too large to share (${payload.length.toLocaleString()} characters; limit ${MAX_BUNDLE_LENGTH.toLocaleString()}). Try sharing a shorter text.`
    );
  }

  const res = await fetch(`${WORKER_URL}/share?code=${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Share failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }

  const data = (await res.json()) as { code?: string; expiresAt?: string };
  if (!data.code || !data.expiresAt) {
    throw new Error('Share failed: malformed response.');
  }
  return { code: data.code, expiresAt: data.expiresAt };
}

// Coerce an untrusted translations blob into a clean { [index]: string } map,
// dropping anything that isn't a numeric-keyed string entry.
function sanitizeTranslations(raw: unknown): Record<number, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<number, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const idx = Number(key);
    if (Number.isInteger(idx) && idx >= 0 && typeof value === 'string') {
      out[idx] = value;
    }
  }
  return out;
}

// Validate a payload fetched from the share Worker. The Worker stores arbitrary
// JSON, so the client is the trust boundary — never assume the shape is right.
function parseTextFile(data: unknown): MandarinTextFile {
  const file = data as Partial<MandarinTextFile> | null;
  if (!file || file.version !== 1 || file.kind !== 'text') {
    throw new Error('That share link is not a text.');
  }
  const text = file.text as Partial<MandarinText> | undefined;
  if (
    !text ||
    typeof text.id !== 'string' ||
    typeof text.title !== 'string' ||
    typeof text.body !== 'string'
  ) {
    throw new Error('This shared text is malformed.');
  }
  if (text.body.length > MAX_BUNDLE_LENGTH) {
    throw new Error('This shared text is too large.');
  }
  return {
    version: 1,
    kind: 'text',
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
    text: {
      id: text.id,
      title: text.title,
      body: text.body,
      translations: sanitizeTranslations(text.translations),
      createdAt: typeof text.createdAt === 'number' ? text.createdAt : 0,
      updatedAt: typeof text.updatedAt === 'number' ? text.updatedAt : 0,
    },
  };
}

export async function fetchTextShare(code: string): Promise<MandarinTextFile> {
  if (!WORKER_URL) throw new Error('Sharing is not configured (VITE_WORKER_URL is missing).');

  const res = await fetch(`${WORKER_URL}/share/${encodeURIComponent(code)}`);
  if (res.status === 404) throw new Error('This shared text has expired or does not exist.');
  if (!res.ok) throw new Error(`Failed to load shared text (${res.status}).`);

  return parseTextFile(await res.json());
}
