interface Env {
  LISTS: KVNamespace;
  ALLOWED_ORIGIN: string;
}

const MAX_BODY_BYTES = 100_000;          // ~100 KB; share-list JSON is tiny
const SHARE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days
const CODE_LENGTH = 8;

function buildCorsHeaders(env: Env): HeadersInit {
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

function json(body: unknown, init: ResponseInit, cors: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...cors, 'content-type': 'application/json', ...init.headers },
  });
}

function plain(message: string, status: number, cors: HeadersInit): Response {
  return new Response(message, { status, headers: cors });
}

function makeCode(): string {
  // 8 chars of url-safe random; ~5e14 possible codes — collisions astronomically unlikely
  return crypto.randomUUID().replace(/-/g, '').slice(0, CODE_LENGTH);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const cors = buildCorsHeaders(env);
    const url = new URL(req.url);

    // Preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // POST /share — create
    if (req.method === 'POST' && url.pathname === '/share') {
      if (req.headers.get('origin') !== env.ALLOWED_ORIGIN) {
        return plain('forbidden', 403, cors);
      }
      const body = await req.text();
      if (body.length > MAX_BODY_BYTES) {
        return plain('payload too large', 413, cors);
      }
      try {
        JSON.parse(body);
      } catch {
        return plain('invalid json', 400, cors);
      }
      const code = makeCode();
      await env.LISTS.put(code, body, { expirationTtl: SHARE_TTL_SECONDS });
      return json({ code }, { status: 201 }, cors);
    }

    // GET /share/:code — read
    if (req.method === 'GET' && url.pathname.startsWith('/share/')) {
      const code = url.pathname.slice('/share/'.length);
      if (!code || code.length !== CODE_LENGTH) {
        return plain('not found', 404, cors);
      }
      const data = await env.LISTS.get(code);
      if (!data) return plain('not found', 404, cors);
      return new Response(data, {
        headers: { ...cors, 'content-type': 'application/json' },
      });
    }

    return plain('not found', 404, cors);
  },
} satisfies ExportedHandler<Env>;
