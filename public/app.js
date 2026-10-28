const GAMES = {
  royale: { name: 'Clash Royale', sub: 'Mazos y cartas' },
  clans: { name: 'Clash of Clans', sub: 'Ejércitos y aldea' },
  brawl: { name: 'Brawl Stars', sub: 'Brawlers y eventos' },
};
const ALL_TABS = ['Meta', 'Novedades', 'Jugador', 'Rankings'];
// Clash of Clans no muestra Rankings por ahora.
const tabsFor = (game) => (game === 'clans' ? ALL_TABS.filter((t) => t !== 'Rankings') : ALL_TABS);

const state = { game: 'royale', tab: 'Meta', sort: 'win', rank: 'players', tag: '', status: {} };
let renderToken = 0;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('es-AR');
const pct = (n) => n.toFixed(1).replace('.', ',') + '%';

async function api(path) {
  const res = await fetch('/api' + path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error ' + res.status);
  return data;
}

/* Recuadro de carta/brawler: usa la imagen si la API la trae, si no un recuadro con la inicial. */
function tile(item, { small = false, label = '' } = {}) {
  const elixir = typeof item.elixir === 'number' ? `<span class="el">${item.elixir}</span>` : '';
  const lv = label ? `<span class="lv">${esc(label)}</span>` : '';
  const initial = esc((item.name || '?')[0]);
  const body = item.icon
    ? `<img src="${esc(item.icon)}" alt="${esc(item.name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ini',textContent:this.alt.charAt(0)}))">`
    : `<span class="ini">${initial}</span>${small ? '' : `<span class="cn">${esc(item.name)}</span>`}`;
  return `<div class="ctile${small ? ' sm' : ''}${item.icon ? ' hasimg' : ''}" title="${esc(item.name)}">${elixir}${body}${lv}</div>`;
}

/* ---------- Pestaña Meta ---------- */
function metaRoyale(d) {
  const decks = d.decks.map((k, i) => `
    <div class="row"><span class="pos">${i + 1}</span>
      <div><div class="name">${esc(k.name)}</div><div class="sub">Elixir promedio ${k.elixir == null ? '-' : String(k.elixir).replace('.', ',')}</div></div>
      <div class="stats"><span>Uso ${pct(k.use)}</span><span class="w">Vic. ${pct(k.win)}</span></div>
      <div class="deck">${k.cards.map((c) => tile(c)).join('')}</div>
    </div>`).join('');
  const cards = d.topCards.map((c, i) => `
    <div class="row"><span class="pos">${i + 1}</span>
      <div class="cardname">${tile(c, { small: true })}<span class="name">${esc(c.name)}</span></div>
      <div class="stats"><span>Uso ${pct(c.use)}</span><span class="w">Vic. ${pct(c.win)}</span></div>
      <div class="bar"><i style="width:${Math.min(100, c.use * 2)}%"></i></div></div>`).join('');
  return `<section><h2>Mazos meta <small>Estadísticas de ejemplo</small></h2><div class="list">${decks}</div></section>
          <section><h2>Cartas más usadas <small>Estadísticas de ejemplo</small></h2><div class="list">${cards}</div></section>`;
}

function metaBrawl(d) {
  const key = state.sort === 'win' ? 'win' : 'use';
  const rows = [...d.brawlers].sort((a, b) => b[key] - a[key]).map((b, i) => `
    <div class="row"><span class="pos">${i + 1}</span>
      <div class="cardname">${tile(b, { small: true })}<div><div class="name">${esc(b.name)}</div><div class="sub">${esc(b.role)}</div></div></div>
      <div class="stats"><span>Uso ${pct(b.use)}</span><span class="${b.win >= 50 ? 'w' : 'l'}">Vic. ${pct(b.win)}</span></div>
      <div class="bar"><i style="width:${Math.min(100, state.sort === 'win' ? b.win * 1.8 : b.use * 16)}%"></i></div></div>`).join('');
  const rot = d.rotation.map((r) => `
    <div class="row" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="name">${esc(r.mode)}</div><div class="sub">${esc(r.map)}</div></div>
    <div class="stats"><span>Termina en ${esc(r.ends)}</span></div></div>`).join('');
  return `<section><h2>Brawlers meta
      <label class="ctl">Ordenar por
        <select id="sort"><option value="win"${state.sort === 'win' ? ' selected' : ''}>% de victorias</option><option value="use"${state.sort === 'use' ? ' selected' : ''}>% de uso</option></select>
      </label></h2><div class="list">${rows}</div></section>
    <section><h2>Rotación de eventos <small>Ejemplo</small></h2><div class="list">${rot}</div></section>`;
}

function metaClans(d) {
  const arm = d.armies.map((a, i) => `
    <div class="row"><span class="pos">${i + 1}</span><div class="name">${esc(a.name)}</div>
      <div class="stats"><span>Uso ${pct(a.use)}</span><span class="w">3★ ${a.win}%</span></div>
      <div class="bar"><i style="width:${Math.min(100, a.use * 3.5)}%"></i></div></div>`).join('');
  const tr = d.tracker.map((t) => `
    <div class="row" style="grid-template-columns:minmax(0,1fr) auto"><div class="name">${esc(t.name)}</div><div class="stats"><span>${t.pct}%</span></div>
      <div class="bar" style="grid-column:1/-1"><i style="width:${t.pct}%"></i></div></div>`).join('');
  return `<section><h2>Ejércitos de ataque <small>Ejemplo</small></h2><div class="list">${arm}</div></section>
          <section><h2>Progreso de mi aldea <small>Rastreador de mejoras · ejemplo</small></h2><div class="list">${tr}</div></section>`;
}

/* ---------- Otras pestañas ---------- */
function newsView(d) {
  const note = d.source === 'example'
    ? '<p class="note">No se pudieron leer las novedades oficiales. Se muestran noticias de ejemplo.</p>'
    : '<p class="note">Fuente: blog oficial de Supercell. Tocá una novedad para leerla completa allí.</p>';
  return `<section><h2>Novedades y parches</h2>${note}<div class="list">` +
    d.items.map((n) => `
      <article class="news${n.image ? ' withimg' : ''}">${n.image ? `<img class="thumb" src="${esc(n.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<div class="body"><div class="meta"><span class="tag">${esc(n.tag)}</span><span>${esc(n.date)}</span></div><h3>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">${esc(n.title)}</a>` : esc(n.title)}</h3>${n.text ? `<p>${esc(n.text)}</p>` : ''}</div></article>`).join('') +
    '</div></section>';
}

function playerView(p, err) {
  const card = p ? `<div class="profile">
      <div><div class="sub">${esc(p.tag)}${p.source === 'example' ? ' · datos de ejemplo' : ''}</div><h3>${esc(p.name)}</h3></div>
      <div class="kv">${p.stats.map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div>
      <div class="itemgrid">${p.items.map((i) => (i.icon || typeof i.elixir === 'number') ? tile(i, { label: i.label }) : `<span class="chip">${esc(i.name)}</span>`).join('')}</div>
    </div>` : '';
  return `<section><h2>Buscar jugador</h2>
    <form class="search" id="form"><input id="tag" placeholder="Etiqueta, por ejemplo #2PP" autocomplete="off" aria-label="Etiqueta de jugador" value="${esc(state.tag)}"><button class="btn" type="submit">Buscar</button></form>
    <div class="err" id="err">${esc(err || '')}</div></section>${card}`;
}

function rankingsView(d) {
  const rows = state.rank === 'players' ? d.players : d.clans;
  const unit = state.rank === 'players' ? 'Trofeos' : 'Puntos';
  return `<section><h2>Rankings <small>Global${d.source === 'example' ? ' · ejemplo' : ''}</small></h2>
    <div class="seg" role="group" aria-label="Tipo de ranking">
      <button data-rank="players" aria-pressed="${state.rank === 'players'}">Jugadores</button>
      <button data-rank="clans" aria-pressed="${state.rank === 'clans'}">Clanes</button></div>
    <div class="tbl" style="margin-top:12px"><table><thead><tr><th>#</th><th>${state.rank === 'players' ? 'Jugador' : 'Clan'}</th><th class="n">${unit}</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td class="n">${fmt(r.score)}</td></tr>`).join('')}
    </tbody></table></div></section>`;
}

/* ---------- Estructura ---------- */
function renderChrome() {
  $('app').dataset.game = state.game;
  $('games').innerHTML = Object.entries(GAMES).map(([k, g]) =>
    `<button class="game" data-game="${k}" aria-pressed="${state.game === k}"><b>${g.name}</b><small>${g.sub}</small></button>`).join('');
  $('tabs').innerHTML = tabsFor(state.game).map((t) =>
    `<button class="tab" role="tab" data-tab="${t}" aria-selected="${state.tab === t}">${t}</button>`).join('');
  $('status').innerHTML = Object.entries(GAMES).map(([k, g]) => {
    const live = state.status[k] === 'live';
    return `<span><span class="dot${live ? ' live' : ''}"></span><b>${g.name}</b> ${live ? 'datos reales' : 'modo ejemplo'}</span>`;
  }).join('');
}

async function renderPanel(extra = {}) {
  const token = ++renderToken;
  const panel = $('panel');
  const game = state.game;
  if (state.tab === 'Jugador') {
    panel.innerHTML = playerView(extra.profile, extra.err);
    return;
  }
  panel.innerHTML = '<div class="loading">Cargando…</div>';
  try {
    let html;
    if (state.tab === 'Meta') {
      const d = await api(`/${game}/meta`);
      html = game === 'royale' ? metaRoyale(d) : game === 'brawl' ? metaBrawl(d) : metaClans(d);
    } else if (state.tab === 'Novedades') {
      html = newsView(await api(`/${game}/news`));
    } else {
      html = rankingsView(await api(`/${game}/rankings`));
    }
    if (token === renderToken) panel.innerHTML = html;
  } catch (e) {
    if (token === renderToken) panel.innerHTML = `<div class="err">${esc(e.message)}</div>`;
  }
}

function render() {
  if (!tabsFor(state.game).includes(state.tab)) state.tab = 'Meta';
  renderChrome();
  renderPanel();
}

document.addEventListener('click', (e) => {
  const g = e.target.closest('.game');
  if (g) { state.game = g.dataset.game; state.tag = ''; return render(); }
  const t = e.target.closest('[data-tab]');
  if (t) { state.tab = t.dataset.tab; return render(); }
  const r = e.target.closest('[data-rank]');
  if (r) { state.rank = r.dataset.rank; return renderPanel(); }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'sort') { state.sort = e.target.value; renderPanel(); }
});

document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form') return;
  e.preventDefault();
  const raw = $('tag').value.trim();
  state.tag = raw;
  if (!raw) return renderPanel({ err: 'Escribí una etiqueta, por ejemplo #2PP.' });
  const token = ++renderToken;
  $('err').textContent = 'Buscando…';
  try {
    const p = await api(`/${state.game}/players/${encodeURIComponent(raw)}`);
    if (token === renderToken) renderPanel({ profile: p });
  } catch (err) {
    if (token === renderToken) renderPanel({ err: err.message });
  }
});

(async function init() {
  try { state.status = (await api('/status')).games; } catch { /* sin estado */ }
  render();
})();
