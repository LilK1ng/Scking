// Prueba de humo: levanta una API de Supercell falsa y dos copias del servidor
// (modo ejemplo y modo real) y verifica las respuestas. No usa internet.
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const KEY = 'clave-de-prueba';

// ---- API falsa con la misma forma de respuesta que las APIs oficiales ----
const fakeRoutes = {
  '/royale/v1/cards': { items: [
    { name: 'Hog Rider', id: 26000021, elixirCost: 4, iconUrls: { medium: 'https://fake.test/hog.png' } },
    { name: 'Fireball', id: 28000000, elixirCost: 4, iconUrls: { medium: 'https://fake.test/fireball.png' } },
  ] },
  '/royale/v1/players/%232PP': { name: 'Prueba', tag: '#2PP', expLevel: 60, trophies: 8000, bestTrophies: 9000, clan: { name: 'Clan X' },
    currentDeck: [{ name: 'Hog Rider', elixirCost: 4, iconUrls: { medium: 'https://fake.test/hog.png' } }] },
  // pathoflegend falla a propósito para probar el plan B
  '/royale/v1/locations/global/rankings/players?limit=10': { items: [{ name: 'Top1', trophies: 12000 }] },
  '/royale/v1/locations/global/rankings/clans?limit=10': { items: [{ name: 'ClanTop', clanScore: 60000 }] },
  '/brawl/v1/brawlers': { items: [{ id: 16000000, name: 'SHELLY' }, { id: 16000003, name: 'SPIKE' }] },
  '/brawl/v1/players/%232PP': { name: 'BS', tag: '#2PP', trophies: 30000, '3vs3Victories': 500,
    brawlers: [{ id: 16000003, name: 'SPIKE', trophies: 900 }, { id: 16000000, name: 'SHELLY', trophies: 700 }] },
  '/brawl/v1/rankings/global/players?limit=10': { items: [{ name: 'P1', trophies: 90000 }] },
  '/brawl/v1/rankings/global/clubs?limit=10': { items: [{ name: 'C1', trophies: 1800000 }] },
  '/coc/v1/players/%232PP': { name: 'Aldeano', tag: '#2PP', townHallLevel: 15, trophies: 5000, warStars: 100,
    heroes: [{ name: 'Barbarian King', level: 80, village: 'home' }, { name: 'Battle Machine', level: 30, village: 'builderBase' }] },
  '/coc/v1/locations?limit=500': { items: [{ id: 32000000, name: 'Europe', isCountry: false }, { id: 32000999, name: 'International', isCountry: false }] },
  '/coc/v1/locations/32000999/rankings/players?limit=10': { items: [{ name: 'CP', trophies: 6000 }] },
  '/coc/v1/locations/32000999/rankings/clans?limit=10': { items: [{ name: 'CC', clanPoints: 50000 }] },
};

// Página de blog simulada (la forma real no se pudo ver como HTML; esto cubre los casos previstos).
const BLOG_HTML = `<ul>
  <li><a href="/en/games/clashroyale/blog/release-notes/new-season-king-vs-king/"><img src="/img/a.png"></a>
      <span>Blog &ndash; Clash Royale</span> <time>27 oct 2026</time>
      <a href="/en/games/clashroyale/blog/release-notes/new-season-king-vs-king/">New Season: King vs. King!</a></li>
  <li><img data-src="https://cdn.test/b.jpg" src="data:image/gif;base64,R0lGOD"><a href="/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/">Blog – Clash Royale 6 oct 2026 October Balance Changes</a></li>
  <li><a href="/en/games/clashroyale/blog/release-notes/solo-slug-sin-texto/"></a></li>
</ul>`;

const ART1 = `<html><head><meta property="og:description" content="La nueva temporada trae un modo &amp; recompensas nuevas. ${'Texto largo para recortar. '.repeat(20)}"></head><body></body></html>`;
const ART2 = `<html><body><p>corto</p><p>Este es el primer párrafo largo del artículo, con suficiente texto como para usarse de adelanto.</p></body></html>`;
const fake = http.createServer((req, res) => {
  if (req.url === '/en/games/clashroyale/blog/release-notes/new-season-king-vs-king/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(ART1); }
  if (req.url === '/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(ART2); }
  if (req.url === '/en/games/clashroyale/es/blog/') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(BLOG_HTML); }
  if (req.url.startsWith('/en/games/')) { res.writeHead(404); return res.end('no'); }
  const send = (s, b) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(b)); };
  if (req.headers.authorization !== `Bearer ${KEY}`) return send(403, { reason: 'accessDenied' });
  const hit = fakeRoutes[req.url];
  if (hit) return send(200, hit);
  send(404, { reason: 'notFound' });
});
await new Promise((r) => fake.listen(4101, r));

// ---- Servidores bajo prueba ----
function start(port, extraEnv) {
  const env = { PATH: process.env.PATH, PORT: String(port), ...extraEnv };
  const child = spawn(process.execPath, ['src/server.js'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((resolve) => {
    child.stdout.on('data', (d) => { if (String(d).includes('SCKING en')) resolve(child); });
  });
}

const mockSrv = await start(4102, { NEWS_BASE_URL: 'http://localhost:1' });
const liveSrv = await start(4103, {
  CR_API_KEY: KEY, COC_API_KEY: KEY, BS_API_KEY: KEY, NEWS_BASE_URL: 'http://localhost:4101',
  CR_BASE_URL: 'http://localhost:4101/royale/v1', COC_BASE_URL: 'http://localhost:4101/coc/v1', BS_BASE_URL: 'http://localhost:4101/brawl/v1',
});

const get = async (port, path) => {
  const r = await fetch(`http://localhost:${port}${path}`);
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: r.status, json, text };
};

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('  ok  ', name); }
  catch (e) { failed++; console.log('  FALLA', name, '\n       ', e.message); }
}

console.log('Modo ejemplo');
await check('estado: los tres en ejemplo', async () => {
  const r = await get(4102, '/api/status');
  assert.deepEqual(r.json.games, { royale: 'example', clans: 'example', brawl: 'example' });
});
await check('meta Royale: mazos de 8 cartas, sin imágenes, elixir calculado', async () => {
  const { json } = await get(4102, '/api/royale/meta');
  assert.equal(json.decks[0].cards.length, 8);
  assert.equal(json.decks[0].cards[0].icon, null);
  assert.equal(json.decks[0].elixir, 2.6);
});
await check('meta Brawl y Clans responden', async () => {
  assert.ok((await get(4102, '/api/brawl/meta')).json.brawlers.length > 0);
  assert.ok((await get(4102, '/api/clans/meta')).json.armies.length > 0);
});
await check('jugador de ejemplo con etiqueta válida', async () => {
  const { json } = await get(4102, '/api/royale/players/%232PP');
  assert.equal(json.source, 'example');
  assert.equal(json.tag, '#2PP');
});
await check('etiqueta inválida da 400', async () => {
  assert.equal((await get(4102, '/api/royale/players/%23ZZZ')).status, 400);
});
await check('rankings y noticias en los 3 juegos', async () => {
  for (const g of ['royale', 'clans', 'brawl']) {
    assert.ok((await get(4102, `/api/${g}/rankings`)).json.players.length > 0);
    assert.ok((await get(4102, `/api/${g}/news`)).json.items.length > 0);
  }
});
await check('sirve la página y archivos estáticos', async () => {
  assert.ok((await get(4102, '/')).text.includes('SCKING'));
  assert.equal((await get(4102, '/app.js')).status, 200);
  assert.equal((await get(4102, '/../package.json')).status, 404);
});

console.log('Modo real (API falsa)');
await check('estado: los tres en real', async () => {
  assert.deepEqual((await get(4103, '/api/status')).json.games, { royale: 'live', clans: 'live', brawl: 'live' });
});
await check('Royale: las cartas del meta traen imagen y costo reales', async () => {
  const { json } = await get(4103, '/api/royale/meta');
  const hog = json.decks[0].cards.find((c) => c.name === 'Hog Rider');
  assert.equal(hog.icon, 'https://fake.test/hog.png');
});
await check('Royale: perfil de jugador real', async () => {
  const { json } = await get(4103, '/api/royale/players/2pp');
  assert.equal(json.source, 'live');
  assert.equal(json.name, 'Prueba');
  assert.equal(json.items[0].icon, 'https://fake.test/hog.png');
  assert.equal(json.stats[1].value, (8000).toLocaleString('es-AR'));
});
await check('Royale: ranking usa el plan B si el primero falla', async () => {
  const { json } = await get(4103, '/api/royale/rankings');
  assert.equal(json.players[0].name, 'Top1');
  assert.equal(json.clans[0].score, 60000);
});
await check('Royale: jugador inexistente da 404 con mensaje', async () => {
  const r = await get(4103, '/api/royale/players/8888');
  assert.equal(r.status, 404);
  assert.match(r.json.error, /No se encontró/);
});
await check('Brawl: imágenes por id y perfil real', async () => {
  const meta = (await get(4103, '/api/brawl/meta')).json;
  assert.match(meta.brawlers.find((b) => b.name === 'Spike').icon, /16000003\.png$/);
  const p = (await get(4103, '/api/brawl/players/2PP')).json;
  assert.equal(p.stats[3].value, 'SPIKE');
  assert.equal(p.items.length, 2);
});
await check('Clans: perfil real con héroes de la aldea principal', async () => {
  const { json } = await get(4103, '/api/clans/players/2PP');
  assert.equal(json.items.length, 1);
  assert.equal(json.items[0].name, 'Barbarian King 80');
});
await check('Clans y Brawl: rankings reales', async () => {
  assert.equal((await get(4103, '/api/clans/rankings')).json.clans[0].score, 50000);
  assert.equal((await get(4103, '/api/brawl/rankings')).json.players[0].name, 'P1');
});

console.log('Novedades');
await check('sin acceso al blog: se muestran las de ejemplo', async () => {
  const { json } = await get(4102, '/api/royale/news');
  assert.equal(json.source, 'example');
  assert.ok(json.items.length > 0);
});
await check('con blog simulado: título, fecha, enlace y etiqueta', async () => {
  const { json } = await get(4103, '/api/royale/news');
  assert.equal(json.source, 'live');
  assert.equal(json.items.length, 3);
  const [a, b, c] = json.items;
  assert.equal(a.title, 'New Season: King vs. King!');
  assert.equal(a.date, '27 oct 2026');
  assert.equal(a.tag, 'Temporada');
  assert.equal(a.url, 'http://localhost:4101/en/games/clashroyale/blog/release-notes/new-season-king-vs-king/');
  assert.equal(b.title, 'October Balance Changes');
  assert.equal(b.tag, 'Balance');
  assert.equal(c.title, 'Solo slug sin texto');
  assert.equal(a.image, 'http://localhost:4101/img/a.png');
  assert.ok(a.text.startsWith('La nueva temporada trae un modo & recompensas nuevas.'));
  assert.ok(a.text.length <= 221 && a.text.endsWith('…'));
  assert.equal(b.text, 'Este es el primer párrafo largo del artículo, con suficiente texto como para usarse de adelanto.');
  assert.equal(c.text, '');
  assert.equal(b.image, 'https://cdn.test/b.jpg');
  assert.equal(c.image, null);
});
await check('blog que falla en otro juego: vuelve a los ejemplos', async () => {
  assert.equal((await get(4103, '/api/brawl/news')).json.source, 'example');
});

mockSrv.kill(); liveSrv.kill(); fake.close();
console.log(failed ? `\n${failed} prueba(s) fallaron` : '\nTodas las pruebas pasaron');
process.exit(failed ? 1 : 0);
