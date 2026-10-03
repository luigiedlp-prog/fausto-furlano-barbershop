# Roadmap · Fausto Furlano Buti Barber Shop

Estado: ✅ hecho · 🛠 a mano al publicar · ⬜ pendiente · ❓ depende de una respuesta de Fausto

## Datos ya definidos
- **Local:** Fausto Furlano Buti Barber Shop · Av. de Mayo 545, Pergamino · Instagram @fausto_furlano
- **Equipo:** Fausto (dueño), Eric, Santino, Santino E., Ale · comisión 50% a los barberos, pago mensual
- **Servicios (precio · duración):** Barba $15.000 · 15 min | Corte de cabello + barba $17.000 · 20 min | Corte de cabello + barba + lavado $22.000 · 30 min | Corte de cabello + barba + afeitado tradicional + lavado $28.000 · 40 min
- **Adicional:** Tratamiento facial $18.000 · 20 min (se suma a otro servicio)
- **Horario:** lunes a sábado, de 8 a 21 hs, sin corte al mediodía (editable desde el panel)
- **Turnos:** cada 15 minutos · se reserva hasta 3 días (hoy y los 2 siguientes), igual que BarberFlowBR · aviso al cancelar con menos de 1 hora
- **Productos:** son de la marca de Fausto ("Sir Fausto"); faltan nombres y precios
- **PIN:** de momento quedan los de ejemplo (dueño 1234, barberos 1111 a 4444). Cambiarlos antes de uso real.
- **Publicación:** dominio, Cloudflare y GitHub los gestiona el desarrollador.

---

## Fase 1 · Base funcionando ✅
Turnos online y fila (QR) · panel del barbero · comisión automática · panel del dueño (equipo, clientes, finanzas, gastos).

## Fase 2 · Seguridad y configuración ✅
- ✅ Horarios de atención editables desde el panel (días y franjas)
- ✅ Cambiar el PIN desde el panel
- ✅ Recuperar el PIN con pregunta de seguridad (la elige el dueño)
- ✅ Límite de intentos de PIN (propuesta: 5 intentos, bloqueo de 15 minutos, configurable)
- ✅ Anti-spam en las reservas públicas (15 solicitudes por IP cada 10 min, máximo 3 turnos pendientes por WhatsApp, campo trampa)
- ✅ Alta y baja de barberos desde Ajustes → Equipo (la baja exige que no tenga turnos pendientes; se conservan sus datos y su comisión del mes)

## Fase 3 · Agenda ✅
- ✅ Cargar un turno a mano desde el panel
- ✅ Editar y reprogramar turnos
- ✅ Bloquear horarios o días (vacaciones, trámites), con manejo de los turnos afectados
- ✅ Cierre automático: un turno que sigue pendiente cuando pasa el día queda como **"No se registró"** (se puede registrar después si en realidad se hizo)

## Fase 4 · Clientes y promociones
- ✅ Filtros, promociones (% y 2×1), WhatsApp con plantilla, "Mis turnos", ficha del cliente
- ✅ Editar los datos del cliente (nombre, WhatsApp, cumpleaños, notas). Los barberos pueden dejar notas que ven todos al atender

## Fase 5 · Avisos ✅ (falta la cancelación con menos de 1 hora, pendiente de Fausto)
- ✅ Push al equipo y recordatorio al cliente 1 hora antes. Mismo sistema de avisos que Melly Barber y BarberFlowBR (push cifrado con bandeja de salida): cada barbero recibe solo sus turnos y el dueño los de todos; recordatorio 1 hora antes también para el barbero y el dueño; botón de prueba de avisos
- ✅ Centro de notificaciones dentro de la app (campana con contador, leídas y no leídas, 60 días de historial)
- ✅ Aviso push al cliente cuando se le cancela o se le mueve un turno (falta el aviso por WhatsApp automático y el centro de notificaciones)
- ✅ Resumen del día: botón "Generar resumen del día" en Finanzas que arma una imagen (total, medios de pago, barberos, productos, cancelados y turnos de mañana) para compartir o guardar. Sin envío automático ni horario
- ✅ Cancelación sobre la hora: configurable en Ajustes → Cancelaciones (no hacer nada, solo avisar, o avisar y registrar un cobro). Por defecto avisa con menos de 1 hora; Fausto tiene que elegir si cobra y cuánto

## Fase 6 · Servicios ✅
- ✅ Descripción por servicio y sistema de fotos listo (subida desde el panel, achicada en el celular y guardada en la base). Todavía sin fotos cargadas: se piden cuando Fausto apruebe el sistema
- ✅ Servicios adicionales que se suman a otro (Tratamiento facial, cargado con precio de prueba). Se pueden limitar a ciertos servicios y marcar solo en el local
- ✅ Marcar un servicio como "no reservable online" (el equipo lo sigue pudiendo cargar a mano)

## Fase 7 · Tienda de productos ✅
- ✅ Productos en la reserva: sección "Productos" antes de confirmar, con nombre, descripción, precio y selector de cantidad (la foto aparece cuando se cargue)
- ✅ El total del turno suma los productos, y se ve en la confirmación y en "Mis turnos" (ej.: "Corte de cabello" + "1 × Cera mate")
- ✅ El barbero ve en Mi día y en la agenda qué producto entregar
- ✅ Panel del dueño: crear, editar y borrar productos (nombre, descripción, precio, activo o no, foto preparada sin cargar)
- ✅ Stock: se reserva al sacar el turno, vuelve si se cancela, el cliente no viene o queda "No se registró", y se confirma al marcarlo como hecho
- ✅ Sumar, restar o fijar el stock a gusto
- ✅ Con stock en 0 el producto sigue visible con la etiqueta "Sin stock" y no se puede agregar
- ✅ Aviso de pocas unidades en el centro de notificaciones (el límite se configura en cada producto)
- ✅ Ventas de productos separadas en finanzas
- ✅ Comisión por productos: porcentaje configurable en cada producto (0 = sin comisión). Fausto todavía tiene que decidir cuánto

## Fase 8 · Finanzas
- ✅ Cierre de caja, liquidación de comisiones (registro de pagos y saldo)
- ✅ Gastos por categoría, ingresos por medio de pago y gráfico de los últimos 14 días. Los cobros por cancelación tardía se suman a los ingresos

## Fase 9 · Puesta a punto
- ✅ App instalable (manifest + service worker)
- ✅ Datos reales: precios, duraciones y horarios cargados
- ❓ Pendiente: teléfono del local, nombres y precios de los productos, y si el Corte de cabello solo sigue como servicio
- ❓ Logo, teléfono del local, fotos de servicios y de productos: ahora se cargan desde el panel; se piden cuando Fausto apruebe el sistema
- 🛠 Cambiar los PIN de ejemplo (ver DEPLOY.md, paso 5)
- 🛠 Dominio, Cloudflare (D1, VAPID) y GitHub (ver DEPLOY.md)
- ⬜ Prueba real en el local con los 5 barberos y ajustes (todo se probó contra una base simulada, no en Cloudflare ni en celulares)

---

## Orden de trabajo propuesto
1. Fase 2 (seguridad y configuración), porque es lo que hoy impide usarlo en serio.
2. Fase 3 (agenda) y Fase 5 (avisos), que dependen de poder editar y mover turnos.
3. Fase 6 (servicios) y Fase 4 (clientes).
4. Fase 7 (tienda y stock), una vez que servicios y reserva están estables.
5. Fase 9 con los datos reales de Fausto.

## Configurable desde el panel (agregado al final)
- ✅ Cada cuánto se ofrecen turnos (5, 10, 15, 20, 30 o 60 minutos)
- ✅ Comisión propia por barbero (vacío = la general)
- ✅ Logo de la barbería (se ve en la reserva y en el panel)
- ✅ Cancelaciones sobre la hora, con deuda del cliente y registro del cobro
- ✅ Categoría en cada gasto
- ✅ Al cancelar un turno desde el panel se ofrece avisar por WhatsApp con un toque

## Fuera de alcance (y por qué)
- Avisos por WhatsApp automáticos: requieren la API de WhatsApp Business (cuenta verificada, plantillas aprobadas y costo por mensaje). Hoy los avisos son push, y el panel arma el mensaje de WhatsApp para mandarlo con un toque.
- Colores e ícono de la app instalada: se cambian en el código (ver DEPLOY.md).
- Medios de pago distintos de efectivo y transferencia.
