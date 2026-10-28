// Lógica por juego. Cada juego expone: meta(), news(), player(tag), rankings().
// Con key en el .env usa la API oficial (modo "live"); sin key devuelve ejemplos.
//
// Importante: las estadísticas de meta (uso, % de victorias) todavía son de ejemplo
// en los tres juegos. La API oficial no las entrega: hay que calcularlas leyendo
// partidas de los mejores jugadores (siguiente etapa del proyecto).

import { cached, HOUR, MIN } from './lib/cache.js';
import { ApiError, isLive, normalizeTag, sc } from './lib/supercell.js';
import * as mock from './mock.js';
import { getNews } from './news.js';

const fmtNum = (n) => (typeof n === 'number' ? n.toLocaleString('es-AR') : String(n ?? '-'));
const avgElixir = (cards) => {
  const known = cards.filter((c) => typeof c.elixir === 'number');
  return known.length ? Math.round((known.reduce((s, c) => s + c.elixir, 0) / known.length) * 10) / 10 : null;
};
const tagOrThrow = (raw) => {
  const t = normalizeTag(raw);
  if (!t) throw new ApiError(400, 'La etiqueta solo puede tener los caracteres 0 2 8 9 P Y L Q G R J C U V.');
  return encodeURIComponent('#' + t);
};
const pairs = (rows) => rows.map(([name, score]) => ({ name, score }));

// ---------------------------------------------------------------- Clash Royale
async function royaleCards() {
  return cached('royale:cards', 6 * HOUR, async () => {
    const data = await sc('royale', '/cards');
    const byName = new Map();
    for (const c of data.items ?? []) {
      byName.set(c.name.toLowerCase(), {
        name: c.name,
        elixir: c.elixirCost ?? null,
        icon: c.iconUrls?.medium ?? null,
      });
    }
    return byName;
  });
}

async function royaleCard(name) {
  if (isLive('royale')) {
    const found = (await royaleCards()).get(name.toLowerCase());
    if (found) return found;
  }
  return { name, elixir: mock.ELIXIR[name] ?? null, icon: null };
}

const royale = {
  async meta() {
    const decks = [];
    for (const d of mock.royale.decks) {
      const cards = await Promise.all(d.cards.map(royaleCard));
      decks.push({ name: d.name, use: d.use, win: d.win, elixir: avgElixir(cards), cards });
    }
    const topCards = await Promise.all(
      mock.royale.topCards.map(async (c) => ({ ...(await royaleCard(c.name)), use: c.use, win: c.win })),
    );
    return { decks, topCards, stats: 'example' };
  },
  async news() {
    return getNews('royale', mock.royale.news);
  },
  async player(raw) {
    const tag = tagOrThrow(raw);
    if (!isLive('royale')) {
      const p = mock.royale.player;
      return { name: p.name, tag: decodeURIComponent(tag), stats: p.stats.map(([label, value]) => ({ label, value })), items: await Promise.all(p.items.map(royaleCard)), source: 'example' };
    }
    const p = await cached(`royale:player:${tag}`, 2 * MIN, () => sc('royale', `/players/${tag}`));
    return {
      name: p.name,
      tag: p.tag,
      stats: [
        { label: 'Nivel de rey', value: fmtNum(p.expLevel) },
        { label: 'Trofeos', value: fmtNum(p.trophies) },
        { label: 'Mejor marca', value: fmtNum(p.bestTrophies) },
        { label: 'Clan', value: p.clan?.name ?? 'Sin clan' },
      ],
      items: (p.currentDeck ?? []).map((c) => ({ name: c.name, elixir: c.elixirCost ?? null, icon: c.iconUrls?.medium ?? null })),
      source: 'live',
    };
  },
  async rankings() {
    if (!isLive('royale')) return { ...mock.royale.rankings, players: pairs(mock.royale.rankings.players), clans: pairs(mock.royale.rankings.clans), source: 'example' };
    return cached('royale:rankings', 15 * MIN, async () => {
      let players;
      try {
        const r = await sc('royale', '/locations/global/pathoflegend/players?limit=10');
        players = (r.items ?? []).map((i) => ({ name: i.name, score: i.eloRating ?? i.trophies }));
      } catch {
        const r = await sc('royale', '/locations/global/rankings/players?limit=10');
        players = (r.items ?? []).map((i) => ({ name: i.name, score: i.trophies }));
      }
      const c = await sc('royale', '/locations/global/rankings/clans?limit=10');
      return { players, clans: (c.items ?? []).map((i) => ({ name: i.name, score: i.clanScore })), source: 'live' };
    });
  },
};

// -------------------------------------------------------------- Clash of Clans
// Ubicaciones a probar para el ranking mundial de Clash of Clans: primero el alias "global",
// después las "internacionales" que figuren en la lista oficial. Se usa la primera que no dé 404.
async function cocRankingLocations() {
  return cached('clans:locations', 24 * HOUR, async () => {
    const out = ['global'];
    try {
      const r = await sc('clans', '/locations?limit=500');
      const items = r.items ?? [];
      for (const l of items) if (/international|internacional/i.test(l.name) || l.isCountry === false) out.push(l.id);
    } catch {
      /* si falla la lista, queda solo el alias global */
    }
    return out;
  });
}

async function cocRanking(kind) {
  let last;
  for (const loc of await cocRankingLocations()) {
    try {
      return await sc('clans', `/locations/${loc}/rankings/${kind}?limit=10`);
    } catch (err) {
      last = err;
      if (err.status !== 404) throw err;
    }
  }
  throw last;
}

const clans = {
  async meta() {
    return { armies: mock.clans.armies, tracker: mock.clans.tracker.map(([name, pct]) => ({ name, pct })), stats: 'example' };
  },
  async news() {
    return getNews('clans', mock.clans.news);
  },
  async player(raw) {
    const tag = tagOrThrow(raw);
    if (!isLive('clans')) {
      const p = mock.clans.player;
      return { name: p.name, tag: decodeURIComponent(tag), stats: p.stats.map(([label, value]) => ({ label, value })), items: p.items.map((name) => ({ name })), source: 'example' };
    }
    const p = await cached(`clans:player:${tag}`, 2 * MIN, () => sc('clans', `/players/${tag}`));
    return {
      name: p.name,
      tag: p.tag,
      stats: [
        { label: 'Ayuntamiento', value: fmtNum(p.townHallLevel) },
        { label: 'Trofeos', value: fmtNum(p.trophies) },
        { label: 'Estrellas de guerra', value: fmtNum(p.warStars) },
        { label: 'Clan', value: p.clan?.name ?? 'Sin clan' },
      ],
      // La API trae niveles de héroes pero no sus imágenes: se muestran como texto.
      items: (p.heroes ?? []).filter((h) => h.village === 'home').map((h) => ({ name: `${h.name} ${h.level}` })),
      source: 'live',
    };
  },
  async rankings() {
    if (!isLive('clans')) return { players: pairs(mock.clans.rankings.players), clans: pairs(mock.clans.rankings.clans), source: 'example' };
    return cached('clans:rankings', 15 * MIN, async () => {
      const p = await cocRanking('players');
      const c = await cocRanking('clans');
      return {
        players: (p.items ?? []).map((i) => ({ name: i.name, score: i.trophies })),
        clans: (c.items ?? []).map((i) => ({ name: i.name, score: i.clanPoints })),
        source: 'live',
      };
    });
  },
};

// ------------------------------------------------------------------ Brawl Stars
// La API oficial no trae imágenes. Se usan las de Brawlify por id de brawler
// (confirmar sus condiciones de uso antes de publicar).
const brawlIcon = (id) => `https://cdn.brawlify.com/brawlers/borderless/${id}.png`;

async function brawlIds() {
  return cached('brawl:brawlers', 6 * HOUR, async () => {
    const data = await sc('brawl', '/brawlers');
    return new Map((data.items ?? []).map((b) => [b.name.toLowerCase(), b.id]));
  });
}

async function brawlIconByName(name) {
  if (!isLive('brawl')) return null;
  const id = (await brawlIds()).get(name.toLowerCase());
  return id ? brawlIcon(id) : null;
}

const brawl = {
  async meta() {
    const brawlers = await Promise.all(
      mock.brawl.brawlers.map(async (b) => ({ ...b, icon: await brawlIconByName(b.name) })),
    );
    return { brawlers, rotation: mock.brawl.rotation, stats: 'example' };
  },
  async news() {
    return getNews('brawl', mock.brawl.news);
  },
  async player(raw) {
    const tag = tagOrThrow(raw);
    if (!isLive('brawl')) {
      const p = mock.brawl.player;
      return { name: p.name, tag: decodeURIComponent(tag), stats: p.stats.map(([label, value]) => ({ label, value })), items: p.items.map((name) => ({ name })), source: 'example' };
    }
    const p = await cached(`brawl:player:${tag}`, 2 * MIN, () => sc('brawl', `/players/${tag}`));
    const top = [...(p.brawlers ?? [])].sort((a, b) => b.trophies - a.trophies);
    return {
      name: p.name,
      tag: p.tag,
      stats: [
        { label: 'Trofeos', value: fmtNum(p.trophies) },
        { label: 'Brawlers', value: fmtNum((p.brawlers ?? []).length) },
        { label: 'Victorias 3v3', value: fmtNum(p['3vs3Victories']) },
        { label: 'Mejor brawler', value: top[0]?.name ?? '-' },
      ],
      items: top.slice(0, 8).map((b) => ({ name: b.name, label: fmtNum(b.trophies), icon: brawlIcon(b.id) })),
      source: 'live',
    };
  },
  async rankings() {
    if (!isLive('brawl')) return { players: pairs(mock.brawl.rankings.players), clans: pairs(mock.brawl.rankings.clans), source: 'example' };
    return cached('brawl:rankings', 15 * MIN, async () => {
      const p = await sc('brawl', '/rankings/global/players?limit=10');
      const c = await sc('brawl', '/rankings/global/clubs?limit=10');
      return {
        players: (p.items ?? []).map((i) => ({ name: i.name, score: i.trophies })),
        clans: (c.items ?? []).map((i) => ({ name: i.name, score: i.trophies })),
        source: 'live',
      };
    });
  },
};

export const GAMES = { royale, clans, brawl };
