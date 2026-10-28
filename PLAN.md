# Supercell Hub — Plan del proyecto

App móvil (Android + iOS) para jugadores de **Clash Royale**, **Clash of Clans** y **Brawl Stars**.

## Funciones de la v1

1. **Info de los juegos**: cartas/tropas/brawlers con stats, descripciones e imágenes.
2. **Novedades y parches**: noticias y notas de actualización por juego.
3. **Búsqueda de jugador por tag**: perfil, trofeos, mazo/ejército, estadísticas.
4. **Clanes y rankings**: buscar clanes, ver miembros, tops globales y por país.
5. **Meta**: mazos meta, brawlers meta, más usados, win rate.

## Stack propuesto

| Capa | Tecnología |
|---|---|
| App | React Native + Expo + TypeScript |
| Navegación | Expo Router |
| Datos en cliente | TanStack Query |
| Backend | Node.js + Fastify (TypeScript) |
| Base de datos | PostgreSQL (meta/estadísticas) + Redis (caché) |
| Hosting | Railway / Fly.io (IP fija para la API de Supercell) |
| Notificaciones | Expo Notifications |

## Por qué hace falta un backend

- Las APIs oficiales (developer.clashroyale.com, developer.clashofclans.com, developer.brawlstars.com) usan **API keys atadas a una IP fija**. No se pueden llamar desde el celular directamente.
- El backend hace de proxy, cachea respuestas y evita pasarse de límites de uso.
- Los datos de meta **no existen en la API oficial**, así que hay que calcularlos.

## Cómo sacar el meta (punto clave)

- Tomar los mejores jugadores del ranking (endpoints de rankings).
- Leer sus **battlelogs** periódicamente (cron cada pocas horas).
- Guardar cada partida en la base y calcular:
  - Mazos / brawlers más usados
  - Win rate y use rate
  - Mejores combinaciones, por nivel de trofeos
- Es el mismo método que usan sitios como RoyaleAPI o Brawlify.

## Fuentes de datos

- **Oficial (Supercell)**: jugadores, clanes, rankings, cartas, tropas, brawlers.
- **Imágenes/assets**: CDN de RoyaleAPI (cartas), Brawlify (brawlers), assets de la API de CoC.
- **Novedades**: feeds RSS/blogs oficiales, cuentas oficiales de X, canales de Supercell. Revisar términos de uso de cada fuente.
- Revisar la política de contenido de fans de Supercell (la app debe aclarar que no está afiliada).

### Sitios de referencia (revisados el 22/10/2026)

| Sitio | Juego | Qué ofrece | Uso para el proyecto |
|---|---|---|---|
| brawlify.com/es | Brawl Stars | Brawlers, mapas, modos, eventos y rotación (cada hora), meta de 7 días, rankings, perfiles | Tiene API pública en brawlapi.com (imágenes y datos de brawlers/mapas/eventos). Confirmar términos antes de usar. |
| royaleapi.com | Clash Royale | Mazos meta por modo, cartas populares, win rate, rankings, blog, constructor de mazos | No expone API propia documentada. Meta se calcula nosotros con la API oficial. Usarlo solo como inspiración de diseño. |
| clash.ninja | Clash of Clans | Upgrade tracker, calculadora "cuánto para maxear", guías, eventos | Sin API. Inspiración de funciones (tracker y calculadora). |
| pixelcrux.com/Clash_of_Clans | Clash of Clans | Perfil por tag, progreso de aldea, calculadora de gemas y de botín, mapeador de ataques | Sin API. Inspiración de funciones. |
| clashofclans-layouts.com | Clash of Clans | Diseños de base por Ayuntamiento | No se pudo abrir (error del sitio). Pendiente de revisar. |

Regla general: no copiar contenido ni scrapear estos sitios. Usar APIs oficiales o con permiso, y calcular el resto.

## Hoja de ruta

1. **Semana 1**: repo, backend base, claves de API, proxy + caché de jugador/clan.
2. **Semana 2**: app Expo con navegación por juego, búsqueda por tag, perfil de jugador.
3. **Semana 3**: info de cartas/tropas/brawlers + clanes y rankings.
4. **Semana 4**: recolector de battlelogs, base de datos, cálculo de meta.
5. **Semana 5**: pantallas de meta, novedades/parches, notificaciones.
6. **Semana 6**: pulido, pruebas, publicación en tiendas.

## Estructura de carpetas

```
supercell-hub/
  apps/
    mobile/        # Expo app
    api/           # Fastify backend
  packages/
    shared/        # tipos TypeScript compartidos
  PLAN.md
```

## Próximos pasos

- [ ] Crear cuentas de desarrollador en los 3 portales de Supercell y generar las keys.
- [ ] Elegir nombre y logo de la app.
- [ ] Crear el repo e inicializar el monorepo.
- [ ] Empezar por Clash Royale como primer juego y replicar el patrón en los otros dos.
