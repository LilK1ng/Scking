// Cliente de las APIs oficiales de Supercell.
// Las keys se atan a una IP: este código tiene que correr desde la IP registrada.

const CONFIG = {
  royale: { key: 'CR_API_KEY', base: 'CR_BASE_URL', def: 'https://api.clashroyale.com/v1' },
  clans: { key: 'COC_API_KEY', base: 'COC_BASE_URL', def: 'https://api.clashofclans.com/v1' },
  brawl: { key: 'BS_API_KEY', base: 'BS_BASE_URL', def: 'https://api.brawlstars.com/v1' },
};

export const GAME_IDS = Object.keys(CONFIG);

export const isLive = (game) => Boolean(process.env[CONFIG[game].key]);

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Las etiquetas de Supercell usan solo estos caracteres. La letra O se lee como 0.
const TAG_CHARS = /^[0289PYLQGRJCUV]{3,14}$/;

export function normalizeTag(raw) {
  const t = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/^#/, '')
    .replace(/O/g, '0');
  return TAG_CHARS.test(t) ? t : null;
}

export async function sc(game, path) {
  const cfg = CONFIG[game];
  const key = process.env[cfg.key];
  const base = (process.env[cfg.base] || cfg.def).replace(/\/$/, '');
  let res;
  try {
    res = await fetch(base + path, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(502, 'No se pudo conectar con la API de Supercell.');
  }
  if (res.ok) return res.json();

  const body = await res.json().catch(() => ({}));
  console.warn(`[supercell] ${game} ${res.status} ${path}`);
  if (res.status === 404) throw new ApiError(404, 'No se encontró ese jugador o clan.');
  if (res.status === 403)
    throw new ApiError(502, 'La API rechazó la key. Revisá que la IP registrada sea la de este equipo.');
  if (res.status === 429) throw new ApiError(429, 'Demasiadas consultas seguidas. Probá en un minuto.');
  throw new ApiError(502, body.message || `La API respondió con error ${res.status}.`);
}
