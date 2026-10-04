# Barbería Pergamino

**Fausto Furlano Buti Barber Shop** · Desde 2018 · +10 años de experiencia · *Cortes adaptados a tu estilo*. El logo está en `public/logo.png` (también es el ícono de la app instalada: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`). Si en Gestión → Ajustes se sube otro logo, ese tiene prioridad.

Sistema de turnos y gestión para Fausto Furlano Buti Barber Shop (dueño + 4 barberos) sobre Cloudflare Workers + D1.

- **Clientes:** `/reservar/` (turno) y `/reservar/?modo=fila` (sin turno, para el QR del local)
- **Equipo y dueños:** `/gestion/` (con PIN, pensado para el celular)

## Qué incluye (Fase 1)
Turnos y fila por orden de llegada (el cliente elige barbero y servicio) · panel de cada barbero (Mi día, Hecho / No asistió / Cancelar) ·
comisión automática por día, semana y mes · panel del dueño (equipo, clientes, finanzas, gastos) · aviso cuando un barbero
tiene un turno cerca de la fila. El plan completo está en `ROADMAP.md`.

## Publicar: ZIP → GitHub → Cloudflare
1. Subí **el contenido** de este proyecto a un repositorio de GitHub (`wrangler.toml` tiene que quedar en la raíz).
2. En Cloudflare: **Workers & Pages → Create → Workers → Import a repository**, elegí el repo y dejá los comandos por defecto (`npx wrangler deploy`).
3. En el primer deploy Cloudflare crea la base D1 (`DB`) y la vincula. El Worker crea las tablas y los datos de ejemplo la primera vez que se usa.
   Solo se usa D1 (sin KV ni R2). Cada `git push` vuelve a publicar.

## Primeros pasos
La guía completa de puesta en marcha (GitHub, Cloudflare, avisos push, dominio y lo que hay que configurar al primer ingreso) está en **`DEPLOY.md`**.

Datos de ejemplo que vienen cargados (cambiar antes de usarlo en serio):
| Quién | PIN inicial |
|---|---|
| Fausto (dueño) | 1234 |
| Eric / Santino / Santino E. / Ale | 1111 / 2222 / 3333 / 4444 |

Los servicios, precios, duraciones y horarios (lunes a sábado, de 8 a 21) son los reales de Fausto. Los productos y el teléfono del local todavía no están cargados. Todo se edita desde **Gestión → Ajustes**.

## Estructura
`worker.js` (API) · `schema.sql` (tablas D1) · `public/app.css` y `public/gestion/gestion.css` (misma base visual que ElMellyBarber, en claro con dorado), `public/common.js` · `public/reservar/` · `public/gestion/`

## Avisos push (opcional, solo D1 + secrets + cron)
Mismo sistema que Melly Barber y BarberFlowBR: push cifrado con bandeja de salida (cada aviso se manda una sola vez y no se pisan si llegan varios seguidos). Cargá en Cloudflare (Workers → Settings → Variables and Secrets) como **Secret**: `VAPID_PUBLIC`, `VAPID_PRIVATE` (JWK en una línea) y `VAPID_SUBJECT` (`mailto:tu@mail.com`).

**Quién recibe qué:** cada aviso del equipo le llega solo al barbero del turno y a los dueños. Eric no ve los turnos de Santino y viceversa; Fausto ve los de todos. Lo mismo vale para la campana dentro de la app. Cada celular pertenece a una sola persona de equipo a la vez: si otro barbero entra y activa los avisos en ese celular, se los quita al anterior (y al cerrar sesión el celular se libera).

**Cuándo:** turno nuevo, fila, cancelaciones, poco stock y un recordatorio 1 hora antes de cada turno (al barbero del turno, a los dueños y al cliente). El cron de `wrangler.toml` corre cada 10 min, crea los recordatorios y reintenta los avisos que hayan quedado pendientes. En iPhone hay que instalar la app primero.

**Activar:** el equipo toca *Activar avisos* en Mi día (en Cuenta o Ajustes está el botón de prueba y el de desactivar). Los clientes lo hacen en `/reservar/mis-turnos.html`.

## Fotos
Las fotos de servicios y productos están en `public/img/*.webp` y se asignan una sola vez al primer arranque (ids `static-*`). Se reemplazan desde Gestión → Servicios / Productos. Los 3 productos (bálsamo, cera, gel) se crean **inactivos**: cargá precio y stock y activalos.

## Animaciones
Las de la página de reservas están en `public/fx.js` y al final de `public/app.css` (sección *Animaciones*). Se apagan solas si el celular tiene activado "reducir movimiento".
