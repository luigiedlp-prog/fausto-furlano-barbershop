// Barbería Pergamino · Cloudflare Worker + D1 (solo D1: sin KV ni R2)
const TZ = 'America/Argentina/Buenos_Aires';
const J = (s, d, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...h } });
const err = (s, m) => Object.assign(new Error(m), { status: s });
const uid = p => p + '_' + crypto.randomUUID().slice(0, 8);
const hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const tm = t => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const now = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
};
const rng = d => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() - (x.getUTCDay() + 6) % 7); return { w: x.toISOString().slice(0, 10), m: d.slice(0, 8) + '01' }; };
async function hash(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bp|' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }

const SCHEMA = [
`CREATE TABLE IF NOT EXISTS bp_fees (id TEXT PRIMARY KEY,client_id TEXT NOT NULL,appt_id TEXT,amount INTEGER NOT NULL,date TEXT NOT NULL,paid INTEGER NOT NULL DEFAULT 0,paid_date TEXT)`,
`CREATE TABLE IF NOT EXISTS bp_products (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT,price INTEGER NOT NULL,stock INTEGER NOT NULL DEFAULT 0,track INTEGER NOT NULL DEFAULT 1,low INTEGER NOT NULL DEFAULT 3,comm_pct INTEGER NOT NULL DEFAULT 0,photo TEXT,active INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS bp_items (id TEXT PRIMARY KEY,appt_id TEXT NOT NULL,product_id TEXT NOT NULL,name TEXT NOT NULL,qty INTEGER NOT NULL,price INTEGER NOT NULL,comm_pct INTEGER NOT NULL DEFAULT 0,held INTEGER NOT NULL DEFAULT 0)`,
`CREATE INDEX IF NOT EXISTS bp_items_a ON bp_items(appt_id)`,
`CREATE TABLE IF NOT EXISTS bp_images (id TEXT PRIMARY KEY,mime TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS bp_notif (id TEXT PRIMARY KEY,staff_id TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'turno',body TEXT NOT NULL,seen INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,pushed INTEGER NOT NULL DEFAULT 0,title TEXT)`,
`CREATE INDEX IF NOT EXISTS bp_notif_s ON bp_notif(staff_id,seen)`,
`CREATE TABLE IF NOT EXISTS bp_blocks (id TEXT PRIMARY KEY,staff_id TEXT,d1 TEXT NOT NULL,d2 TEXT NOT NULL,t1 TEXT,t2 TEXT,note TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS bp_limits (k TEXT PRIMARY KEY,n INTEGER NOT NULL DEFAULT 0,t INTEGER NOT NULL)`,
`CREATE TABLE IF NOT EXISTS bp_settings (k TEXT PRIMARY KEY,v TEXT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS bp_staff (id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,pin_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1)`,
`CREATE TABLE IF NOT EXISTS bp_services (id TEXT PRIMARY KEY,name TEXT NOT NULL,price INTEGER NOT NULL,duration INTEGER NOT NULL)`,
`CREATE TABLE IF NOT EXISTS bp_clients (id TEXT PRIMARY KEY,name TEXT NOT NULL,whatsapp TEXT UNIQUE NOT NULL,birthday TEXT,visits INTEGER NOT NULL DEFAULT 0,no_shows INTEGER NOT NULL DEFAULT 0,total_spent INTEGER NOT NULL DEFAULT 0,last_visit TEXT)`,
`CREATE TABLE IF NOT EXISTS bp_appts (id TEXT PRIMARY KEY,client_id TEXT NOT NULL,staff_id TEXT NOT NULL,service_id TEXT NOT NULL,service_name TEXT NOT NULL,price INTEGER NOT NULL,duration INTEGER NOT NULL,date TEXT NOT NULL,time TEXT NOT NULL DEFAULT '',kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',pay TEXT,amount INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS bp_expenses (id TEXT PRIMARY KEY,date TEXT NOT NULL,concept TEXT NOT NULL,amount INTEGER NOT NULL)`,
`CREATE TABLE IF NOT EXISTS bp_payouts (id TEXT PRIMARY KEY,staff_id TEXT NOT NULL,date TEXT NOT NULL,amount INTEGER NOT NULL)`,
`CREATE TABLE IF NOT EXISTS bp_promos (id TEXT PRIMARY KEY,title TEXT NOT NULL,pct INTEGER NOT NULL,service_id TEXT,start TEXT NOT NULL,end TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,kind TEXT NOT NULL DEFAULT 'pct')`,
`CREATE TABLE IF NOT EXISTS bp_subs (id TEXT PRIMARY KEY,role TEXT NOT NULL,ref TEXT NOT NULL,endpoint TEXT NOT NULL,p256dh TEXT NOT NULL,auth TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(endpoint,role,ref))`,
`CREATE INDEX IF NOT EXISTS bp_subs_r ON bp_subs(role,ref)`,
`CREATE TABLE IF NOT EXISTS bp_sessions (token TEXT PRIMARY KEY,staff_id TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
];

let ready = false;
async function init(db) {
  if (ready) return;
  await db.batch(SCHEMA.map(s => db.prepare(s)));
  await db.prepare('ALTER TABLE bp_appts ADD COLUMN reminded INTEGER NOT NULL DEFAULT 0').run().catch(() => {});
  // Avisos push: los avisos que ya existían se marcan como enviados para no mandar de golpe el historial viejo.
  if (await db.prepare('ALTER TABLE bp_notif ADD COLUMN pushed INTEGER NOT NULL DEFAULT 0').run().then(() => true, () => false)) await db.prepare('UPDATE bp_notif SET pushed=1').run();
  await db.prepare('ALTER TABLE bp_notif ADD COLUMN title TEXT').run().catch(() => {});
  await db.prepare('DROP TABLE IF EXISTS bp_push').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_promos ADD COLUMN message TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_clients ADD COLUMN notes TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_services ADD COLUMN description TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_services ADD COLUMN photo TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_services ADD COLUMN online INTEGER NOT NULL DEFAULT 1').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_services ADD COLUMN addon INTEGER NOT NULL DEFAULT 0').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_services ADD COLUMN addon_to TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_appts ADD COLUMN extras TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_appts ADD COLUMN prod_total INTEGER NOT NULL DEFAULT 0').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_appts ADD COLUMN prod_comm INTEGER NOT NULL DEFAULT 0').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_expenses ADD COLUMN category TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE bp_staff ADD COLUMN comm INTEGER').run().catch(() => {});
  await db.prepare("ALTER TABLE bp_promos ADD COLUMN kind TEXT NOT NULL DEFAULT 'pct'").run().catch(() => {});
  const n = await db.prepare('SELECT COUNT(*) n FROM bp_staff').first();
  if (!n.n) { // Datos de ejemplo: se cambian desde la app cuando lleguen los reales
    const q = [];
    for (const [id, name, role, pin] of [['t_owner', 'Fausto', 'owner', '1234'], ['t_b1', 'Eric', 'barber', '1111'], ['t_b2', 'Santino', 'barber', '2222'], ['t_b3', 'Santino E.', 'barber', '3333'], ['t_b4', 'Ale', 'barber', '4444']])
      q.push(db.prepare('INSERT INTO bp_staff(id,name,role,pin_hash) VALUES(?,?,?,?)').bind(id, name, role, await hash(pin)));
    for (const [id, name, price, dur] of [['s1', 'Barba', 15000, 15], ['s2', 'Corte de cabello + barba', 17000, 20], ['s3', 'Corte de cabello + barba + lavado', 22000, 30], ['s4', 'Corte de cabello + barba + afeitado tradicional + lavado', 28000, 40]])
      q.push(db.prepare('INSERT INTO bp_services(id,name,price,duration) VALUES(?,?,?,?)').bind(id, name, price, dur));
    q.push(db.prepare("INSERT INTO bp_services(id,name,price,duration,addon) VALUES('s5','Tratamiento facial',18000,20,1)"));
    const day = [['08:00', '21:00']];
    q.push(db.prepare('INSERT INTO bp_settings(k,v) VALUES(?,?),(?,?),(?,?),(?,?),(?,?),(?,?)').bind('name', 'Fausto Furlano Buti Barber Shop', 'commission', '50', 'schedule', JSON.stringify({ 1: day, 2: day, 3: day, 4: day, 5: day, 6: day }), 'address', 'Av. de Mayo 545, Pergamino', 'instagram', 'fausto_furlano', 'book_days', '3'));
    await db.batch(q);
  }
  ready = true;
}

const cfg = async db => Object.fromEntries((await db.prepare('SELECT k,v FROM bp_settings').all()).results.map(r => [r.k, r.v]));
const who = async (req, db) => { const t = (req.headers.get('cookie') || '').match(/bp_s=([\w-]+)/)?.[1]; return t ? db.prepare('SELECT s.id,s.name,s.role FROM bp_sessions x JOIN bp_staff s ON s.id=x.staff_id WHERE x.token=? AND s.active=1').bind(t).first() : null; };

const MIN = 60000, DN = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ipOf = req => req.headers.get('cf-connecting-ip') || 'x';
const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const WEAK = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '1212'];
const pinRule = p => { if (!/^\d{4}$/.test(p)) throw err(400, 'El PIN tiene que ser de 4 números'); if (WEAK.includes(p)) throw err(400, 'Elegí un PIN menos obvio'); };
const weakPin = async (db, id) => { const s = await db.prepare('SELECT pin_hash FROM bp_staff WHERE id=?').bind(id).first(); for (const p of ['1234', '1111', '2222', '3333', '4444']) if (s && s.pin_hash === await hash(p)) return true; return false; };
// Límite de intentos: lockCheck corta si ya se llegó al máximo dentro de la ventana; lockHit suma un intento; lockClear lo borra.
async function lockCheck(db, k, max, win) { const r = await db.prepare('SELECT n,t FROM bp_limits WHERE k=?').bind(k).first(), left = r ? r.t + win - Date.now() : 0; if (r && left > 0 && r.n >= max) throw err(429, `Demasiados intentos. Probá de nuevo en ${Math.ceil(left / MIN)} min.`); }
async function lockHit(db, k, win) { const r = await db.prepare('SELECT n,t FROM bp_limits WHERE k=?').bind(k).first(); if (!r || Date.now() - r.t >= win) await db.prepare('INSERT OR REPLACE INTO bp_limits(k,n,t) VALUES(?,1,?)').bind(k, Date.now()).run(); else await db.prepare('UPDATE bp_limits SET n=n+1 WHERE k=?').bind(k).run(); }
const lockClear = (db, k) => db.prepare('DELETE FROM bp_limits WHERE k=?').bind(k).run();
async function spamCheck(req, db, B, kind) {
  if (B.website) throw err(400, 'Solicitud inválida'); // campo trampa: las personas no lo ven
  const k = 'book|' + await hash(ipOf(req));
  await lockCheck(db, k, 15, 10 * MIN); await lockHit(db, k, 10 * MIN);
  const w = String(B.whatsapp || '').replace(/\D/g, '').slice(-10);
  if (kind === 'turno' && w.length >= 8) {
    const c = (await db.prepare("SELECT COUNT(*) n FROM bp_appts a JOIN bp_clients c ON c.id=a.client_id WHERE substr(c.whatsapp,-10)=? AND a.kind='turno' AND a.status='pending' AND a.date>=?").bind(w, now().date).first()).n;
    if (c >= 3) throw err(429, 'Ya tenés 3 turnos reservados. Cancelá uno para sacar otro.');
  }
}
async function dateOk(db, d) {
  const n = now(), days = +(await cfg(db)).book_days || 3, max = new Date(n.date + 'T12:00:00Z'); max.setUTCDate(max.getUTCDate() + days - 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '') || d < n.date || d > max.toISOString().slice(0, 10)) throw err(400, 'Fecha inválida');
}

const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const isTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');
const addD = (d, k) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
const fd = d => d.slice(8) + '/' + d.slice(5, 7);
// Los turnos que quedaron pendientes de días anteriores pasan a "No se registró" (no cuentan como cobro ni como falta del cliente).
const closeOld = async db => { await db.prepare("UPDATE bp_appts SET status='unrecorded' WHERE status='pending' AND date<?").bind(now().date).run(); await releaseDead(db); };
const blocksFor = async (db, date, staff) => (await db.prepare('SELECT * FROM bp_blocks WHERE d1<=? AND d2>=? AND (staff_id IS NULL OR staff_id=?)').bind(date, date, staff).all()).results;
const hits = (b, m, dur) => !b.t1 || (m < tm(b.t2) && tm(b.t1) < m + dur);
async function conflicts(db, staff, date, time, dur, exclude) {
  const m = tm(time), sch = JSON.parse((await cfg(db)).schedule), dow = new Date(date + 'T12:00:00Z').getUTCDay();
  const busy = (await db.prepare("SELECT time,duration FROM bp_appts WHERE staff_id=? AND date=? AND kind='turno' AND status IN('pending','done') AND id!=?").bind(staff, date, exclude || '').all()).results;
  return { overlap: busy.some(x => m < tm(x.time) + x.duration && tm(x.time) < m + dur), blocked: (await blocksFor(db, date, staff)).some(b => hits(b, m, dur)), outside: !(sch[dow] || []).some(([a, b]) => m >= tm(a) && m + dur <= tm(b)) };
}
// Choque con otro turno: siempre error. Bloqueo u horario fuera de atención: error "blando" que el panel puede confirmar con force.
function slotRules(c, force) {
  if (c.overlap) throw err(409, 'Ese barbero ya tiene un turno en ese horario');
  if (!force && c.blocked) throw Object.assign(err(409, 'Ese horario está bloqueado.'), { soft: true });
  if (!force && c.outside) throw Object.assign(err(409, 'Ese horario está fuera del horario de atención.'), { soft: true });
}
const notifyClient = async (env, db, wa, title, body) => { const w = String(wa || '').replace(/\D/g, '').slice(-10); if (w.length < 8) return; return pushToRef(env, db, 'client', w, { title, body, url: '/reservar/mis-turnos.html', tag: 'c' + Date.now() }); };

const money = n => '$' + new Intl.NumberFormat('es-AR').format(Math.round(n || 0));
async function summaryData(db, date) {
  const one = (sql, ...a) => db.prepare(sql).bind(...a).first();
  const d = await one("SELECT COUNT(*) n,COALESCE(SUM(amount+prod_total),0) t,COALESCE(SUM(CASE WHEN pay='efectivo' THEN amount+prod_total ELSE 0 END),0) ef,COALESCE(SUM(CASE WHEN pay='transferencia' THEN amount+prod_total ELSE 0 END),0) tr FROM bp_appts WHERE status='done' AND date=?", date);
  const cnt = async st => (await one('SELECT COUNT(*) n FROM bp_appts WHERE status=? AND date=?', st, date)).n;
  const open = (await one("SELECT COUNT(*) n FROM bp_appts WHERE status='pending' AND date=?", date)).n, tom = (await one("SELECT COUNT(*) n FROM bp_appts WHERE status='pending' AND kind='turno' AND date=?", addD(date, 1))).n;
  const by = (await db.prepare("SELECT s.name,COUNT(*) n,SUM(a.amount+a.prod_total) t FROM bp_appts a JOIN bp_staff s ON s.id=a.staff_id WHERE a.status='done' AND a.date=? GROUP BY s.id ORDER BY t DESC").bind(date).all()).results;
  const pu = await one("SELECT COALESCE(SUM(i.qty),0) u,COALESCE(SUM(i.qty*i.price),0) t FROM bp_items i JOIN bp_appts a ON a.id=i.appt_id WHERE a.status='done' AND a.date=?", date);
  return { date, n: d.n, total: d.t, ef: d.ef, tr: d.tr, by, products: { u: pu.u, t: pu.t }, cancelled: await cnt('cancelled'), noShow: await cnt('no_show'), open, tomorrow: tom };
}
function summaryText(s) {
  const L = [`Resumen del ${fd(s.date)}`, s.n ? `${s.n} servicio${s.n === 1 ? '' : 's'} · ${money(s.total)}` : 'Hoy no se registraron servicios'];
  if (s.n) L.push(`Efectivo ${money(s.ef)} · Transferencia ${money(s.tr)}`);
  if (s.by.length) L.push(s.by.map(x => `${x.name} ${x.n} (${money(x.t)})`).join(' · '));
  if (s.products.u) L.push(`Productos: ${s.products.u} unidad${s.products.u === 1 ? '' : 'es'} · ${money(s.products.t)}`);
  L.push(`Cancelados ${s.cancelled} · No asistió ${s.noShow} · Sin cerrar ${s.open}`);
  L.push(`Mañana: ${s.tomorrow} turno${s.tomorrow === 1 ? '' : 's'}`);
  return L.join('\n');
}

// Adicionales (ej. Tratamiento facial): se suman al servicio elegido, con su precio y su duración. Online solo los marcados como reservables.
async function withExtras(db, s, ids, mainId, staff) {
  ids = [...new Set(Array.isArray(ids) ? ids.filter(x => typeof x === 'string' && /^\w+$/.test(x)) : [])].slice(0, 5);
  if (!ids.length) return { ...s, extras: [] };
  const rows = (await db.prepare(`SELECT * FROM bp_services WHERE addon=1 ${staff ? '' : 'AND online=1'} AND id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results;
  if (rows.length !== ids.length) throw err(400, 'Adicional inválido');
  for (const r of rows) if (r.addon_to && !r.addon_to.split(',').includes(mainId)) throw err(400, `${r.name} no se puede sumar a ese servicio`);
  return { ...s, name: s.name + ' + ' + rows.map(r => r.name).join(' + '), price: s.price + rows.reduce((t, r) => t + r.price, 0), duration: s.duration + rows.reduce((t, r) => t + r.duration, 0), extras: rows.map(r => ({ id: r.id, name: r.name, price: r.price, duration: r.duration })) };
}
const exJson = s => s.extras && s.extras.length ? JSON.stringify(s.extras) : null;
async function pubSvc(db, id, guest, extras) { const s0 = await svcOf(db, id); return withExtras(db, two(s0, { guest }), extras, s0.id); }

// ---- Productos y stock: el stock se descuenta al reservar y vuelve si el turno se cancela, el cliente no viene o queda "No se registró".
const DEAD = "('cancelled','no_show','unrecorded')";
const releaseDead = db => db.batch([
  db.prepare(`UPDATE bp_products SET stock=stock+COALESCE((SELECT SUM(i.qty) FROM bp_items i JOIN bp_appts a ON a.id=i.appt_id WHERE i.product_id=bp_products.id AND i.held=1 AND a.status IN ${DEAD}),0) WHERE id IN (SELECT i.product_id FROM bp_items i JOIN bp_appts a ON a.id=i.appt_id WHERE i.held=1 AND a.status IN ${DEAD})`),
  db.prepare(`UPDATE bp_items SET held=0 WHERE held=1 AND appt_id IN (SELECT id FROM bp_appts WHERE status IN ${DEAD})`)]);
async function holdBack(db, apptId) { // un turno "No se registró" que en realidad se hizo: vuelve a descontar
  const its = (await db.prepare('SELECT i.id,i.product_id,i.qty,p.track FROM bp_items i JOIN bp_products p ON p.id=i.product_id WHERE i.appt_id=? AND i.held=0').bind(apptId).all()).results;
  for (const i of its) if (i.track) { await db.prepare('UPDATE bp_products SET stock=MAX(stock-?,0) WHERE id=?').bind(i.qty, i.product_id).run(); await db.prepare('UPDATE bp_items SET held=1 WHERE id=?').bind(i.id).run(); }
}
const prodSum = rows => rows.reduce((t, r) => t + r.qty * r.price, 0);
const itemsText = rows => rows.map(r => `${r.qty} × ${r.name}`).join(', ');
const itemStmts = (db, apptId, rows) => rows.map(r => db.prepare('INSERT INTO bp_items(id,appt_id,product_id,name,qty,price,comm_pct,held) VALUES(?,?,?,?,?,?,?,?)').bind(uid('i'), apptId, r.product_id, r.name, r.qty, r.price, r.comm_pct, r.held));
const giveBack = async (db, rows) => { for (const r of rows) if (r.held) await db.prepare('UPDATE bp_products SET stock=stock+? WHERE id=?').bind(r.qty, r.product_id).run(); };
const lowNotify = (ctx, env, db, low) => { for (const l of low) ctx.waitUntil(notifyStaff(env, db, null, `Quedan ${l.left} de ${l.name}`, 'stock')); };
// Compara lo pedido contra lo que el turno ya tenía: reserva (o devuelve) solo la diferencia, y se deshace todo si algo falla.
async function planItems(db, wanted, old) {
  const list = [], seen = new Set();
  for (const x of Array.isArray(wanted) ? wanted : []) {
    const id = String((x && x.id) || ''), q = Math.round(+(x && x.qty) || 0);
    if (!id || q <= 0 || seen.has(id)) continue;
    if (q > 10) throw err(400, 'Máximo 10 unidades por producto');
    seen.add(id); list.push({ id, q });
  }
  if (list.length > 6) throw err(400, 'Demasiados productos distintos');
  if (!list.length && !old.length) return { rows: [], low: [] };
  const ids = [...new Set([...list.map(x => x.id), ...old.map(o => o.product_id)])];
  const prods = Object.fromEntries((await db.prepare(`SELECT * FROM bp_products WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all()).results.map(p => [p.id, p]));
  const oldBy = Object.fromEntries(old.map(o => [o.product_id, o])), applied = [], give = [], rows = [], low = [];
  try {
    for (const { id, q } of list) {
      const p = prods[id], o = oldBy[id];
      if (!p || (!p.active && !o)) throw err(400, 'Producto inválido');
      const held = o && o.held ? o.qty : 0, need = p.track ? q - held : 0;
      if (need > 0) {
        const r = await db.prepare('UPDATE bp_products SET stock=stock-? WHERE id=? AND stock>=?').bind(need, id, need).run();
        if (!r.meta.changes) throw err(409, p.stock + held > 0 ? `Quedan solo ${p.stock + held} de ${p.name}` : `${p.name}: sin stock`);
        applied.push([id, need]);
        if (p.stock - need <= p.low && p.stock > p.low) low.push({ name: p.name, left: p.stock - need });
      } else if (need < 0) give.push([id, -need]);
      rows.push({ product_id: id, name: o ? o.name : p.name, qty: q, price: o ? o.price : p.price, comm_pct: o ? o.comm_pct : p.comm_pct, held: p.track ? 1 : 0 });
    }
    for (const o of old) if (!seen.has(o.product_id) && o.held) give.push([o.product_id, o.qty]);
    for (const [pid, d] of give) await db.prepare('UPDATE bp_products SET stock=stock+? WHERE id=?').bind(d, pid).run();
  } catch (e) { for (const [pid, d] of applied) await db.prepare('UPDATE bp_products SET stock=stock+? WHERE id=?').bind(d, pid).run(); throw e; }
  return { rows, low };
}
async function attachItems(db, appts) {
  appts.forEach(a => { a.items = []; });
  if (!appts.length) return;
  const by = Object.fromEntries(appts.map(a => [a.id, a]));
  for (const r of (await db.prepare(`SELECT appt_id,product_id,name,qty,price FROM bp_items WHERE appt_id IN (${appts.map(() => '?').join(',')})`).bind(...appts.map(a => a.id)).all()).results) by[r.appt_id].items.push({ product_id: r.product_id, name: r.name, qty: r.qty, price: r.price });
}

async function slots(db, date, svc, staff) {
  const cf0 = await cfg(db), sch = JSON.parse(cf0.schedule), step = [5, 10, 15, 20, 30, 60].includes(+cf0.slot_step) ? +cf0.slot_step : 15, n = now(), dow = new Date(date + 'T12:00:00Z').getUTCDay();
  const busy = (await db.prepare("SELECT time,duration FROM bp_appts WHERE staff_id=? AND date=? AND kind='turno' AND status IN('pending','done')").bind(staff, date).all()).results;
  const out = [], bl = await blocksFor(db, date, staff);
  for (const [a, b] of sch[dow] || []) for (let m = tm(a); m + svc.duration <= tm(b); m += step) {
    if (date === n.date && m <= n.min) continue;
    if (busy.some(x => m < tm(x.time) + x.duration && tm(x.time) < m + svc.duration)) continue;
    if (bl.some(b => hits(b, m, svc.duration))) continue;
    out.push(hm(m));
  }
  return out;
}
async function client(db, name, wa, bd) {
  wa = String(wa || '').replace(/\D/g, ''); name = String(name || '').trim().slice(0, 80);
  if (!name) throw err(400, 'Ingresá tu nombre');
  if (wa.length < 8) throw err(400, 'Ingresá un WhatsApp válido');
  bd = /^\d{4}-\d{2}-\d{2}$/.test(bd || '') ? bd : null;
  const c = await db.prepare('SELECT id FROM bp_clients WHERE whatsapp=?').bind(wa).first();
  if (c) { if (bd) await db.prepare('UPDATE bp_clients SET birthday=? WHERE id=?').bind(bd, c.id).run(); return c.id; }
  const id = uid('c'); await db.prepare('INSERT INTO bp_clients(id,name,whatsapp,birthday) VALUES(?,?,?,?)').bind(id, name, wa, bd).run(); return id;
}
const promosNow = async db => { const n = now(), t = n.date + 'T' + hm(n.min); return (await db.prepare('SELECT * FROM bp_promos WHERE active=1 AND start<=? AND end>?').bind(t, t).all()).results; };
const withPromo = (pr, s) => { const f = pr.filter(x => !x.service_id || x.service_id.split(',').includes(s.id)), m = Math.max(0, ...f.filter(x => x.kind !== '2x1').map(x => x.pct)); return { ...s, ...(m ? { orig: s.price, price: Math.round(s.price * (100 - m) / 100) } : {}), twofor: f.some(x => x.kind === '2x1') }; };
const two = (s, B) => B.guest && s.twofor ? { ...s, name: s.name + ' (2x1 · 2 personas)', duration: s.duration * 2 } : s;
const svcOf = async (db, id, promo = true) => { const s = await db.prepare('SELECT * FROM bp_services WHERE id=?').bind(id).first(); if (!s) throw err(400, 'Servicio inválido'); if (promo && (!s.online || s.addon)) throw err(400, 'Ese servicio no se puede reservar online'); return promo ? withPromo(await promosNow(db), s) : s; };
const staffOk = async (db, id) => { const s = await db.prepare('SELECT id,name FROM bp_staff WHERE id=? AND active=1').bind(id).first(); if (!s) throw err(400, 'Barbero inválido'); return s; };
async function queueInfo(db, staff, svc) {
  const n = now(), ahead = (await db.prepare("SELECT COUNT(*) n FROM bp_appts WHERE staff_id=? AND date=? AND kind='fila' AND status='pending'").bind(staff, n.date).first()).n;
  const est = ahead * svc.duration + svc.duration;
  const t = (await db.prepare("SELECT time FROM bp_appts WHERE staff_id=? AND date=? AND kind='turno' AND status='pending' ORDER BY time").bind(staff, n.date).all()).results.find(x => tm(x.time) >= n.min && tm(x.time) < n.min + est);
  return { ahead, position: ahead + 1, aviso: !!t, turno: t?.time || null };
}
const per = async (db, a, b) => Object.fromEntries((await db.prepare("SELECT staff_id s,COUNT(*) n,COALESCE(SUM(amount),0) sv,COALESCE(SUM(prod_total),0) p,COALESCE(SUM(prod_comm),0) pc FROM bp_appts WHERE status='done' AND date BETWEEN ? AND ? GROUP BY staff_id").bind(a, b).all()).results.map(r => [r.s, r]));
const periods = async db => { const d = now().date, r = rng(d); return Promise.all([per(db, d, d), per(db, r.w, d), per(db, r.m, d)]); };
const pack = (role, pct, rows, id) => Object.fromEntries(['today', 'week', 'month'].map((k, i) => { const x = rows[i][id] || { n: 0, sv: 0, p: 0, pc: 0 }; return [k, { n: x.n, t: x.sv + x.p, p: x.p, c: role === 'owner' ? 0 : Math.round(x.sv * pct / 100) + x.pc }]; }));
async function mine(db, me, id) {
  const a = await db.prepare('SELECT * FROM bp_appts WHERE id=?').bind(id).first();
  if (!a || (me.role !== 'owner' && a.staff_id !== me.id)) throw err(404, 'Turno no encontrado');
  if (!['pending', 'unrecorded'].includes(a.status)) throw err(409, 'Ese turno ya fue cerrado');
  return a;
}

// ═══════════════ Avisos push (Web Push: VAPID + cifrado aes128gcm, RFC 8291/8292) ═══════════════
// Mismo sistema que Melly Barber y BarberFlowBR. Secrets: VAPID_PUBLIC, VAPID_PRIVATE (JWK en una línea) y VAPID_SUBJECT.
// Cada aviso del equipo se guarda en bp_notif con UNA fila por destinatario (el barbero del turno + los dueños) y pushed=0;
// la bandeja de salida (flushPush) lo manda solo a los celulares de ese destinatario, una sola vez.
const PUSH_HOSTS = /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|updates-autopush\.(prod|stage)\.mozaws\.net|web\.push\.apple\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/i;
const pushEnc = s => new TextEncoder().encode(s);
const b64u = {
  enc(buf) { const b = new Uint8Array(buf); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(str) { let s = String(str).replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const bin = atob(s), out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; },
};
const concatBytes = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}
async function pushEncrypt(sub, payloadBytes) {
  const uaPublic = b64u.dec(sub.p256dh), authSecret = b64u.dec(sub.auth);
  const as = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concatBytes(pushEnc('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, pushEnc('Content-Encoding: aes128gcm\0'), 16), nonce = await hkdf(salt, ikm, pushEnc('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concatBytes(payloadBytes, new Uint8Array([2]))));
  return concatBytes(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPublic.length]), asPublic, cipher);
}
const vapidCache = { keyFor: null, key: null, jwt: new Map() };
async function vapidPrivateKey(env) {
  if (vapidCache.key && vapidCache.keyFor === env.VAPID_PRIVATE) return vapidCache.key;
  const raw = String(env.VAPID_PRIVATE).trim(), pub = b64u.dec(env.VAPID_PUBLIC);
  const jwk = raw.startsWith('{') ? JSON.parse(raw) : { kty: 'EC', crv: 'P-256', d: raw, x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  vapidCache.key = key; vapidCache.keyFor = env.VAPID_PRIVATE; vapidCache.jwt.clear();
  return key;
}
async function vapidJWT(env, audience) {
  const t = Math.floor(Date.now() / 1000), hit = vapidCache.jwt.get(audience);
  if (hit && hit.exp - t > 3600) return hit.jwt;
  const exp = t + 12 * 3600, head = b64u.enc(pushEnc(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))), claims = b64u.enc(pushEnc(JSON.stringify({ aud: audience, exp, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com' })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidPrivateKey(env), pushEnc(`${head}.${claims}`)));
  const jwt = `${head}.${claims}.${b64u.enc(sig)}`;
  vapidCache.jwt.set(audience, { jwt, exp });
  return jwt;
}
const pushReady = env => !!(env && env.DB && env.VAPID_PUBLIC && env.VAPID_PRIVATE);
async function sendWebPush(env, sub, payload, ttl = 86400) {
  const body = await pushEncrypt(sub, pushEnc(JSON.stringify(payload)));
  const res = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: `vapid t=${await vapidJWT(env, new URL(sub.endpoint).origin)}, k=${env.VAPID_PUBLIC}`, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'high' }, body });
  return res.status;
}
function cleanSub(s) {
  const endpoint = String(s?.endpoint || ''), p256dh = String(s?.keys?.p256dh || ''), auth = String(s?.keys?.auth || '');
  let u; try { u = new URL(endpoint); } catch { return null; }
  if (u.protocol !== 'https:' || !PUSH_HOSTS.test(u.hostname) || endpoint.length > 700) return null;
  try { if (b64u.dec(p256dh).length !== 65 || b64u.dec(auth).length < 16) return null; } catch { return null; }
  return { endpoint, p256dh, auth };
}
// role 'staff' (ref = id del barbero/dueño) o 'client' (ref = últimos 10 dígitos del WhatsApp).
// Un celular le pertenece a UNA sola persona de equipo a la vez: si otro entra y activa los avisos, se los quita al anterior.
async function saveSub(db, role, ref, sub) {
  const q = [];
  if (role === 'staff') q.push(db.prepare("DELETE FROM bp_subs WHERE endpoint=? AND role='staff' AND ref!=?").bind(sub.endpoint, ref));
  else q.push(db.prepare("DELETE FROM bp_subs WHERE endpoint=? AND role='client' AND ref!=?").bind(sub.endpoint, ref));
  q.push(db.prepare('INSERT INTO bp_subs(id,role,ref,endpoint,p256dh,auth) VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint,role,ref) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth').bind(uid('ps'), role, ref, sub.endpoint, sub.p256dh, sub.auth));
  await db.batch(q);
}
async function pushToRef(env, db, role, ref, payload, ttl = 86400) {
  if (!pushReady(env) || !ref) return 0;
  const subs = (await db.prepare('SELECT id,endpoint,p256dh,auth FROM bp_subs WHERE role=? AND ref=?').bind(role, ref).all()).results || [];
  let ok = 0;
  await Promise.all(subs.map(async s => {
    try {
      const st = await sendWebPush(env, s, payload, ttl);
      if (st >= 200 && st < 300) ok++;
      else if (st === 404 || st === 410) await db.prepare('DELETE FROM bp_subs WHERE id=?').bind(s.id).run();
      else console.error('PUSH_STATUS', st, new URL(s.endpoint).hostname);
    } catch (e) { console.error('PUSH_SEND_ERROR', String(e?.message || e)); }
  }));
  return ok;
}
const PUSH_TITLE = { turno: 'Turno nuevo', cancel: 'Turno cancelado', stock: 'Poco stock', resumen: 'Resumen del día' };
// Bandeja de salida (pushed: 0 pendiente · 2 enviándose · 1 listo). El reclamo es atómico: dos ejecuciones a la vez no duplican el aviso.
async function flushPush(env) {
  if (!pushReady(env)) return 0;
  const db = env.DB; let sent = 0;
  await db.batch([
    db.prepare("UPDATE bp_notif SET pushed=1 WHERE pushed=0 AND created_at<datetime('now','-2 hours')"),
    db.prepare("UPDATE bp_notif SET pushed=0 WHERE pushed=2 AND created_at<datetime('now','-5 minutes') AND created_at>=datetime('now','-2 hours')"),
  ]);
  const list = (await db.prepare('SELECT id,staff_id,kind,body,title FROM bp_notif WHERE pushed=0 ORDER BY created_at LIMIT 20').all()).results || [];
  for (const n of list) {
    const claim = await db.prepare('UPDATE bp_notif SET pushed=2 WHERE id=? AND pushed=0').bind(n.id).run();
    if (Number(claim?.meta?.changes || 0) !== 1) continue;
    try {
      const body = n.kind === 'resumen' ? n.body.replace(/\n/g, ' · ').slice(0, 140) : n.body;
      sent += await pushToRef(env, db, 'staff', n.staff_id, { title: n.title || PUSH_TITLE[n.kind] || 'Barbería', body, url: '/gestion/', tag: n.id }, n.kind === 'reminder' ? 1800 : 86400);
    } catch (e) { console.error('PUSH_STAFF_ERROR', String(e?.message || e)); }
    await db.prepare('UPDATE bp_notif SET pushed=1 WHERE id=?').bind(n.id).run();
  }
  return sent;
}
// Un aviso del equipo = una fila por destinatario: el barbero indicado (si hay) y todos los dueños. Ningún barbero recibe lo de otro.
const notifyStaff = async (env, db, staffId, body, kind = 'turno') => {
  const owners = (await db.prepare("SELECT id FROM bp_staff WHERE role='owner' AND active=1").all()).results.map(x => x.id);
  await db.batch([...new Set([staffId, ...owners].filter(Boolean))].map(id => db.prepare('INSERT INTO bp_notif(id,staff_id,kind,body) VALUES(?,?,?,?)').bind(uid('n'), id, kind, body)));
  return flushPush(env);
};

async function route(req, db, u, p, env, ctx) {
  const B = req.method === 'POST' ? await req.json().catch(() => ({})) : {}, n = now();
  if (p === '/api/public') {
    const prods = (await db.prepare('SELECT id,name,description,price,stock,track,photo FROM bp_products WHERE active=1 ORDER BY name').all()).results.map(p => ({ id: p.id, name: p.name, description: p.description || '', price: p.price, photo: p.photo, left: p.track ? Math.max(0, p.stock) : null, soldout: !!p.track && p.stock <= 0 }));
    const [st, sv, ss, pr] = await Promise.all([cfg(db), db.prepare('SELECT * FROM bp_services ORDER BY price').all(), db.prepare('SELECT id,name,role FROM bp_staff WHERE active=1 ORDER BY role DESC,name').all(), promosNow(db)]);
    return J(200, { name: st.name, address: st.address || '', phone: st.phone || '', instagram: st.instagram || '', logo: st.logo || null, late: { mode: ['off', 'fee'].includes(st.late_mode) ? st.late_mode : 'warn', hours: +st.late_hours || 1, pct: +st.late_pct || 50 }, days: +st.book_days || 3, promos: pr, services: sv.results.filter(s => s.online && !s.addon).map(s => withPromo(pr, s)), addons: sv.results.filter(s => s.online && s.addon), products: prods, staff: ss.results, today: n.date });
  }
  if (p.startsWith('/api/img/')) {
    const r = await db.prepare('SELECT mime,data FROM bp_images WHERE id=?').bind(p.slice(9)).first();
    if (!r) return new Response('No encontrada', { status: 404 });
    return new Response(Uint8Array.from(atob(r.data), c => c.charCodeAt(0)), { headers: { 'content-type': r.mime, 'cache-control': 'public, max-age=31536000, immutable' } });
  }
  if (p === '/api/availability') {
    const d = u.searchParams.get('date') || ''; await dateOk(db, d);
    return J(200, { times: await slots(db, d, await pubSvc(db, u.searchParams.get('service'), u.searchParams.get('guest') === '1', (u.searchParams.get('extras') || '').split(',').filter(Boolean)), u.searchParams.get('staff')) });
  }
  if (p === '/api/queue-info') return J(200, await queueInfo(db, u.searchParams.get('staff'), await pubSvc(db, u.searchParams.get('service'), u.searchParams.get('guest') === '1', (u.searchParams.get('extras') || '').split(',').filter(Boolean))));
  if (p === '/api/book' && req.method === 'POST') {
    await spamCheck(req, db, B, 'turno'); await dateOk(db, B.date);
    const s = await pubSvc(db, B.service, !!B.guest, B.extras), st = await staffOk(db, B.staff);
    if (!(await slots(db, B.date, s, st.id)).includes(B.time)) throw err(409, 'Ese horario ya no está disponible');
    const cid = await client(db, B.name, B.whatsapp, B.birthday), id = uid('a');
    const pl = await planItems(db, B.products, []);
    try { await db.batch([db.prepare("INSERT INTO bp_appts(id,client_id,staff_id,service_id,service_name,price,duration,date,time,kind,extras) VALUES(?,?,?,?,?,?,?,?,?,'turno',?)").bind(id, cid, st.id, s.id, s.name, s.price, s.duration, B.date, B.time, exJson(s)), ...itemStmts(db, id, pl.rows)]); } catch (e) { await giveBack(db, pl.rows); throw e; }
    ctx.waitUntil(notifyStaff(env, db, st.id, `Turno nuevo: ${String(B.name || '').slice(0, 30)} · ${B.date.slice(8)}/${B.date.slice(5, 7)} ${B.time}${pl.rows.length ? ' · Productos: ' + itemsText(pl.rows) : ''}`));
    lowNotify(ctx, env, db, pl.low);
    return J(200, { ok: true, service: s.name, staff: st.name, date: B.date, time: B.time, price: s.price, products: pl.rows.map(r => ({ name: r.name, qty: r.qty, price: r.price })), total: s.price + prodSum(pl.rows) });
  }
  if (p === '/api/queue' && req.method === 'POST') {
    await spamCheck(req, db, B, 'fila');
    const s = await pubSvc(db, B.service, !!B.guest, B.extras), st = await staffOk(db, B.staff), cid = await client(db, B.name, B.whatsapp, B.birthday), info = await queueInfo(db, st.id, s);
    const qid = uid('a'), pl = await planItems(db, B.products, []);
    try { await db.batch([db.prepare("INSERT INTO bp_appts(id,client_id,staff_id,service_id,service_name,price,duration,date,kind,extras) VALUES(?,?,?,?,?,?,?,?,'fila',?)").bind(qid, cid, st.id, s.id, s.name, s.price, s.duration, n.date, exJson(s)), ...itemStmts(db, qid, pl.rows)]); } catch (e) { await giveBack(db, pl.rows); throw e; }
    ctx.waitUntil(notifyStaff(env, db, st.id, `Nuevo en la fila: ${String(B.name || '').slice(0, 30)}${pl.rows.length ? ' · Productos: ' + itemsText(pl.rows) : ''}`));
    lowNotify(ctx, env, db, pl.low);
    return J(200, { ok: true, service: s.name, staff: st.name, position: info.position, products: pl.rows.map(r => ({ name: r.name, qty: r.qty, price: r.price })), total: s.price + prodSum(pl.rows) });
  }
  if (p === '/api/login' && req.method === 'POST') {
    const cf = await cfg(db), mx = +cf.pin_max || 5, win = (+cf.pin_lock || 15) * MIN, kS = 'login|' + String(B.staff || '').slice(0, 40), kI = 'loginip|' + await hash(ipOf(req));
    await lockCheck(db, kS, mx, win); await lockCheck(db, kI, mx * 4, win);
    const s = await db.prepare('SELECT id,pin_hash FROM bp_staff WHERE id=? AND active=1').bind(B.staff).first();
    if (!s || s.pin_hash !== await hash(String(B.pin || ''))) { await lockHit(db, kS, win); await lockHit(db, kI, win); throw err(401, 'PIN incorrecto'); }
    await lockClear(db, kS);
    const t = crypto.randomUUID();
    await db.prepare('INSERT INTO bp_sessions(token,staff_id) VALUES(?,?)').bind(t, s.id).run();
    return J(200, { ok: true }, { 'set-cookie': `bp_s=${t}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000` });
  }
  if (p === '/api/recover-info') return J(200, { question: (await cfg(db)).sec_q || null });
  if (p === '/api/recover' && req.method === 'POST') {
    const cf = await cfg(db), k = 'recover', np = String(B.pin || '');
    if (!cf.sec_a) throw err(400, 'Todavía no hay una pregunta de seguridad configurada.');
    await lockCheck(db, k, 5, 60 * MIN); pinRule(np);
    if (await hash('ans|' + norm(B.answer)) !== cf.sec_a) { await lockHit(db, k, 60 * MIN); throw err(401, 'La respuesta no coincide'); }
    const o = await db.prepare("SELECT id FROM bp_staff WHERE role='owner' AND active=1").first();
    await db.batch([db.prepare('UPDATE bp_staff SET pin_hash=? WHERE id=?').bind(await hash(np), o.id), db.prepare('DELETE FROM bp_sessions WHERE staff_id=?').bind(o.id)]);
    await lockClear(db, k); await lockClear(db, 'login|' + o.id);
    return J(200, { ok: true });
  }
  if (p === '/api/logout') return J(200, { ok: true }, { 'set-cookie': 'bp_s=; Path=/; Max-Age=0' });

  if (p === '/api/push-key') return J(200, { key: pushReady(env) ? env.VAPID_PUBLIC : null });
  if (p === '/api/push-sub' && req.method === 'POST') {
    if (!pushReady(env)) throw err(503, 'Los avisos todavía no están configurados.');
    const sub = cleanSub(B.sub), m = await who(req, db), w = String(B.wa || '').replace(/\D/g, '').slice(-10);
    if (!sub || (!m && w.length < 8)) throw err(400, 'Suscripción inválida');
    await saveSub(db, m ? 'staff' : 'client', m ? m.id : w, sub);
    return J(200, { ok: true });
  }
  if (p === '/api/push-unsub' && req.method === 'POST') {
    const m = await who(req, db), e = String(B.endpoint || '');
    if (m) await db.prepare("DELETE FROM bp_subs WHERE endpoint=? AND role='staff' AND ref=?").bind(e, m.id).run();
    else await db.prepare("DELETE FROM bp_subs WHERE endpoint=? AND role='client'").bind(e).run();
    return J(200, { ok: true });
  }
  if (p === '/api/push-test' && req.method === 'POST') {
    const m = await who(req, db); if (!m) throw err(401, 'Tenés que iniciar sesión.');
    if (!pushReady(env)) throw err(503, 'Los avisos todavía no están configurados.');
    return J(200, { ok: true, sent: await pushToRef(env, db, 'staff', m.id, { title: 'Prueba de avisos', body: 'Si ves este aviso, las notificaciones funcionan ✅', url: '/gestion/', tag: 'test-' + Date.now() }, 300) });
  }
  if (p === '/api/my-turns') {
    const w = (u.searchParams.get('wa') || '').replace(/\D/g, '').slice(-10);
    if (w.length < 8) throw err(400, 'WhatsApp inválido');
    const r = (await db.prepare("SELECT a.id,a.date,a.time,a.service_name,a.price,s.name staff FROM bp_appts a JOIN bp_clients c ON c.id=a.client_id JOIN bp_staff s ON s.id=a.staff_id WHERE substr(c.whatsapp,-10)=? AND a.kind='turno' AND a.status='pending' AND a.date>=? ORDER BY a.date,a.time").bind(w, n.date).all()).results;
    await attachItems(db, r); r.forEach(t => { t.total = t.price + prodSum(t.items); });
    return J(200, { turns: r });
  }
  if (p === '/api/my-cancel' && req.method === 'POST') {
    const w = String(B.wa || '').replace(/\D/g, '').slice(-10);
    const a = await db.prepare("SELECT a.id,a.staff_id,a.client_id,a.price,a.date,a.time FROM bp_appts a JOIN bp_clients c ON c.id=a.client_id WHERE a.id=? AND substr(c.whatsapp,-10)=? AND a.kind='turno' AND a.status='pending'").bind(B.id, w).first();
    if (!a) throw err(404, 'Turno no encontrado');
    const cf = await cfg(db), mode = ['off', 'fee'].includes(cf.late_mode) ? cf.late_mode : 'warn', hrs = +cf.late_hours || 1, pct = +cf.late_pct || 50;
    const mins = (Date.parse(a.date + 'T00:00:00Z') - Date.parse(n.date + 'T00:00:00Z')) / 60000 + tm(a.time) - n.min, late = mode !== 'off' && mins < hrs * 60, fee = late && mode === 'fee' ? Math.round(a.price * pct / 100) : 0;
    if (late && !B.confirm) throw Object.assign(err(409, `${hrs === 1 ? 'Falta menos de 1 hora' : `Faltan menos de ${hrs} horas`} para tu turno. ` + (fee ? `Si lo cancelás ahora se registra una cancelación tardía de ${money(fee)} (${pct}% del servicio), que se cobra en tu próxima visita.` : 'Avisanos con más tiempo la próxima vez.')), { late: true, fee });
    await db.prepare("UPDATE bp_appts SET status='cancelled' WHERE id=?").bind(a.id).run(); await releaseDead(db);
    if (fee) await db.prepare('INSERT INTO bp_fees(id,client_id,appt_id,amount,date) VALUES(?,?,?,?,?)').bind(uid('f'), a.client_id, a.id, fee, n.date).run();
    ctx.waitUntil(notifyStaff(env, db, a.staff_id, `Turno cancelado${late ? ' a último momento' : ''}: ${a.date.slice(8)}/${a.date.slice(5, 7)} ${a.time}${fee ? ' · Cobrar ' + money(fee) : ''}`, 'cancel'));
    return J(200, { ok: true, late, fee });
  }
  const me = await who(req, db); if (!me) throw err(401, 'Sesión vencida');
  const st = await cfg(db);
  if (p === '/api/me') {
    await closeOld(db);
    const un = await db.prepare("SELECT COUNT(*) n,MAX(date) d FROM bp_appts WHERE status='unrecorded' AND date>=?" + (me.role === 'owner' ? '' : ' AND staff_id=?')).bind(...(me.role === 'owner' ? [addD(n.date, -14)] : [addD(n.date, -14), me.id])).first();
    const day = (await db.prepare("SELECT a.id,a.kind,a.time,a.service_id,a.service_name,a.price,a.status,a.created_at,a.extras,c.id client_id,c.notes,(SELECT COALESCE(SUM(f.amount),0) FROM bp_fees f WHERE f.client_id=c.id AND f.paid=0) debt,c.name cname,c.whatsapp,c.birthday,c.last_visit,c.visits,(SELECT p.service_name FROM bp_appts p WHERE p.client_id=a.client_id AND p.status='done' ORDER BY p.date DESC,p.rowid DESC LIMIT 1) last_service FROM bp_appts a JOIN bp_clients c ON c.id=a.client_id WHERE a.staff_id=? AND a.date=? AND a.status!='cancelled' ORDER BY a.created_at").bind(me.id, n.date).all()).results;
    day.forEach(a => { a.cumple = !!a.birthday && a.birthday.slice(5) === n.date.slice(5); });
    await attachItems(db, day);
    return J(200, { me, products: (await db.prepare('SELECT id,name,description,price,stock,track,active' + (me.role === 'owner' ? ',low,comm_pct,photo' : '') + ' FROM bp_products ORDER BY active DESC,name').all()).results, notif: (await db.prepare('SELECT COUNT(*) n FROM bp_notif WHERE staff_id=? AND seen=0').bind(me.id).first()).n, unrec: un, weak: await weakPin(db, me.id), today: n.date, day, earn: pack(me.role, (await db.prepare('SELECT comm FROM bp_staff WHERE id=?').bind(me.id).first()).comm ?? +st.commission, await periods(db), me.id), logo: st.logo || null, services: (await db.prepare('SELECT * FROM bp_services ORDER BY price').all()).results });
  }
  if (p === '/api/appt/done' && req.method === 'POST') {
    const a = await mine(db, me, B.id); let { service_id: sid, service_name: sn, price: pr, duration: du } = a;
    let exs = a.extras;
    if (B.serviceId && B.serviceId !== sid) { const s = await svcOf(db, B.serviceId, false); sid = s.id; sn = s.name; pr = s.price; du = s.duration; exs = null; }
    const amt = Number.isFinite(+B.amount) && B.amount !== '' && +B.amount >= 0 ? Math.round(+B.amount) : pr;
    if (a.status === 'unrecorded') await holdBack(db, a.id);
    const pt = await db.prepare('SELECT COALESCE(SUM(qty*price),0) t,COALESCE(SUM(ROUND(qty*price*comm_pct/100.0)),0) c FROM bp_items WHERE appt_id=?').bind(a.id).first();
    await db.batch([
      db.prepare("UPDATE bp_appts SET status='done',service_id=?,service_name=?,price=?,duration=?,pay=?,amount=?,extras=?,prod_total=?,prod_comm=? WHERE id=?").bind(sid, sn, pr, du, B.pay === 'transferencia' ? 'transferencia' : 'efectivo', amt, exs, pt.t, Math.round(pt.c), a.id),
      db.prepare('UPDATE bp_clients SET visits=visits+1,total_spent=total_spent+?,last_visit=? WHERE id=?').bind(amt + pt.t, a.date, a.client_id)]);
    return J(200, { ok: true });
  }
  if (p === '/api/appt/status' && req.method === 'POST') {
    const a = await mine(db, me, B.id), s = B.status === 'no_show' ? 'no_show' : 'cancelled';
    await db.batch([db.prepare('UPDATE bp_appts SET status=? WHERE id=?').bind(s, a.id), ...(s === 'no_show' ? [db.prepare('UPDATE bp_clients SET no_shows=no_shows+1 WHERE id=?').bind(a.client_id)] : [])]);
    if (s === 'cancelled' || s === 'no_show') await releaseDead(db);
    if (s === 'cancelled' && a.kind === 'turno') ctx.waitUntil((async () => notifyClient(env, db, (await db.prepare('SELECT whatsapp FROM bp_clients WHERE id=?').bind(a.client_id).first())?.whatsapp, 'Turno cancelado', `Se canceló tu turno del ${fd(a.date)} a las ${a.time}. Escribinos para reprogramarlo.`))());
    return J(200, { ok: true });
  }

  if (p === '/api/pin/change' && req.method === 'POST') {
    const cf = await cfg(db), mx = +cf.pin_max || 5, win = (+cf.pin_lock || 15) * MIN, k = 'login|' + me.id, np = String(B.pin || '');
    await lockCheck(db, k, mx, win);
    const s = await db.prepare('SELECT pin_hash FROM bp_staff WHERE id=?').bind(me.id).first();
    if (s.pin_hash !== await hash(String(B.current || ''))) { await lockHit(db, k, win); throw err(401, 'El PIN actual no es correcto'); }
    pinRule(np);
    const tk = (req.headers.get('cookie') || '').match(/bp_s=([\w-]+)/)?.[1];
    await db.batch([db.prepare('UPDATE bp_staff SET pin_hash=? WHERE id=?').bind(await hash(np), me.id), db.prepare('DELETE FROM bp_sessions WHERE staff_id=? AND token!=?').bind(me.id, tk)]);
    await lockClear(db, k);
    return J(200, { ok: true });
  }
  if (p === '/api/agenda') {
    await closeOld(db);
    const d = u.searchParams.get('date') || n.date; if (!isDate(d)) throw err(400, 'Fecha inválida');
    const sid = me.role === 'owner' ? (u.searchParams.get('staff') || 'all') : me.id, one = sid !== 'all';
    const appts = (await db.prepare(`SELECT a.id,a.kind,a.date,a.time,a.duration,a.staff_id,a.service_id,a.service_name,a.price,a.status,a.created_at,a.extras,c.id client_id,c.notes,(SELECT COALESCE(SUM(f.amount),0) FROM bp_fees f WHERE f.client_id=c.id AND f.paid=0) debt,c.name cname,c.whatsapp,c.birthday,c.visits,s.name sname FROM bp_appts a JOIN bp_clients c ON c.id=a.client_id JOIN bp_staff s ON s.id=a.staff_id WHERE a.kind='turno' AND a.date=? AND a.status!='cancelled' ${one ? 'AND a.staff_id=?' : ''} ORDER BY a.time`).bind(...(one ? [d, sid] : [d])).all()).results;
    appts.forEach(a => { a.cumple = !!a.birthday && a.birthday.slice(5) === d.slice(5); });
    await attachItems(db, appts);
    const blocks = (await db.prepare(`SELECT b.*,s.name sname FROM bp_blocks b LEFT JOIN bp_staff s ON s.id=b.staff_id WHERE b.d2>=? ${one ? 'AND (b.staff_id IS NULL OR b.staff_id=?)' : ''} ORDER BY b.d1,b.t1`).bind(...(one ? [n.date, sid] : [n.date])).all()).results;
    return J(200, { date: d, today: n.date, appts, blocks });
  }
  if (p === '/api/appt/create' && req.method === 'POST') {
    const sf = me.role === 'owner' ? await staffOk(db, B.staff) : { id: me.id, name: me.name }, s0 = await svcOf(db, B.service, false), s = await withExtras(db, s0, B.extras, s0.id, true);
    if (!isDate(B.date) || !isTime(B.time) || B.date < n.date) throw err(400, 'Elegí una fecha desde hoy y una hora válida');
    slotRules(await conflicts(db, sf.id, B.date, B.time, s.duration), B.force);
    const cid = await client(db, B.name, B.whatsapp, null), id = uid('a'), pr = B.price !== '' && B.price != null && Number.isFinite(+B.price) && +B.price >= 0 ? Math.round(+B.price) : s.price;
    const pl = await planItems(db, B.products, []);
    try { await db.batch([db.prepare("INSERT INTO bp_appts(id,client_id,staff_id,service_id,service_name,price,duration,date,time,kind,extras) VALUES(?,?,?,?,?,?,?,?,?,'turno',?)").bind(id, cid, sf.id, s.id, s.name, pr, s.duration, B.date, B.time, exJson(s)), ...itemStmts(db, id, pl.rows)]); } catch (e) { await giveBack(db, pl.rows); throw e; }
    lowNotify(ctx, env, db, pl.low);
    if (sf.id !== me.id) ctx.waitUntil(notifyStaff(env, db, sf.id, `Te cargaron un turno: ${String(B.name || '').slice(0, 30)} · ${fd(B.date)} ${B.time}`));
    return J(200, { ok: true, id });
  }
  if (p === '/api/appt/move' && req.method === 'POST') {
    const a = await mine(db, me, B.id);
    if (a.status !== 'pending') throw err(409, 'Solo se pueden mover o editar turnos pendientes');
    let sid = a.staff_id, date = a.date, time = a.time, sv = { id: a.service_id, name: a.service_name, price: a.price, duration: a.duration };
    let exs = a.extras;
    if ((B.service && B.service !== a.service_id) || Array.isArray(B.extras)) { const s = await svcOf(db, B.service || a.service_id, false), x = await withExtras(db, { id: s.id, name: s.name, price: s.price, duration: s.duration }, Array.isArray(B.extras) ? B.extras : [], s.id, true); sv = { id: x.id, name: x.name, price: x.price, duration: x.duration }; exs = exJson(x); }
    if (B.price !== '' && B.price != null && Number.isFinite(+B.price) && +B.price >= 0) sv.price = Math.round(+B.price);
    if (a.kind === 'turno') {
      if (B.date) date = B.date; if (B.time) time = B.time;
      if (me.role === 'owner' && B.staff) sid = (await staffOk(db, B.staff)).id;
      if (!isDate(date) || !isTime(time) || date < n.date) throw err(400, 'Elegí una fecha desde hoy y una hora válida');
      if (date !== a.date || time !== a.time || sid !== a.staff_id || sv.duration !== a.duration) slotRules(await conflicts(db, sid, date, time, sv.duration, a.id), B.force);
    }
    const moved = a.kind === 'turno' && (date !== a.date || time !== a.time || sid !== a.staff_id);
    let pl = null;
    if (Array.isArray(B.products)) pl = await planItems(db, B.products, (await db.prepare('SELECT * FROM bp_items WHERE appt_id=?').bind(a.id).all()).results);
    await db.prepare('UPDATE bp_appts SET staff_id=?,service_id=?,service_name=?,price=?,duration=?,date=?,time=?,extras=?,reminded=0 WHERE id=?').bind(sid, sv.id, sv.name, sv.price, sv.duration, date, time, exs, a.id).run();
    if (pl) { await db.batch([db.prepare('DELETE FROM bp_items WHERE appt_id=?').bind(a.id), ...itemStmts(db, a.id, pl.rows)]); lowNotify(ctx, env, db, pl.low); }
    if (moved) {
      const c = await db.prepare('SELECT whatsapp FROM bp_clients WHERE id=?').bind(a.client_id).first();
      ctx.waitUntil(notifyClient(env, db, c?.whatsapp, 'Tu turno cambió', `Tu turno pasó al ${fd(date)} a las ${time}.`));
      if (sid !== a.staff_id) ctx.waitUntil(notifyStaff(env, db, sid, `Te asignaron un turno: ${fd(date)} ${time}`));
    }
    return J(200, { ok: true, moved });
  }
  if (p === '/api/block' && req.method === 'POST') {
    const d1 = B.from, d2 = B.to || B.from, t1 = B.t1 || null, t2 = B.t2 || null, all = me.role === 'owner' && (!B.staff || B.staff === 'all');
    const sid = all ? null : me.role === 'owner' ? (await staffOk(db, B.staff)).id : me.id;
    if (!isDate(d1) || !isDate(d2) || d2 < d1 || d1 < n.date) throw err(400, 'Elegí fechas desde hoy (el "hasta" no puede ser anterior al "desde")');
    if ((t1 || t2) && (!isTime(t1) || !isTime(t2) || t1 >= t2)) throw err(400, 'Revisá las horas: la de fin tiene que ser posterior a la de inicio');
    await db.prepare('INSERT INTO bp_blocks(id,staff_id,d1,d2,t1,t2,note) VALUES(?,?,?,?,?,?,?)').bind(uid('b'), sid, d1, d2, t1, t2, String(B.note || '').trim().slice(0, 80)).run();
    const rows = (await db.prepare(`SELECT a.id,a.date,a.time,a.duration,a.staff_id,a.service_id,a.service_name,a.price,a.kind,a.status,c.name cname,c.whatsapp,s.name sname FROM bp_appts a JOIN bp_clients c ON c.id=a.client_id JOIN bp_staff s ON s.id=a.staff_id WHERE a.kind='turno' AND a.status='pending' AND a.date BETWEEN ? AND ? ${sid ? 'AND a.staff_id=?' : ''} ORDER BY a.date,a.time`).bind(...(sid ? [d1, d2, sid] : [d1, d2])).all()).results;
    return J(200, { ok: true, affected: rows.filter(a => !t1 || (tm(a.time) < tm(t2) && tm(t1) < tm(a.time) + a.duration)) });
  }
  if (p === '/api/block/del' && req.method === 'POST') {
    const b = await db.prepare('SELECT staff_id FROM bp_blocks WHERE id=?').bind(B.id).first();
    if (!b || (me.role !== 'owner' && b.staff_id !== me.id)) throw err(404, 'Bloqueo no encontrado');
    await db.prepare('DELETE FROM bp_blocks WHERE id=?').bind(B.id).run();
    return J(200, { ok: true });
  }
  if (p === '/api/notifs') {
    const unread = async () => (await db.prepare('SELECT COUNT(*) n FROM bp_notif WHERE staff_id=? AND seen=0').bind(me.id).first()).n;
    if (u.searchParams.get('count')) return J(200, { unread: await unread() });
    return J(200, { items: (await db.prepare('SELECT id,kind,body,seen,created_at FROM bp_notif WHERE staff_id=? AND kind!=? ORDER BY rowid DESC LIMIT 50').bind(me.id, 'reminder').all()).results, unread: await unread() });
  }
  if (p === '/api/notifs/read' && req.method === 'POST') {
    if (B.all) await db.prepare('UPDATE bp_notif SET seen=1 WHERE staff_id=?').bind(me.id).run();
    else await db.prepare('UPDATE bp_notif SET seen=1 WHERE id=? AND staff_id=?').bind(String(B.id || ''), me.id).run();
    return J(200, { ok: true });
  }
  if (p === '/api/fees/paid' && req.method === 'POST') {
    await db.prepare('UPDATE bp_fees SET paid=1,paid_date=? WHERE client_id=? AND paid=0').bind(n.date, String(B.client || '')).run();
    return J(200, { ok: true });
  }
  if (p === '/api/client/note' && req.method === 'POST') {
    if (!(await db.prepare('SELECT id FROM bp_clients WHERE id=?').bind(B.id).first())) throw err(404, 'Cliente no encontrado');
    await db.prepare('UPDATE bp_clients SET notes=? WHERE id=?').bind(String(B.notes || '').trim().slice(0, 300), B.id).run();
    return J(200, { ok: true });
  }
  if (me.role !== 'owner') throw err(403, 'Solo el dueño puede ver esto');
  if (p === '/api/admin') {
    const rows = await periods(db), staff = (await db.prepare("SELECT id,name,role,active,comm FROM bp_staff WHERE active=1 OR id IN (SELECT staff_id FROM bp_appts WHERE status='done' AND date>=?) OR id IN (SELECT staff_id FROM bp_payouts WHERE date>=?) ORDER BY role DESC,active DESC,name").bind(rng(n.date).m, rng(n.date).m).all()).results, pct = +st.commission;
    const paid = Object.fromEntries((await db.prepare('SELECT staff_id s,SUM(amount) t FROM bp_payouts WHERE date>=? GROUP BY staff_id').bind(rng(n.date).m).all()).results.map(r => [r.s, r.t]));
    const cash = (await db.prepare("SELECT COALESCE(SUM(amount+prod_total),0) t FROM bp_appts WHERE status='done' AND pay='efectivo' AND date=?").bind(n.date).first()).t;
    const team = staff.map(s => ({ id: s.id, name: s.name, role: s.role, active: !!s.active, paid: paid[s.id] || 0, comm: s.comm, ...pack(s.role, s.comm ?? pct, rows, s.id) }));
    const fees = (await db.prepare('SELECT COALESCE(SUM(amount),0) t FROM bp_fees WHERE paid=1 AND paid_date>=?').bind(rng(n.date).m).first()).t;
    const month = { income: team.reduce((t, x) => t + x.month.t, 0) + fees, fees, products: team.reduce((t, x) => t + x.month.p, 0), commissions: team.reduce((t, x) => t + x.month.c, 0) };
    const exp = (await db.prepare('SELECT * FROM bp_expenses WHERE date>=? ORDER BY date DESC,rowid DESC').bind(rng(n.date).m).all()).results;
    month.byCat = {}; for (const e of exp) { const k = e.category || 'Otros'; month.byCat[k] = (month.byCat[k] || 0) + e.amount; }
    month.byPay = { efectivo: 0, transferencia: 0 }; for (const r of (await db.prepare("SELECT pay,COALESCE(SUM(amount+prod_total),0) t FROM bp_appts WHERE status='done' AND date>=? GROUP BY pay").bind(rng(n.date).m).all()).results) month.byPay[r.pay === 'transferencia' ? 'transferencia' : 'efectivo'] += r.t;
    const dm14 = Object.fromEntries((await db.prepare("SELECT date d,COALESCE(SUM(amount+prod_total),0) t FROM bp_appts WHERE status='done' AND date>=? GROUP BY date").bind(addD(n.date, -13)).all()).results.map(r => [r.d, r.t]));
    const daily = Array.from({ length: 14 }, (_, i) => { const d = addD(n.date, i - 13); return { d, t: dm14[d] || 0 }; });
    month.expenses = exp.reduce((t, x) => t + x.amount, 0); month.net = month.income - month.commissions - month.expenses;
    const clients = (await db.prepare('SELECT * FROM bp_clients ORDER BY last_visit IS NULL,last_visit DESC LIMIT 300').all()).results, debts = Object.fromEntries((await db.prepare('SELECT client_id c,SUM(amount) t FROM bp_fees WHERE paid=0 GROUP BY client_id').all()).results.map(r => [r.c, r.t]));
    clients.forEach(c => { c.debt = debts[c.id] || 0; });
    const promos = (await db.prepare('SELECT * FROM bp_promos ORDER BY start DESC LIMIT 50').all()).results;
    const sales = (await db.prepare("SELECT i.name,SUM(i.qty) u,SUM(i.qty*i.price) t FROM bp_items i JOIN bp_appts a ON a.id=i.appt_id WHERE a.status='done' AND a.date>=? GROUP BY i.product_id,i.name ORDER BY t DESC").bind(rng(n.date).m).all()).results;
    const staff_all = (await db.prepare('SELECT id,name,role,active,comm FROM bp_staff ORDER BY role DESC,active DESC,name').all()).results.map(s => ({ ...s, active: !!s.active }));
    return J(200, { daily, sales, staff_all, promos, cash, team, month, expenses: exp, clients, settings: { name: st.name, commission: +st.commission, address: st.address || '', phone: st.phone || '', instagram: st.instagram || '', schedule: JSON.parse(st.schedule || '{}'), book_days: +st.book_days || 3, slot_step: +st.slot_step || 15, logo: st.logo || null, late_mode: ['off', 'fee'].includes(st.late_mode) ? st.late_mode : 'warn', late_hours: +st.late_hours || 1, late_pct: +st.late_pct || 50, pin_max: +st.pin_max || 5, pin_lock: +st.pin_lock || 15, security: { question: st.sec_q || '', set: !!st.sec_a } }, today: n.date, now: n.date + 'T' + hm(n.min) });
  }
  if (p === '/api/admin/expense' && req.method === 'POST') {
    const c = String(B.concept || '').trim().slice(0, 80), a = Math.round(+B.amount);
    if (!c || !(a > 0)) throw err(400, 'Completá concepto y monto');
    await db.prepare('INSERT INTO bp_expenses(id,date,concept,amount,category) VALUES(?,?,?,?,?)').bind(uid('e'), n.date, c, a, ['Alquiler', 'Insumos', 'Servicios', 'Publicidad', 'Sueldos', 'Otros'].includes(B.category) ? B.category : 'Otros').run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/payout' && req.method === 'POST') {
    const a = Math.round(+B.amount), s = await staffOk(db, B.staff);
    if (!(a > 0)) throw err(400, 'Ingresá un monto');
    await db.prepare('INSERT INTO bp_payouts(id,staff_id,date,amount) VALUES(?,?,?,?)').bind(uid('p'), s.id, n.date, a).run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/promo' && req.method === 'POST') {
    const t = String(B.title || '').trim().slice(0, 60), k = B.kind === '2x1' ? '2x1' : 'pct', c = k === '2x1' ? 0 : Math.round(+B.pct), d = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, sv = (Array.isArray(B.services) ? B.services.filter(x => /^\w+$/.test(x)) : []).join(','), msg = String(B.message || '').trim().slice(0, 140);
    if (!t || (k === 'pct' && !(c >= 1 && c <= 100)) || !d.test(B.start) || !d.test(B.end) || B.end <= B.start) throw err(400, 'Revisá el nombre, el porcentaje (1 a 100) y las fechas (el fin debe ser posterior al inicio)');
    if (!sv) throw err(400, 'Elegí al menos un servicio');
    if (B.id) await db.prepare('UPDATE bp_promos SET title=?,pct=?,service_id=?,start=?,end=?,kind=?,message=? WHERE id=?').bind(t, c, sv, B.start, B.end, k, msg, B.id).run();
    else await db.prepare('INSERT INTO bp_promos(id,title,pct,service_id,start,end,kind,message) VALUES(?,?,?,?,?,?,?,?)').bind(uid('pm'), t, c, sv, B.start, B.end, k, msg).run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/promo/toggle' && req.method === 'POST') { await db.prepare('UPDATE bp_promos SET active=1-active WHERE id=?').bind(B.id).run(); return J(200, { ok: true }); }
  if (p === '/api/admin/image' && req.method === 'POST') {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(B.data || ''));
    if (!m) throw err(400, 'La foto tiene que ser JPG, PNG o WebP');
    if (m[2].length > 700000) throw err(400, 'La foto pesa demasiado (máximo 500 KB)');
    const id = uid('im'); await db.prepare('INSERT INTO bp_images(id,mime,data) VALUES(?,?,?)').bind(id, m[1], m[2]).run();
    return J(200, { id });
  }
  if (p === '/api/admin/product' && req.method === 'POST') {
    const nm = String(B.name || '').trim().slice(0, 80), pr = Math.round(+B.price), low = Math.round(+B.low || 0), cp = Math.round(+B.comm_pct || 0), desc = String(B.description || '').trim().slice(0, 200), track = B.track === false ? 0 : 1, active = B.active === false ? 0 : 1;
    if (!nm || !(pr >= 0)) throw err(400, 'Completá el nombre y el precio');
    if (!(low >= 0 && low <= 999)) throw err(400, 'El aviso de pocas unidades va de 0 a 999');
    if (!(cp >= 0 && cp <= 100)) throw err(400, 'La comisión va de 0 a 100');
    const cur = B.id ? await db.prepare('SELECT photo FROM bp_products WHERE id=?').bind(B.id).first() : null;
    if (B.id && !cur) throw err(404, 'Producto no encontrado');
    let photo = cur ? cur.photo : null;
    if (B.photo !== undefined) { photo = B.photo || null; if (photo && !(await db.prepare('SELECT id FROM bp_images WHERE id=?').bind(photo).first())) throw err(400, 'Foto inválida'); }
    let id = B.id;
    if (id) await db.prepare('UPDATE bp_products SET name=?,description=?,price=?,track=?,low=?,comm_pct=?,photo=?,active=? WHERE id=?').bind(nm, desc, pr, track, low, cp, photo, active, id).run();
    else { id = uid('pr'); await db.prepare('INSERT INTO bp_products(id,name,description,price,stock,track,low,comm_pct,photo,active) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id, nm, desc, pr, Math.max(0, Math.round(+B.stock || 0)), track, low, cp, photo, active).run(); }
    if (cur && cur.photo && cur.photo !== photo) await db.prepare('DELETE FROM bp_images WHERE id=?').bind(cur.photo).run();
    return J(200, { ok: true, id });
  }
  if (p === '/api/admin/product/stock' && req.method === 'POST') {
    const q = Math.round(+B.qty);
    if (!(q >= 0 && q <= 100000) || !['add', 'sub', 'set'].includes(B.op)) throw err(400, 'Ingresá una cantidad válida');
    if (!(await db.prepare('SELECT id FROM bp_products WHERE id=?').bind(B.id).first())) throw err(404, 'Producto no encontrado');
    await db.prepare(B.op === 'add' ? 'UPDATE bp_products SET stock=stock+? WHERE id=?' : B.op === 'sub' ? 'UPDATE bp_products SET stock=MAX(stock-?,0) WHERE id=?' : 'UPDATE bp_products SET stock=? WHERE id=?').bind(q, B.id).run();
    return J(200, { ok: true, stock: (await db.prepare('SELECT stock FROM bp_products WHERE id=?').bind(B.id).first()).stock });
  }
  if (p === '/api/admin/product/del' && req.method === 'POST') {
    const cur = await db.prepare('SELECT photo FROM bp_products WHERE id=?').bind(B.id).first();
    if (!cur) throw err(404, 'Producto no encontrado');
    await db.prepare('DELETE FROM bp_products WHERE id=?').bind(B.id).run();
    if (cur.photo) await db.prepare('DELETE FROM bp_images WHERE id=?').bind(cur.photo).run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/service' && req.method === 'POST') {
    const nm = String(B.name || '').trim().slice(0, 80), pr = Math.round(+B.price), du = Math.round(+B.duration);
    if (!nm || !(pr >= 0) || !(du >= 5 && du <= 480)) throw err(400, 'Completá nombre, precio y duración (5 a 480 min)');
    const desc = String(B.description || '').trim().slice(0, 200), online = B.online === false ? 0 : 1, addon = B.addon ? 1 : 0;
    const cur = B.id ? await db.prepare('SELECT photo FROM bp_services WHERE id=?').bind(B.id).first() : null;
    if (B.id && !cur) throw err(404, 'Servicio no encontrado');
    if (addon && (await db.prepare('SELECT COUNT(*) n FROM bp_services WHERE addon=0 AND id!=?').bind(B.id || '').first()).n < 1) throw err(400, 'Tiene que quedar al menos un servicio principal');
    let at = '';
    if (addon && Array.isArray(B.addon_to)) { const mains = (await db.prepare('SELECT id FROM bp_services WHERE addon=0').all()).results.map(r => r.id); at = B.addon_to.filter(x => mains.includes(x)).join(','); }
    let photo = cur ? cur.photo : null;
    if (B.photo !== undefined) { photo = B.photo || null; if (photo && !(await db.prepare('SELECT id FROM bp_images WHERE id=?').bind(photo).first())) throw err(400, 'Foto inválida'); }
    if (B.id) await db.prepare('UPDATE bp_services SET name=?,price=?,duration=?,description=?,photo=?,online=?,addon=?,addon_to=? WHERE id=?').bind(nm, pr, du, desc, photo, online, addon, at, B.id).run();
    else await db.prepare('INSERT INTO bp_services(id,name,price,duration,description,photo,online,addon,addon_to) VALUES(?,?,?,?,?,?,?,?,?)').bind(uid('s'), nm, pr, du, desc, photo, online, addon, at).run();
    if (cur && cur.photo && cur.photo !== photo) await db.prepare('DELETE FROM bp_images WHERE id=?').bind(cur.photo).run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/service/del' && req.method === 'POST') {
    if ((await db.prepare('SELECT COUNT(*) n FROM bp_services WHERE addon=0 AND id!=?').bind(B.id || '').first()).n < 1) throw err(400, 'Tiene que quedar al menos un servicio principal');
    const cur = await db.prepare('SELECT photo FROM bp_services WHERE id=?').bind(B.id).first();
    await db.prepare('DELETE FROM bp_services WHERE id=?').bind(B.id).run();
    if (cur && cur.photo) await db.prepare('DELETE FROM bp_images WHERE id=?').bind(cur.photo).run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/promo/del' && req.method === 'POST') { await db.prepare('DELETE FROM bp_promos WHERE id=?').bind(B.id).run(); return J(200, { ok: true }); }
  if (p === '/api/admin/settings' && req.method === 'POST') {
    const c = Math.round(+B.commission), nm = String(B.name || '').trim().slice(0, 60);
    if (!(c >= 0 && c <= 100) || !nm) throw err(400, 'Revisá el nombre y el porcentaje (0 a 100)');
    const put = (k, v) => db.prepare('INSERT OR REPLACE INTO bp_settings(k,v) VALUES(?,?)').bind(k, v);
    await db.batch([put('commission', String(c)), put('name', nm), put('address', String(B.address || '').trim().slice(0, 120)), put('phone', String(B.phone || '').trim().slice(0, 30)), put('instagram', String(B.instagram || '').trim().replace(/^@/, '').slice(0, 40))]);
    return J(200, { ok: true });
  }
  if (p === '/api/admin/schedule' && req.method === 'POST') {
    const sch = {}, T = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (let d = 0; d < 7; d++) {
      const r = (B.schedule && B.schedule[d]) || [];
      if (!Array.isArray(r) || r.length > 3) throw err(400, 'Horarios inválidos');
      let last = '';
      for (const x of r) { const [a, b] = Array.isArray(x) ? x : []; if (!T.test(a) || !T.test(b) || a >= b || a < last) throw err(400, `Revisá el ${DN[d]}: cada franja debe terminar después de empezar y no pisarse con la otra`); last = b; }
      if (r.length) sch[d] = r.map(([a, b]) => [a, b]);
    }
    const bd = Math.round(+B.book_days), stp = B.step == null ? 15 : Math.round(+B.step);
    if (!(bd >= 1 && bd <= 30)) throw err(400, 'Los días para reservar van de 1 a 30');
    if (![5, 10, 15, 20, 30, 60].includes(stp)) throw err(400, 'Los turnos pueden ofrecerse cada 5, 10, 15, 20, 30 o 60 minutos');
    const put = (k, v) => db.prepare('INSERT OR REPLACE INTO bp_settings(k,v) VALUES(?,?)').bind(k, v);
    await db.batch([put('schedule', JSON.stringify(sch)), put('book_days', String(bd)), put('slot_step', String(stp))]);
    const fut = (await db.prepare("SELECT date,time,duration FROM bp_appts WHERE kind='turno' AND status='pending' AND date>=?").bind(n.date).all()).results;
    const outside = fut.filter(a => !(sch[new Date(a.date + 'T12:00:00Z').getUTCDay()] || []).some(([x, y]) => tm(a.time) >= tm(x) && tm(a.time) + a.duration <= tm(y))).length;
    return J(200, { ok: true, outside });
  }
  if (p === '/api/admin/security' && req.method === 'POST') {
    const q = String(B.question || '').trim().slice(0, 100), a = norm(B.answer), keep = !a && !!st.sec_a, mx = Math.round(+B.pin_max), lk = Math.round(+B.pin_lock);
    if (q.length < 5 || (!keep && a.length < 2)) throw err(400, 'Escribí la pregunta y su respuesta');
    if (!(mx >= 3 && mx <= 10) || !(lk >= 5 && lk <= 120)) throw err(400, 'Intentos: de 3 a 10. Bloqueo: de 5 a 120 minutos');
    const put = (k, v) => db.prepare('INSERT OR REPLACE INTO bp_settings(k,v) VALUES(?,?)').bind(k, v);
    await db.batch([put('sec_q', q), put('pin_max', String(mx)), put('pin_lock', String(lk)), ...(keep ? [] : [put('sec_a', await hash('ans|' + a))])]);
    return J(200, { ok: true });
  }
  if (p === '/api/admin/logo' && req.method === 'POST') {
    const img = B.image || null;
    if (img && !(await db.prepare('SELECT id FROM bp_images WHERE id=?').bind(img).first())) throw err(400, 'Imagen inválida');
    const old = st.logo;
    await db.prepare('INSERT OR REPLACE INTO bp_settings(k,v) VALUES(?,?)').bind('logo', img || '').run();
    if (old && old !== img) await db.prepare('DELETE FROM bp_images WHERE id=?').bind(old).run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/late' && req.method === 'POST') {
    const hrs = Math.round(+B.hours), pct = Math.round(+B.pct);
    if (!['off', 'warn', 'fee'].includes(B.mode)) throw err(400, 'Elegí una opción');
    if (!(hrs >= 1 && hrs <= 48)) throw err(400, 'Las horas van de 1 a 48');
    if (!(pct >= 1 && pct <= 100)) throw err(400, 'El porcentaje va de 1 a 100');
    const put = (k, v) => db.prepare('INSERT OR REPLACE INTO bp_settings(k,v) VALUES(?,?)').bind(k, v);
    await db.batch([put('late_mode', B.mode), put('late_hours', String(hrs)), put('late_pct', String(pct))]);
    return J(200, { ok: true });
  }
  if (p === '/api/admin/staff' && req.method === 'POST') {
    const nm = String(B.name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (nm.length < 2) throw err(400, 'Escribí el nombre');
    const cm = B.comm === '' || B.comm == null ? null : Math.round(+B.comm);
    if (cm !== null && !(cm >= 0 && cm <= 100)) throw err(400, 'La comisión va de 0 a 100');
    if (await db.prepare('SELECT id FROM bp_staff WHERE active=1 AND LOWER(name)=LOWER(?) AND id!=?').bind(nm, B.id || '').first()) throw err(409, 'Ya hay alguien con ese nombre');
    if (B.id) {
      if (!(await db.prepare('SELECT id FROM bp_staff WHERE id=?').bind(B.id).first())) throw err(404, 'Persona no encontrada');
      await db.prepare('UPDATE bp_staff SET name=?,comm=? WHERE id=?').bind(nm, cm, B.id).run();
      return J(200, { ok: true, id: B.id });
    }
    const np = String(B.pin || ''); pinRule(np);
    if ((await db.prepare('SELECT COUNT(*) n FROM bp_staff WHERE active=1').first()).n >= 20) throw err(400, 'Llegaste al máximo de 20 personas');
    const id = uid('t');
    await db.prepare("INSERT INTO bp_staff(id,name,role,pin_hash,comm) VALUES(?,?,'barber',?,?)").bind(id, nm, await hash(np), cm).run();
    return J(200, { ok: true, id });
  }
  if (p === '/api/admin/staff/active' && req.method === 'POST') {
    const s = await db.prepare('SELECT id,name,role FROM bp_staff WHERE id=?').bind(B.id).first();
    if (!s) throw err(404, 'Persona no encontrada');
    if (s.role === 'owner') throw err(400, 'No se puede dar de baja al dueño');
    if (B.active) {
      if (await db.prepare('SELECT id FROM bp_staff WHERE active=1 AND LOWER(name)=LOWER(?)').bind(s.name).first()) throw err(409, 'Ya hay alguien activo con ese nombre');
      await db.prepare('UPDATE bp_staff SET active=1 WHERE id=?').bind(s.id).run();
      return J(200, { ok: true });
    }
    const pend = (await db.prepare("SELECT COUNT(*) n FROM bp_appts WHERE staff_id=? AND status='pending' AND date>=?").bind(s.id, n.date).first()).n;
    if (pend) throw err(409, `${s.name} tiene ${pend} turno${pend === 1 ? '' : 's'} pendiente${pend === 1 ? '' : 's'}. Movelos o cancelalos antes de darlo de baja.`);
    await db.batch([db.prepare('UPDATE bp_staff SET active=0 WHERE id=?').bind(s.id), db.prepare('DELETE FROM bp_sessions WHERE staff_id=?').bind(s.id), db.prepare('DELETE FROM bp_push WHERE staff_id=?').bind(s.id)]);
    return J(200, { ok: true });
  }
  if (p === '/api/admin/staff-pin' && req.method === 'POST') {
    const s = await staffOk(db, B.staff), np = String(B.pin || ''); pinRule(np);
    await db.batch([db.prepare('UPDATE bp_staff SET pin_hash=? WHERE id=?').bind(await hash(np), s.id), db.prepare('DELETE FROM bp_sessions WHERE staff_id=?').bind(s.id)]);
    await lockClear(db, 'login|' + s.id);
    return J(200, { ok: true });
  }
  if (p === '/api/admin/client' && req.method === 'POST') {
    const c = await db.prepare('SELECT id FROM bp_clients WHERE id=?').bind(B.id).first();
    if (!c) throw err(404, 'Cliente no encontrado');
    const nm = String(B.name || '').trim().slice(0, 80), wa = String(B.whatsapp || '').replace(/\D/g, ''), bd = B.birthday || null;
    if (!nm) throw err(400, 'Ingresá el nombre');
    if (wa.length < 8) throw err(400, 'Ingresá un WhatsApp válido');
    if (bd && !isDate(bd)) throw err(400, 'El cumpleaños no es una fecha válida');
    const dup = await db.prepare('SELECT name FROM bp_clients WHERE whatsapp=? AND id!=?').bind(wa, c.id).first();
    if (dup) throw err(409, `Ese WhatsApp ya es de ${dup.name}`);
    await db.prepare('UPDATE bp_clients SET name=?,whatsapp=?,birthday=?,notes=? WHERE id=?').bind(nm, wa, bd, String(B.notes || '').trim().slice(0, 300), c.id).run();
    return J(200, { ok: true });
  }
  if (p === '/api/admin/summary') { const s = await summaryData(db, n.date); return J(200, { ...s, text: summaryText(s) }); }
  throw err(404, 'No encontrado');
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url), p = u.pathname;
    if (!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (!env.DB) return J(500, { error: 'Falta el binding D1 llamado DB.' });
    try { await init(env.DB); return await route(req, env.DB, u, p, env, ctx); }
    catch (e) { return J(e.status || 400, { error: e.message, ...(e.soft ? { soft: true } : {}), ...(e.late ? { late: true, fee: e.fee } : {}) }); }
  },
  // Cron (wrangler.toml): recuerda por push los turnos de la próxima hora (al cliente, a su barbero y a los dueños) y reintenta los avisos pendientes.
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    ctx.waitUntil((async () => {
      await init(env.DB); const n = now();
      await env.DB.prepare('DELETE FROM bp_limits WHERE t<?').bind(Date.now() - 86400000).run();
      await closeOld(env.DB);
      await env.DB.prepare("DELETE FROM bp_images WHERE created_at<datetime('now','-1 day') AND id NOT IN (SELECT photo FROM bp_services WHERE photo IS NOT NULL) AND id NOT IN (SELECT photo FROM bp_products WHERE photo IS NOT NULL) AND id NOT IN (SELECT v FROM bp_settings WHERE k='logo')").run();
      await env.DB.prepare("DELETE FROM bp_notif WHERE created_at<datetime('now','-60 day')").run();
      const rows = (await env.DB.prepare("SELECT a.id,a.time,a.staff_id,a.service_name sname,c.name cname,s.name staff,substr(c.whatsapp,-10) w FROM bp_appts a JOIN bp_clients c ON c.id=a.client_id JOIN bp_staff s ON s.id=a.staff_id WHERE a.kind='turno' AND a.status='pending' AND a.reminded=0 AND a.date=?").bind(n.date).all()).results.filter(a => tm(a.time) > n.min && tm(a.time) - n.min <= 60);
      const owners = rows.length ? (await env.DB.prepare("SELECT id FROM bp_staff WHERE role='owner' AND active=1").all()).results.map(x => x.id) : [];
      for (const a of rows) {
        const left = tm(a.time) - n.min, cuando = left >= 55 ? 'en 1 hora' : `en ${left} min`;
        // Recordatorio para el barbero del turno y para los dueños (y solo ellos). Id fijo por turno y persona: se crea una sola vez.
        await env.DB.batch([...new Set([a.staff_id, ...owners])].map(id => env.DB.prepare("INSERT OR IGNORE INTO bp_notif(id,staff_id,kind,title,body,seen,pushed) VALUES(?,?,'reminder',?,?,1,0)").bind('nrem_' + a.id + '_' + id, id, `Turno ${cuando}`, `${a.cname} · ${a.sname} · ${a.time}`)));
        await pushToRef(env, env.DB, 'client', a.w, { title: 'Tu turno', body: `Hoy a las ${a.time} con ${a.staff}. Si no podés venir, cancelalo desde la app.`, url: '/reservar/mis-turnos.html', tag: 'cr_' + a.id }, 1800);
        await env.DB.prepare('UPDATE bp_appts SET reminded=1 WHERE id=?').bind(a.id).run();
      }
      await flushPush(env);
    })());
  },
};
