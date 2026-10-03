# Guía de puesta en marcha

Todo se hace una sola vez. Después, cada `git push` vuelve a publicar.

## 1. Subir el proyecto a GitHub
1. Creá un repositorio (puede ser privado) y subí **el contenido** de esta carpeta, no la carpeta en sí: `wrangler.toml` tiene que quedar en la raíz.
2. Borrá del repo cualquier archivo suelto que no sea del proyecto.

## 2. Conectarlo a Cloudflare
1. Cloudflare → **Workers & Pages → Create → Workers → Import a repository** y elegí el repo.
2. Dejá los comandos por defecto (`npx wrangler deploy`) y publicá.
3. En el primer deploy Cloudflare crea la base de datos D1 (`DB`) y la vincula sola. Las tablas y los datos iniciales los crea el Worker la primera vez que alguien abre la página.
4. El cron de cada 10 minutos ya viene en `wrangler.toml` (recordatorios a los clientes y cierre automático de turnos viejos). Verificá en **Settings → Triggers** que aparezca.

## 3. Avisos push (opcional, pero recomendado)
Sin esto la app funciona igual, pero no llegan notificaciones al celular.

1. En tu computadora, con Node instalado, corré:
   ```
   node -e "const c=require('crypto');const {publicKey,privateKey}=c.generateKeyPairSync('ec',{namedCurve:'P-256'});const p=publicKey.export({format:'jwk'});console.log('VAPID_PUBLIC='+Buffer.concat([Buffer.from([4]),Buffer.from(p.x,'base64url'),Buffer.from(p.y,'base64url')]).toString('base64url'));console.log('VAPID_PRIVATE='+JSON.stringify(privateKey.export({format:'jwk'})))"
   ```
2. En Cloudflare → tu Worker → **Settings → Variables and Secrets**, agregá tres **Secrets**:
   - `VAPID_PUBLIC` (la primera línea)
   - `VAPID_PRIVATE` (la segunda línea, entera, en una sola línea)
   - `VAPID_SUBJECT` = `mailto:` + un mail real (por ejemplo `mailto:fausto@tudominio.com`)
3. Guardá las claves en un lugar seguro. Si se pierden, hay que generar otras y todos tienen que volver a activar los avisos.
4. En iPhone la app tiene que estar instalada en la pantalla de inicio para recibir avisos.
5. Cada barbero entra a `/gestion/` con su PIN y toca **Activar avisos** (Mi día). Para comprobar que llega, en **Cuenta** (o **Ajustes**, para el dueño) está **Enviar aviso de prueba**: se manda solo a ese celular.
6. Cada celular es de una sola persona de equipo: los avisos de un barbero no le llegan a otro, y el dueño recibe los de todos.

## 4. Dominio propio (opcional)
Worker → **Settings → Domains & Routes → Add → Custom domain**.

## 5. Primer ingreso: lo que hay que hacer antes de abrirlo al público
Entrá a `/gestion/` como **Fausto** (PIN 1234) y, en este orden:

1. **Cambiar el PIN** (aparece un aviso arriba). Elegí uno que nadie adivine.
2. **Ajustes → Seguridad → Pregunta de seguridad**: cargá una pregunta y respuesta. Es lo que permite recuperar el PIN.
3. **Ajustes → Equipo**: cada barbero entra con el PIN de ejemplo (Eric 1111, Santino 2222, Santino E. 3333, Ale 4444). Usá *Restablecer PIN* o pedile a cada uno que lo cambie desde *Cuenta*.
4. **Ajustes → Datos de la barbería**: teléfono, logo y comisión.
5. **Ajustes → Servicios**: revisá precios y duraciones; cargá descripciones y fotos.
6. **Ajustes → Productos**: cargá los productos con su stock.
7. **Ajustes → Cancelaciones**: elegí cómo querés que funcione. El resumen del día se genera cuando quieras con el botón **Generar resumen del día** de Finanzas (sale como imagen para guardar o compartir).
8. Probá una reserva completa desde `/reservar/` en un celular, y una desde la fila (`/reservar/?modo=fila`).

## 6. Qué se cambia desde el panel y qué no
**Desde Gestión → Ajustes:** datos del local y logo, horarios y cada cuánto se ofrecen turnos, días para reservar, servicios, adicionales y productos (con fotos y stock), equipo y comisiones, PIN y seguridad, cancelaciones sobre la hora, promociones y bloqueos.

**Solo desde el código o Cloudflare:** los colores, el ícono de la app instalada (`public/icon-192.png` y `public/icon-512.png`), los medios de pago (efectivo y transferencia), los textos de los avisos automáticos, las claves de notificaciones, la base de datos y el dominio.

## 7. Si algo no anda
- *No entra al panel:* revisá que haya pasado un minuto desde el deploy; la primera visita crea las tablas.
- *Bloqueado por intentos:* esperá el tiempo de bloqueo (15 minutos por defecto) o restablecé el PIN desde el panel del dueño.
- *No llegan avisos:* confirmá los tres secrets, que la persona haya tocado *Activar avisos* (el equipo) o *Activar recordatorios* (el cliente) y, en iPhone, que la app esté instalada. Probá con *Enviar aviso de prueba* y mirá **Worker → Logs** (aparecen como `PUSH_STATUS` o `PUSH_SEND_ERROR`).
- *Cloudflare no muestra errores claros:* **Worker → Logs** (ya están activados).
