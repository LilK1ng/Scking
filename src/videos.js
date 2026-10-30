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
    add(/itemprop=["'](?:identifier|channelId)["'][^>]*content=["'](UC[\w-]{22})["']/g);
    add(/property=["']og:url["'][^>]*content=["'][^"']*\/channel\/(UC[\w-]{22})["']/g);
    // Se evitan a propósito "browseId" y "channelId" sueltos: en la página aparecen también los de
    // otros canales (recomendados) y llevarían a videos de cualquier lado.
    if (!ids.length) throw new Error('no se pudo identificar el canal desde su página (con una key de YouTube funciona siempre)');
    return ids.slice(0, 2);
  });
}

// ---- Camino oficial: API de YouTube con key gratuita (YOUTUBE_API_KEY). Es el más confiable. ----
const apiKey = () => process.env.YOUTUBE_API_KEY;
const apiBase = () => (process.env.YOUTUBE_API_URL || 'https://www.googleapis.com/youtube/v3').replace(/\/$/, '');

async function apiGet(path, params) {
  const url = new URL(apiBase() + path);
  for (const [k, v] of Object.entries({ ...params, key: apiKey() })) url.searchParams.set(k, v);
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error('no hay conexión con la API de YouTube');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // No se escribe la dirección completa para no mostrar la key en pantalla.
    const why = body?.error?.errors?.[0]?.reason || body?.error?.message || `HTTP ${res.status}`;
    throw new Error(`la API de YouTube respondió: ${why}`);
  }
  return body;
}

// Lista de "subidos" del canal: se obtiene del @nombre y se guarda una semana.
function uploadsPlaylist(handle) {
  return cached(`yt:uploads:${handle}`, 7 * 24 * HOUR, async () => {
    const r = await apiGet('/channels', { part: 'contentDetails', forHandle: handle.startsWith('@') ? handle : '@' + handle });
    const id = r.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!id) throw new Error('canal no encontrado en YouTube');
    return id;
  });
}

async function latestViaApi(handle) {
  const r = await apiGet('/playlistItems', { part: 'snippet,contentDetails', maxResults: '10', playlistId: await uploadsPlaylist(handle) });
  const out = [];
  for (const it of r.items ?? []) {
    const id = it.contentDetails?.videoId || it.snippet?.resourceId?.videoId;
    const title = it.snippet?.title;
    if (!/^[\w-]{11}$/.test(id ?? '') || !title || /^(Private|Deleted) video$/i.test(title)) continue;
    out.push({
      id,
      title: decode(title).trim(),
      published: it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || '',
      channel: it.snippet?.videoOwnerChannelTitle || it.snippet?.channelTitle || '',
    });
  }
  if (!out.length) throw new Error('el canal no devolvió videos');
  return out.slice(0, 6);
}

// ---- Camino sin key: lista pública (RSS) del canal. Menos confiable. ----
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
  const error = {
    items: [],
    source: 'error',
    message: apiKey()
      ? 'No se pudieron leer los videos. Probá de nuevo en unos minutos.'
      : 'No se pudieron leer los videos. Sin una key de YouTube (gratuita) es poco confiable: mirá el README para crearla.',
  };
  if (Date.now() - (failedAt.get(game) ?? 0) < 2 * MIN) return error; // no insistir enseguida

  return cached(`videos:${game}`, 30 * MIN, async () => {
    const lists = [];
    for (const h of handles) {
      try {
        lists.push(await (apiKey() ? latestViaApi(h) : latestFrom(h)));
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
