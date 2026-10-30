// Novedades y parches: se leen de la lista pública del blog oficial de cada juego.
// Solo se toman título, fecha y enlace; el artículo completo se lee en el sitio de Supercell.
// No hay RSS ni API, así que se interpreta el HTML. Si Supercell cambia su página y deja de
// funcionar, se muestran las noticias de ejemplo (el resto de la app no se ve afectado).

import { cached, HOUR, MIN } from './lib/cache.js';

const SLUGS = { royale: 'clashroyale', clans: 'clashofclans', brawl: 'brawlstars' };
const baseUrl = () => (process.env.NEWS_BASE_URL || 'https://supercell.com').replace(/\/$/, '');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—' };
export const decode = (s) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

const textOf = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const DATE = /\b(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,10})\.?\s+(\d{4})\b/;

// Busca la primera imagen usable dentro de un trozo de HTML (o la última, con last=true).
// Las páginas con carga diferida ponen la imagen real en data-src y un marcador en src.
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'))?.[1];
function imageFrom(html, origin, last = false) {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const t of last ? [...tags].reverse() : tags) {
    const cand =
      attr(t, 'data-src') || attr(t, 'data-lazy-src') || attr(t, 'src') ||
      (attr(t, 'data-srcset') || attr(t, 'srcset') || '').split(',')[0].trim().split(/\s+/)[0];
    if (!cand || cand.startsWith('data:')) continue;
    try {
      const u = new URL(decode(cand), origin + '/');
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
    } catch {
      /* dirección inválida: se prueba la siguiente imagen */
    }
  }
  return null;
}

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
    const abs = new URL(href, origin + '/');
    if (abs.origin !== new URL(origin).origin) continue; // solo enlaces del sitio oficial
    const url = abs.href;
    const entry = found.get(url) ?? { url, slug, text: '', around: '', image: null };
    entry.text = `${entry.text} ${textOf(inner)}`.trim();
    // Texto del bloque que rodea al enlace (la fecha suele estar fuera del enlace).
    const start = Math.max(html.lastIndexOf('<li', m.index), html.lastIndexOf('<article', m.index), m.index - 400);
    entry.around = `${entry.around} ${textOf(html.slice(start, m.index))}`.trim();
    entry.image ??= imageFrom(inner, origin) ?? imageFrom(html.slice(start, m.index), origin, true);
    found.set(url, entry);
  }
  return [...found.values()].slice(0, 8).map(({ url, slug, text, around, image }) => {
    const date = (text.match(DATE) ?? around.match(DATE))?.[0] ?? '';
    let title = text
      .replace(DATE, ' ')
      .replace(/\bBlog\s*[–—-]\s*(Clash Royale|Clash of Clans|Brawl Stars)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (title.length < 4 || title.length > 140) title = humanize(slug);
    return { tag: classify(slug, title), date, title, text: '', url, image };
  });
}

// Adelanto de cada artículo: la descripción corta que la propia página publica para buscadores.
const metaContent = (html, key) => {
  for (const t of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (new RegExp(`(?:property|name)=["']${key}["']`, 'i').test(t)) return attr(t, 'content');
  }
  return null;
};

function clip(text, max = 220) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 80)).replace(/[\s,.;:–—-]+$/, '') + '…';
}

export function excerptFrom(html) {
  const meta = metaContent(html, 'og:description') || metaContent(html, 'description');
  if (meta && textOf(meta).length > 20) return clip(textOf(meta));
  for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = textOf(m[1]);
    if (t.length >= 60) return clip(t);
  }
  return '';
}

function excerpt(url) {
  return cached(`excerpt:${url}`, HOUR, async () => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SCKING-fan-project/0.1 (sin fines de lucro)', Accept: 'text/html' },
        signal: AbortSignal.timeout(8_000),
      });
      return res.ok ? excerptFrom(await res.text()) : '';
    } catch {
      return '';
    }
  });
}

async function readBlog(game) {
  const origin = baseUrl();
  // Primero el blog en inglés, que tiene todas las publicaciones y las más nuevas.
  // La versión en español queda como respaldo: suele traer pocas publicaciones traducidas.
  for (const path of [`/en/games/${SLUGS[game]}/blog/`, `/en/games/${SLUGS[game]}/es/blog/`]) {
    try {
      const res = await fetch(origin + path, {
        headers: { 'User-Agent': 'SCKING-fan-project/0.1 (sin fines de lucro)', Accept: 'text/html' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const items = parseBlog(await res.text(), origin);
      if (items.length) {
        await Promise.all(items.map(async (it) => { it.text = await excerpt(it.url); }));
        return items;
      }
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
