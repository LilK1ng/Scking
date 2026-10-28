// Datos de ejemplo. Las estadísticas (uso, victorias) son inventadas.
// Los nombres de cartas y brawlers están en inglés, igual que la API oficial,
// para poder cruzarlos con las imágenes reales cuando hay key.

export const ELIXIR = {
  'Hog Rider': 4, Musketeer: 4, 'Ice Golem': 2, 'Ice Spirit': 1, Skeletons: 1, Cannon: 3,
  Fireball: 4, 'The Log': 2, 'P.E.K.K.A': 7, 'Electro Wizard': 4, Bandit: 3, 'Battle Ram': 4,
  Archers: 3, Poison: 4, 'Electro Spirit': 1, Golem: 8, 'Night Witch': 4, 'Baby Dragon': 4,
  Lumberjack: 4, Tornado: 3, Bats: 2, 'Balloon': 5, 'Skeleton Barrel': 3, Zap: 2, Lightning: 6,
};

export const royale = {
  decks: [
    { name: 'Hog Cycle', use: 8.4, win: 54.1, cards: ['Hog Rider', 'Musketeer', 'Ice Golem', 'Ice Spirit', 'Skeletons', 'Cannon', 'Fireball', 'The Log'] },
    { name: 'PEKKA Bridge Spam', use: 3.6, win: 53.3, cards: ['P.E.K.K.A', 'Electro Wizard', 'Bandit', 'Battle Ram', 'Archers', 'Poison', 'The Log', 'Electro Spirit'] },
    { name: 'Golem Beatdown', use: 5.1, win: 52.7, cards: ['Golem', 'Night Witch', 'Baby Dragon', 'Lumberjack', 'Tornado', 'Poison', 'Skeletons', 'Bats'] },
    { name: 'Balloon Cycle', use: 4.2, win: 51.8, cards: ['Balloon', 'Skeleton Barrel', 'Musketeer', 'Cannon', 'Lightning', 'The Log', 'Skeletons', 'Ice Spirit'] },
  ],
  topCards: [
    { name: 'Fireball', use: 38.2, win: 50.4 },
    { name: 'The Log', use: 35.6, win: 51.0 },
    { name: 'Skeletons', use: 30.1, win: 50.7 },
    { name: 'Musketeer', use: 18.4, win: 51.2 },
    { name: 'Poison', use: 14.7, win: 52.0 },
    { name: 'Hog Rider', use: 12.3, win: 53.8 },
  ],
  news: [
    { tag: 'Balance', date: '20 oct', title: 'Ajustes de equilibrio de mitad de temporada', text: 'Cambios a varias cartas de uso alto. Texto de ejemplo.' },
    { tag: 'Evento', date: '18 oct', title: 'Desafío especial del fin de semana', text: 'Reglas, recompensas y fechas del desafío. Texto de ejemplo.' },
    { tag: 'Temporada', date: '15 oct', title: 'Comienza la nueva temporada', text: 'Recompensas de temporada y cambios de liga. Texto de ejemplo.' },
  ],
  player: {
    name: 'JugadorEjemplo',
    stats: [['Nivel de rey', '62'], ['Trofeos', '8.420'], ['Mejor marca', '9.012'], ['Clan', 'Clan Ejemplo']],
    items: ['Hog Rider', 'Musketeer', 'Ice Golem', 'Ice Spirit', 'Skeletons', 'Cannon', 'Fireball', 'The Log'],
  },
  rankings: {
    players: [['Nova', 12480], ['Kuro', 12310], ['Tara', 12195], ['Ibex', 12020], ['Lumen', 11980], ['Oryx', 11890], ['Vela', 11760], ['Zeta', 11705]],
    clans: [['Clan Aurora', 58210], ['Los Delta', 57640], ['Norte Sur', 57120], ['Cima Roja', 56800], ['Vórtice', 56210], ['Sendero', 55900], ['Eclipse FC', 55480], ['Brújula', 55010]],
  },
};

export const clans = {
  armies: [
    { name: 'Dragones con globos', use: 22.5, win: 61 },
    { name: 'Montapuercos masivo', use: 18.9, win: 58 },
    { name: 'Electrodragones', use: 14.2, win: 63 },
    { name: 'Bruja y gólem', use: 9.8, win: 55 },
  ],
  tracker: [['Laboratorio', 78], ['Héroes', 64], ['Defensas', 85], ['Tropas', 91], ['Muros', 52]],
  news: [
    { tag: 'Evento', date: '21 oct', title: 'Juegos de clan: nuevas recompensas', text: 'Lista de tareas y premios de la semana. Texto de ejemplo.' },
    { tag: 'Balance', date: '17 oct', title: 'Cambios a tropas y hechizos', text: 'Resumen del parche de ejemplo con los números antes y después.' },
    { tag: 'Guerra', date: '14 oct', title: 'Liga de guerra de clanes: calendario', text: 'Fechas de inscripción y rondas. Texto de ejemplo.' },
  ],
  player: {
    name: 'AldeanoEjemplo',
    stats: [['Ayuntamiento', '15'], ['Trofeos', '5.120'], ['Estrellas de guerra', '1.204'], ['Clan', 'Clan Ejemplo']],
    items: ['Barbarian King 80', 'Archer Queen 82', 'Grand Warden 60', 'Royal Champion 55'],
  },
  rankings: {
    players: [['Titán', 6120], ['Brasa', 6040], ['Muralla', 5990], ['Cenit', 5930], ['Rayo', 5880], ['Cúmulo', 5815], ['Dux', 5790], ['Arrecife', 5740]],
    clans: [['Los Forjadores', 48120], ['Ceniza Viva', 47880], ['Gran Torre', 47410], ['Aldea Norte', 46990], ['Fénix Sur', 46500], ['Piedra Azul', 46210], ['Cobre y Oro', 45870], ['Los Centinelas', 45400]],
  },
};

export const brawl = {
  brawlers: [
    { name: 'Shelly', role: 'Luchador', use: 4.1, win: 50.2 },
    { name: 'Colt', role: 'Tirador', use: 3.4, win: 49.1 },
    { name: 'Piper', role: 'Francotirador', use: 3.9, win: 52.4 },
    { name: 'Mortis', role: 'Asesino', use: 2.8, win: 48.3 },
    { name: 'Spike', role: 'Controlador', use: 5.2, win: 53.6 },
    { name: 'Poco', role: 'Apoyo', use: 3.0, win: 51.7 },
    { name: 'Bull', role: 'Tanque', use: 2.5, win: 47.9 },
    { name: 'Brock', role: 'Francotirador', use: 4.4, win: 50.8 },
  ],
  rotation: [
    { mode: 'Atrapagemas', map: 'Mapa de ejemplo A', ends: '2 h 15 min' },
    { mode: 'Balón brawl', map: 'Mapa de ejemplo B', ends: '5 h 40 min' },
    { mode: 'Atraco', map: 'Mapa de ejemplo C', ends: '11 h 05 min' },
  ],
  news: [
    { tag: 'Brawler', date: '22 oct', title: 'Llega un nuevo brawler', text: 'Estadísticas, supers y gadgets. Texto de ejemplo.' },
    { tag: 'Balance', date: '19 oct', title: 'Ajustes de equilibrio', text: 'Brawlers mejorados y reducidos en este parche de ejemplo.' },
    { tag: 'Evento', date: '16 oct', title: 'Evento de temporada con recompensas', text: 'Fechas, fichas y premios. Texto de ejemplo.' },
  ],
  player: {
    name: 'BrawlerEjemplo',
    stats: [['Trofeos', '41.350'], ['Brawlers', '74'], ['Victorias 3v3', '6.218'], ['Mejor brawler', 'Spike']],
    items: ['Spike', 'Piper', 'Shelly', 'Brock'],
  },
  rankings: {
    players: [['Rift', 98210], ['Blaze', 97480], ['Quill', 96900], ['Onda', 96120], ['Pico', 95870], ['Sable', 95210], ['Gema', 94800], ['Trazo', 94330]],
    clans: [['Estrella Roja', 1840200], ['Los Granizo', 1812900], ['Arena Sur', 1790100], ['Hexágono', 1765400], ['Cometas', 1741000], ['Pulso', 1720600], ['Caja Fuerte', 1698900], ['Norte Libre', 1675200]],
  },
};
