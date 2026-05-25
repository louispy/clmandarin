import type { FlashcardList, FlashcardListFile } from '../types';
import { getWordsByIds } from './vocab-loader';
import { db } from '../db';

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string | undefined;
const CODE_HEX_CHARS = 8;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generateShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function computeShareCode(listId: string, token: string): Promise<string> {
  const buf = new TextEncoder().encode(`${listId}:${token}`);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return bytesToHex(new Uint8Array(digest)).slice(0, CODE_HEX_CHARS);
}

function stripPrivateFields(list: FlashcardList): FlashcardList {
  // Strip fields that should never leave the owner's device — recipients can't
  // derive the URL, and exported files can't leak the secret.
  const { shareToken: _t, ...rest } = list;
  return rest;
}

export function isSharingConfigured(): boolean {
  return !!WORKER_URL;
}

export function buildShareUrl(code: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}?share=${code}`;
}

/**
 * Build the bundle for a list and POST it to the Worker. The share code is
 * derived deterministically from the list id and a per-list secret token, so
 * re-sharing the same list always yields the same URL and overwrites the
 * previous KV entry. The token is generated lazily on first share and
 * persisted to IndexedDB.
 */
export async function createShare(
  list: FlashcardList
): Promise<{ code: string; expiresAt: string }> {
  if (!WORKER_URL) throw new Error('Sharing is not configured (VITE_WORKER_URL is missing).');

  // Re-read from IndexedDB — the `list` prop comes from the useLists React
  // cache, which doesn't auto-refresh when share.ts writes a new shareToken,
  // so the in-memory token can be stale (undefined on second share, etc.).
  const fresh = (await db.lists.get(list.id)) ?? list;
  let token = fresh.shareToken;
  if (!token) {
    token = generateShareToken();
    await db.lists.update(list.id, { shareToken: token });
  }

  const code = await computeShareCode(list.id, token);
  const words = await getWordsByIds(list.wordIds);
  const bundle: FlashcardListFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    list: stripPrivateFields(fresh),
    words,
  };

  const res = await fetch(`${WORKER_URL}/share?code=${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(bundle),
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

export async function fetchShare(code: string): Promise<FlashcardListFile> {
  if (!WORKER_URL) throw new Error('Sharing is not configured (VITE_WORKER_URL is missing).');

  const res = await fetch(`${WORKER_URL}/share/${encodeURIComponent(code)}`);
  if (res.status === 404) throw new Error('This shared list has expired or does not exist.');
  if (!res.ok) throw new Error(`Failed to load shared list (${res.status}).`);

  const data = (await res.json()) as FlashcardListFile;
  if (data.version !== 1) {
    throw new Error(`Unsupported shared list version: ${data.version}`);
  }
  return data;
}
