# Cambios: estilo visual (FX) + página "Cargar turno"

Base: repo actualizado del 27/10/2026 (worker.js, gestion.js y sw.js con el arreglo del cambio de día y la auditoría).

## Qué se agregó
- `public/fx-base.css` y `public/fx-base.js`: fondo animado, vidrio estilo iOS, botones, esqueleto de carga, reflejo con el giroscopio y cinta dorada. Los usan gestión, reservar, mis-turnos y cargar.
- `public/gestion/gestion-fx.css` y `gestion-fx.js`: poste de barbero, animación de pestañas, números que suben, login.
- `public/reservar/reservar-fx.css` y `reservar-fx.js`: vidrio para servicios, horarios, precio y comprobante; esqueleto de la primera carga; cinta dorada al confirmar el turno. Se conserva la foto del local y las animaciones propias de la página.
- `public/cargar/` (nueva página, link aparte: `/cargar/`): carga rápida de turnos o fila, con estado Pendiente / Hecho / No asistió / Cancelado. Usa la misma sesión de gestión y los mismos pedidos del Worker (`/boot`, `/appt/create`, `/queue/add`, `/appt/done`, `/appt/status`). Instalable como app aparte.

## Qué se modificó (mínimo)
- `public/gestion/gestion.js`: UNA línea, el botón "Agenda rápida" arriba de "+ Turno" en la pestaña Agenda (lleva a `/cargar/`). No se toca nada más de la lógica.
- `public/gestion/index.html`, `public/reservar/index.html`, `public/reservar/mis-turnos.html`: links a los archivos FX nuevos.
- `public/sw.js`: caché `bp15` -> `bp16` para que los celulares tomen los archivos nuevos.
- `worker.js`, base de datos (D1): SIN CAMBIOS.

## Rendimiento
- El desenfoque del vidrio solo se usa donde flota sobre contenido que se mueve (barra de pestañas, hojas, avisos, barra del precio). Las tarjetas usan vidrio sin desenfoque.
- Equipos con pocos núcleos o poca memoria, o con "reducir movimiento" activado, pasan solos a modo liviano.
