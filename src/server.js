import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './lib/env.js';

loadEnv();

const { GAMES } = await import('./games.js');
const { ApiError, GAME_IDS, isLive } = await import('./lib/supercell.js');

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function handleApi(url, res) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1).map(decodeURIComponent); // quita "api"

  if (parts[0] === 'status') {
    return send(res, 200, { games: Object.fromEntries(GAME_IDS.map((g) => [g, isLive(g) ? 'live' : 'example'])) });
  }

  const [game, resource, arg] = parts;
  const handlers = GAMES[game];
  if (!handlers) throw new ApiError(404, 'Juego no encontrado.');

  if (resource === 'meta') return send(res, 200, await handlers.meta());
  if (resource === 'news') return send(res, 200, await handlers.news());
  if (resource === 'videos') return send(res, 200, await handlers.videos());
  if (resource === 'rankings') return send(res, 200, await handlers.rankings());
  if (resource === 'players' && arg) return send(res, 200, await handlers.player(arg));
  throw new ApiError(404, 'Ruta no encontrada.');
}

async function handleStatic(url, res) {
  let rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  rel = normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Prohibido', 'text/plain');
  try {
    const data = await readFile(file);
    send(res, 200, data, TYPES[extname(file)] ?? 'application/octet-stream');
  } catch {
    send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (req.method !== 'GET') throw new ApiError(405, 'Método no permitido.');
      if (url.pathname.startsWith('/api/')) return await handleApi(url, res);
      return await handleStatic(url, res);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 500;
      if (status === 500) console.error(err);
      send(res, status, { error: err instanceof ApiError ? err.message : 'Error interno.' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`SCKING en http://localhost:${port}`);
    for (const g of GAME_IDS) console.log(`  ${g}: ${isLive(g) ? 'datos reales' : 'modo ejemplo (sin key)'}`);
  });
}
