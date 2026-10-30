# SCKING

Web no oficial para jugadores de Clash Royale, Clash of Clans y Brawl Stars.
Proyecto de fans sin fines de lucro. No está afiliado ni avalado por Supercell.

## Cómo correrlo

Necesitás Node 20 o más nuevo. No hay dependencias que instalar.

```
npm start
```

Abrí http://localhost:3000. Sin keys funciona en **modo ejemplo**: datos inventados y
recuadros con la inicial en lugar de imágenes.

## Pasar a datos reales (con imágenes)

1. Creá una cuenta y una key en cada portal. Podés empezar solo con Clash Royale:
   - Clash Royale: https://developer.clashroyale.com
   - Clash of Clans: https://developer.clashofclans.com
   - Brawl Stars: https://developer.brawlstars.com
2. Al crear la key te piden una **dirección IP permitida**. Poné la IP pública desde la que
   vas a correr el servidor (si lo corrés en tu casa, es la que muestra una búsqueda de "cuál es mi IP").
   Si tu proveedor te cambia la IP, hay que crear otra key.
3. Copiá `.env.example` como `.env` y pegá cada key.
4. Reiniciá con `npm start`. En la parte de arriba de la web, cada juego pasa a "datos reales".

Con key de Clash Royale aparecen las imágenes de las cartas en los mazos y en el perfil de jugador.
Con key de Brawl Stars aparecen las imágenes de los brawlers (vienen de Brawlify).

## Qué es real y qué es de ejemplo

| Parte | Estado |
|---|---|
| Perfil de jugador por etiqueta | Real con key |
| Rankings globales | Real con key |
| Imágenes de cartas (Royale) y brawlers (Brawl Stars) | Reales con key |
| Estadísticas de meta (uso, % de victorias) | **De ejemplo**. Hay que calcularlas |
| Rotación de eventos, ejércitos, tracker de aldea | De ejemplo |
| Videos de YouTube | Reales, de los canales listados en `src/channels.js` (sin key). Brawl Stars y Clash Royale tienen 5 canales cada uno; Clash of Clans todavía no tiene |
| Novedades y parches | Reales, leídas del blog oficial de Supercell (título, fecha y enlace). Si no se pueden leer, se muestran de ejemplo. No necesita key |
| Imágenes de tropas y héroes de Clash of Clans | Sin resolver |

Las rutas de rankings y de imágenes de Brawlify se escribieron sin poder probarlas contra
las APIs reales. Si alguna falla con key, la web muestra el mensaje de error y se corrige rápido.

## Pruebas

```
npm test
```

Levanta una API de Supercell falsa y verifica el modo ejemplo y el modo real sin usar internet.

## Estructura

```
src/server.js        servidor y rutas /api
src/games.js         lógica de cada juego
src/lib/supercell.js cliente de las APIs oficiales (key, etiquetas, errores)
src/lib/cache.js     caché en memoria
src/mock.js          datos de ejemplo
public/              la web
test/smoke.mjs       pruebas
PLAN.md              plan del proyecto
```

## Próximos pasos

1. Colector de partidas de los mejores jugadores para calcular el meta real.
2. Verificar el lector de novedades contra las páginas reales (Brawl Stars no se pudo revisar).
3. Imágenes de Clash of Clans.
4. Publicarlo en un servidor con IP fija y empaquetarlo como app.
