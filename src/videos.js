// Videos de YouTube de los canales elegidos. Se usa la lista pública de últimos videos que
// publica cada canal (no hace falta ninguna key). Solo se toma título, canal, fecha y miniatura;
// el video se mira en YouTube.

import { cached, HOUR, MIN } from './lib/cache.js';
import { CHANNELS } from './channels.js';
import { decode } from './news.js';

const base = () => (process.env.YOUTUBE_BASE_URL || 'https://www.youtube.com').replace(/\/$/, '');
const UA = 'SCKING-fan-project/0.1 (sin fines de lucro)';

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es;q=0.9,en;q=0.5' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${new URL(url).pathname}${new URL(url).search}`);
  return res.text();
}

// Del @nombre se obtienen los identificadores posibles del canal (UC...), del más confiable al menos.
// Se guardan una semana. Al pedir los videos se prueba cada uno hasta que uno funcione.
function channelCandidates(handle) {
  if (/^UC[\w-]{22}$/.test(handle)) return Promise.resolve([handle]);
  return cached(`yt:ids:${handle}`, 7 * 24 * HOUR, async () => {
    const html = await getText(`${base()}/${handle.startsWith('@') ? handle : '@' + handle}`);
    const ids = [];
    const add = (re) => {
      for (const m of html.matchAll(re)) if (!ids.includes(m[1])) ids.push(m[1]);
    };
    add(/feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/g);
    add(/<link\b[^>]*canonical[^>]*\/channel\/(UC[\w-]{22})/g);
    add(/<link\b[^>]*\/channel\/(UC[\w-]{22})[^>]*canonical/g);
    add(/"externalId":"(UC[\w-]{22})"/g);
    add(/"browseId":"(UC[\w-]{22})"/g);
    add(/"channelId":"(UC[\w-]{22})"/g);
    if (!ids.length) throw new Error('no se encontró el identificador del canal en su página');
    return ids.slice(0, 4);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Direcciones de la lista de videos de un canal, de más a menos conveniente:
// 1) lista "solo videos" (sin Shorts), 2) lista de todo lo subido, 3) lista clásica del canal.
// A veces una responde 404 o 500 y otra no, por eso se prueban en orden.
const feedUrls = (id) => [
  `${base()}/feeds/videos.xml?playlist_id=UULF${id.slice(2)}`,
  `${base()}/feeds/videos.xml?playlist_id=UU${id.slice(2)}`,
  `${base()}/feeds/videos.xml?channel_id=${id}`,
];

async function latestFrom(handle) {
  let last;
  for (const id of (await channelCandidates(handle)).slice(0, 2)) {
    for (const url of feedUrls(id)) {
      try {
        const videos = parseFeed(await getText(url));
        if (videos.length) return videos.slice(0, 6);
        last = new Error('lista vacía');
      } catch (err) {
        last = err;
        await sleep(300);
      }
    }
  }
  throw last ?? new Error('el canal no devolvió videos');
}

export function parseFeed(xml) {
  const out = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const id = e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
    const title = e.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    if (!id || !title) continue;
    out.push({
      id,
      title: decode(title).trim(),
      published: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? '',
      channel: decode(e.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/)?.[1] ?? '').trim(),
    });
  }
  return out;
}

// Tema aproximado según palabras del título. No es exacto: a veces un video cae en "Otros".
const TOPICS = {
  brawl: [
    ['Brawlers nuevos', /new brawler|nuevo brawler|nueva brawler|nuevos brawlers|brawler nuevo|nuevo personaje|new character/i],
    ['Eventos', /event|evento|torneo|tournament|challenge|desaf/i],
    ['Meta', /\bmeta\b|tier ?list|mejores|\bbest\b|\btop \d/i],
  ],
  royale: [
    ['Mazos meta', /\bmeta\b|\bdeck|mazo/i],
    ['Eventos', /event|evento|torneo|tournament|challenge|desaf/i],
  ],
  clans: [
    ['Héroes', /hero|héroe|heroe/i],
    ['Ataques', /attack|ataque|\bth ?\d+|ayuntamiento|town hall/i],
    ['Eventos', /event|evento|clan games|juegos de clan|raid|cwl/i],
  ],
};

export function classify(game, title) {
  for (const [name, re] of TOPICS[game] ?? []) if (re.test(title)) return name;
  return 'Otros';
}

const failedAt = new Map();

export async function getVideos(game) {
  const handles = CHANNELS[game] ?? [];
  if (!handles.length) return { items: [], source: 'empty', message: 'Todavía no hay canales elegidos para este juego.' };
  const error = { items: [], source: 'error', message: 'No se pudieron leer los videos. Probá de nuevo en unos minutos.' };
  if (Date.now() - (failedAt.get(game) ?? 0) < 2 * MIN) return error; // no insistir enseguida

  return cached(`videos:${game}`, 30 * MIN, async () => {
    const lists = [];
    for (const h of handles) {
      try {
        lists.push(await latestFrom(h));
      } catch (err) {
        console.warn(`[videos] no se pudo leer ${h}: ${err.message}`);
      }
      await sleep(200);
    }
    const items = lists
      .flat()
      .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
      .slice(0, 18)
      .map((v) => ({
        id: v.id,
        title: v.title,
        channel: v.channel,
        published: v.published,
        url: `https://www.youtube.com/watch?v=${v.id}`,
        thumb: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        topic: classify(game, v.title),
      }));
    if (!items.length) throw new Error('sin videos');
    return { items, source: 'live' };
  }).catch(() => {
    failedAt.set(game, Date.now());
    return error;
  });
}
