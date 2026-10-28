// Novedades y parches: se leen de la lista pública del blog oficial de cada juego.
// Solo se toman título, fecha y enlace; el artículo completo se lee en el sitio de Supercell.
// No hay RSS ni API, así que se interpreta el HTML. Si Supercell cambia su página y deja de
// funcionar, se muestran las noticias de ejemplo (el resto de la app no se ve afectado).

import { cached, MIN } from './lib/cache.js';

const SLUGS = { royale: 'clashroyale', clans: 'clashofclans', brawl: 'brawlstars' };
const baseUrl = () => (process.env.NEWS_BASE_URL || 'https://supercell.com').replace(/\/$/, '');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—' };
const decode = (s) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

const textOf = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const DATE = /\b(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,10})\.?\s+(\d{4})\b/;

const humanize = (slug) => {
  const t = slug.replace(/-/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function classify(slug, title) {
  const s = `${slug} ${title}`.toLowerCase();
  if (/balance|equilibrio/.test(s)) return 'Balance';
  if (/season|temporada/.test(s)) return 'Temporada';
  if (/event|evento|medal|challenge|desaf/.test(s)) return 'Evento';
  return 'Novedad';
}

// Extrae las publicaciones de la lista. Cada enlace a /blog/<seccion>/<slug>/ es una entrada;
// si una entrada tiene varios enlaces (imagen y título), se junta el texto de todos.
export function parseBlog(html, origin) {
  const found = new Map();
  const re = /<a\b[^>]*?href=["']([^"']*\/blog\/(?:release-notes|news)\/([a-z0-9-]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const [, href, slug, inner] = m;
    const url = new URL(href, origin + '/').href;
    const entry = found.get(url) ?? { url, slug, text: '', around: '' };
    entry.text = `${entry.text} ${textOf(inner)}`.trim();
    // Texto del bloque que rodea al enlace (la fecha suele estar fuera del enlace).
    const start = Math.max(html.lastIndexOf('<li', m.index), html.lastIndexOf('<article', m.index), m.index - 400);
    entry.around = `${entry.around} ${textOf(html.slice(start, m.index))}`.trim();
    found.set(url, entry);
  }
  return [...found.values()].slice(0, 8).map(({ url, slug, text, around }) => {
    const date = (text.match(DATE) ?? around.match(DATE))?.[0] ?? '';
    let title = text
      .replace(DATE, ' ')
      .replace(/\bBlog\s*[–—-]\s*(Clash Royale|Clash of Clans|Brawl Stars)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (title.length < 4 || title.length > 140) title = humanize(slug);
    return { tag: classify(slug, title), date, title, text: '', url };
  });
}

async function readBlog(game) {
  const origin = baseUrl();
  // Primero la versión en español del blog; si no existe o viene vacía, la de inglés.
  for (const path of [`/en/games/${SLUGS[game]}/es/blog/`, `/en/games/${SLUGS[game]}/blog/`]) {
    try {
      const res = await fetch(origin + path, {
        headers: { 'User-Agent': 'SCKING-fan-project/0.1 (sin fines de lucro)', Accept: 'text/html' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const items = parseBlog(await res.text(), origin);
      if (items.length) return items;
    } catch {
      /* se prueba la siguiente dirección */
    }
  }
  return null;
}

export async function getNews(game, fallbackItems) {
  const items = await cached(`news:${game}`, 30 * MIN, () => readBlog(game));
  if (items) return { items, source: 'live' };
  console.warn(`[novedades] no se pudo leer el blog de ${game}; se muestran noticias de ejemplo`);
  return { items: fallbackItems, source: 'example' };
}
