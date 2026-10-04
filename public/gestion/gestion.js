/* Barbería Pergamino · Gestión (barberos y dueños). Estilos en /app.css y /gestion/gestion.css */
let M=null,A=null,tab='dia',q='',fl='all',AG=null,agDate=null,agStaff='all',AFF=[];
const AR='America/Argentina/Buenos_Aires';
const hh=s=>s?new Date(s.replace(' ','T')+'Z').toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:AR}):'';
const dm=d=>d?d.slice(8)+'/'+d.slice(5,7):'—';
const TABS={dia:['Mi día','cal'],gan:['Ganancias','chart'],eq:['Equipo','users'],cli:['Clientes','book'],fin:['Finanzas','wallet'],cfg:['Ajustes','gear'],ag:['Agenda','clock'],mi:['Cuenta','lock']};
const sec=(t,s,b)=>`<section class="sec"><div class="sechead"><b>${t}</b><span>${s||''}</span></div>${b}</section>`;
$('miniLogo').innerHTML=`<img src="/logo.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;$('outBtn').innerHTML=ico('out');$('bellBtn').innerHTML=ico('bell')+'<span class="nbadge hidden" id="nb"></span>';
const badge=n=>{const b=$('nb');if(!b)return;b.textContent=n>9?'9+':n;b.classList.toggle('hidden',!n)};

async function load(){M=await api('/me');A=M.me.role==='owner'?await api('/admin'):null}
async function boot(){try{await load();draw();PUSH.init(true)}catch(e){if(e.status===401)login();else $('app').innerHTML=`<div class="group pad"><p class="err">${esc(e.message)}</p></div>`}}
async function login(){
  $('tabbar').classList.add('hidden');$('outBtn').classList.add('hidden');$('bellBtn').classList.add('hidden');$('bn').textContent='Gestión';
  const p=await api('/public');
  $('app').innerHTML=`<section class="hero"><div class="halo"><div class="mark">${ico('scissors')}</div></div><h1>${esc(p.name)}</h1><p>Acceso del equipo</p></section>
  <div class="group pad" style="margin-top:18px"><div class="field" style="margin-top:0"><label for="ls">¿Quién sos?</label><select id="ls">${p.staff.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="lp">PIN</label><input id="lp" class="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><p class="err" id="le"></p><button class="btn primary" onclick="doLogin()">Entrar</button><button class="btn" style="margin-top:10px;width:100%" onclick="forgot()">Olvidé mi PIN</button></div>`;
}
async function doLogin(){try{await post('/login',{staff:$('ls').value,pin:$('lp').value});tab='dia';await load();draw();PUSH.init(true)}catch(e){$('le').textContent=e.message}}
async function logout(){await PUSH.release();await post('/logout');M=A=AG=null;closeSheet();login()}
const tabsFor=()=>M.me.role==='owner'?['dia','ag','eq','cli','fin','cfg']:['dia','ag','gan','mi'];
function go(t){tab=t;draw();scrollTo(0,0)}
function draw(){
  const ts=tabsFor();if(!ts.includes(tab))tab='dia';
  $('bn').textContent=M.me.name+' · Gestión';$('miniLogo').innerHTML=M.logo?`<img src="/api/img/${M.logo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<img src="/logo.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;$('outBtn').classList.remove('hidden');$('bellBtn').classList.remove('hidden');badge(M.notif);$('tabbar').classList.remove('hidden');
  $('tabs').style.setProperty('--n',ts.length);
  $('tabs').innerHTML=ts.map(t=>`<button class="tab ${tab===t?'active':''}" onclick="go('${t}')">${ico(TABS[t][1])}${TABS[t][0]}</button>`).join('');
  $('app').innerHTML=(M.weak?weakBanner():'')+({dia:vDia,gan:vGan,eq:vEq,cli:vCli,fin:vFin,cfg:vCfg,ag:vAg,mi:vMi}[tab])();
}
function sheet(h){$('sheet').innerHTML='<div class="handle"></div>'+h;$('overlay').classList.add('show')}
function closeSheet(){$('overlay').classList.remove('show')}

/* ---- Mi día ---- */
const findAppt=id=>[...(M.day||[]),...(AG?AG.appts:[]),...AFF].find(x=>x.id===id);
function ev(a,ag){
  const S={pending:['pending','Pendiente'],done:['done','Hecho'],no_show:['noshow','No asistió'],cancelled:['cancelled','Cancelado'],unrecorded:['cancelled','No se registró']}[a.status]||['pending',''];
  const info=[a.last_service?'Última vez: '+esc(a.last_service):(a.visits?a.visits+' visitas':'Cliente nuevo')].join('');
  return `<div class="appt"><div class="tm">${a.kind==='turno'?esc(a.time):hh(a.created_at)}</div><div class="ev ${S[0]}"><div class="hd"><div><div class="nm">${esc(a.cname)}</div><span class="tag ${S[0]}">${S[1]}</span>${a.kind==='fila'?'<span class="tag pending" style="margin-left:6px">Fila</span>':''}${a.cumple?`<span class="tag pending" style="margin-left:6px">${ico('cake')} Hoy cumple</span>`:''}</div><span class="pr">${fmt(a.price)}</span></div>
  <div class="sv">${esc(a.service_name)}${ag&&M.me.role==='owner'?' · '+esc(a.sname):''}</div><div class="ph">${ico('phone')} ${esc(displayWA(a.whatsapp))} · ${info}</div>
  ${a.debt?`<div class="cnote" style="color:var(--bad)"><b>Debe ${fmt(a.debt)}</b> por una cancelación a último momento <button class="linkbtn" onclick="feePaid('${a.client_id}')">Registrar cobro</button></div>`:''}
  ${a.items&&a.items.length?`<div class="cnote"><b>${ico('tag')} Entregar:</b> ${a.items.map(i=>i.qty+' × '+esc(i.name)).join(' · ')}</div>`:''}
  ${a.notes?`<div class="cnote">${ico('book')} ${esc(a.notes)}</div>`:''}<button class="linkbtn" onclick="noteSheet('${a.client_id}','${a.id}')">${a.notes?'Editar nota del cliente':'+ Nota del cliente'}</button>
  ${a.status==='pending'&&a.kind==='turno'?`<a class="btn" style="display:block;text-align:center;margin-top:8px" target="_blank" rel="noopener" href="https://wa.me/${formatWA(a.whatsapp)}?text=${encodeURIComponent('¡Hola '+a.cname.split(' ')[0]+'! Te recordamos tu turno '+(a.date&&a.date!==M.today?'del '+dm(a.date):'de hoy')+' a las '+a.time+'. Si no podés venir, avisanos.')}">Recordarle por WhatsApp</a>`:''}
  ${a.status==='pending'?`<button class="btn" style="display:block;width:100%;margin-top:8px" onclick="moveSheet('${a.id}')">${a.kind==='turno'?'Mover o editar':'Editar'}</button>`:''}
  ${a.status==='pending'||a.status==='unrecorded'?`<div class="evacts"><button class="go" onclick="doneSheet('${a.id}')">${ico('check')} Hecho</button><button class="wn" onclick="setSt('${a.id}','no_show')">${ico('noshow')} No asistió</button><button class="bad" onclick="setSt('${a.id}','cancelled')">${ico('x')} Cancelar</button></div>`:''}</div></div>`;
}
function vDia(){
  const t=M.day.filter(a=>a.kind==='turno'&&a.status==='pending').sort((a,b)=>a.time.localeCompare(b.time)),f=M.day.filter(a=>a.kind==='fila'&&a.status==='pending'),c=M.day.filter(a=>a.status!=='pending'),n=t[0]||f[0];
  const empty=x=>`<div class="group"><div class="empty"><b>${x}</b></div></div>`;
  const unr=M.unrec&&M.unrec.n?`<div class="group pad" style="margin-bottom:12px"><b>${M.unrec.n} turno${M.unrec.n===1?'':'s'} sin registrar</b><p class="hint">Quedaron pendientes de días anteriores. Marcá si se hicieron, si faltó el cliente o si se cancelaron.</p><button class="btn" onclick="agDate='${M.unrec.d}';AG=null;go('ag')">Ver el último</button></div>`:'';
  return `${unr}<h1 class="title">Mi día</h1>${PUSH.card('banner')}
  <section class="today"><div class="d">${longDate(M.today)}</div><div class="m"><div><b>${t.length}</b><span>turnos</span></div><div><b>${f.length}</b><span>en fila</span></div><div><b>${M.earn.today.n}</b><span>hechos</span></div></div></section>
  ${n?`<div class="next now" style="margin-top:14px"><span class="t">${n.kind==='turno'?esc(n.time):'Fila'}</span><div class="mn"><span class="lb">${n.kind==='turno'?'Próximo turno':'Siguiente en la fila'}</span><b>${esc(n.cname)}</b><small>${esc(n.service_name)} · ${fmt(n.price)}</small></div><button class="qd" onclick="doneSheet('${n.id}')" aria-label="Hecho">${ico('check')}</button></div>`:''}
  ${sec('Turnos',t.length+' pendientes',t.length?t.map(ev).join(''):empty('Sin turnos pendientes'))}
  ${sec('Fila','Orden de llegada',f.length?f.map(ev).join(''):empty('Nadie esperando'))}
  ${c.length?sec('Cerrados hoy',c.length+'',c.map(ev).join('')):''}`;
}
function doneSheet(id){
  const a=findAppt(id);
  sheet(`<h2>${esc(a.cname)}</h2><p class="sub">Confirmá lo que se hizo y lo que se cobró.</p>
  <div class="field"><label>Servicio</label><select id="ds" onchange="$('da').value=(M.services.find(s=>s.id===this.value)||{}).price;dtot(${(a.items||[]).reduce((t,i)=>t+i.qty*i.price,0)})">${M.services.map(s=>`<option value="${s.id}" ${s.id===a.service_id?'selected':''}>${esc(s.name)} · ${fmt(s.price)}</option>`).join('')}</select></div>
  ${(()=>{const pt=(a.items||[]).reduce((t,i)=>t+i.qty*i.price,0);return `<div class="field"><label>${pt?'Servicio cobrado':'Monto cobrado'}</label><input id="da" type="number" inputmode="numeric" value="${a.price}" oninput="dtot(${pt})"></div>${pt?`<div class="group pad"><div class="hrow"><span>Productos<small>${a.items.map(i=>i.qty+' × '+esc(i.name)).join(' · ')}</small></span><b>${fmt(pt)}</b></div><div class="hrow"><span><b>Total a cobrar</b></span><b id="dt">${fmt(a.price+pt)}</b></div></div>`:''}`})()}
  <div class="field"><label>Medio de pago</label><div class="seg" id="dp"><button class="on" data-v="efectivo">Efectivo</button><button data-v="transferencia">Transferencia</button></div></div>
  <p class="err" id="de"></p><button class="btn primary" onclick="doDone('${id}')">Confirmar</button>`);
  document.querySelectorAll('#dp button').forEach(b=>b.onclick=()=>document.querySelectorAll('#dp button').forEach(x=>x.classList.toggle('on',x===b)));
}
function dtot(p){const e=$('dt');if(e)e.textContent=fmt((+$('da').value||0)+p)}
async function doDone(id){try{await post('/appt/done',{id,serviceId:$('ds').value,amount:$('da').value,pay:document.querySelector('#dp .on').dataset.v});closeSheet();AG=null;await load();draw();toast('Servicio registrado')}catch(e){$('de').textContent=e.message}}
async function setSt(id,status){
  if(!await confirmD(status==='no_show'?'¿Marcar este turno como "No asistió"?':'¿Cancelar este turno?',status==='no_show'?'Marcar':'Cancelar turno',true))return;
  const a=findAppt(id);
  try{await post('/appt/status',{id,status});AG=null;await load();draw();
    if(status==='cancelled'&&a&&a.kind==='turno'&&a.whatsapp&&await dlg({title:'Turno cancelado',msg:'¿Querés avisarle al cliente por WhatsApp?',ok:'Avisar',cancel:'No hace falta'}))window.open(`https://wa.me/${formatWA(a.whatsapp)}?text=${encodeURIComponent('¡Hola '+a.cname.split(' ')[0]+'! Tuvimos que cancelar tu turno de '+(a.date?'el '+dm(a.date):'hoy')+' a las '+a.time+'. Escribinos y lo reprogramamos.')}`,'_blank');
    else toast('Turno actualizado')}catch(e){alertD(e.message)}
}

/* ---- Ganancias del barbero ---- */
function vGan(){
  const E=M.earn,c=n=>n+' corte'+(n===1?'':'s');
  return `<h1 class="title">Ganancias</h1><section class="today"><div class="d">Hoy · ${c(E.today.n)}</div><div class="big">${fmt(E.today.c)}</div><div class="sub" style="margin-top:4px">Facturaste ${fmt(E.today.t)}</div></section>
  <div class="stats">${[['week','Esta semana'],['month','Este mes']].map(([k,l])=>`<div class="stat"><small>${l} · ${c(E[k].n)}</small><b>${fmt(E[k].c)}</b><small>Facturaste ${fmt(E[k].t)}</small></div>`).join('')}</div>
  <p class="hint" style="margin-top:14px">Tu porcentaje se calcula sobre lo que cobrás en cada servicio.</p>`;
}

/* ---- Equipo (dueño y socio) ---- */
function vEq(){
  const tot=A.team.reduce((s,x)=>s+x.today.t,0),n=A.team.reduce((s,x)=>s+x.today.n,0);
  return `<h1 class="title">Equipo</h1><section class="today"><div class="d">Hoy · ${n} corte${n===1?'':'s'} en total</div><div class="big">${fmt(tot)}</div><div class="sub" style="margin-top:4px">Facturado por toda la barbería</div></section>
  ${A.team.map(s=>sec(esc(s.name),s.role==='owner'?'Dueño':s.active===false?'De baja':'Barbero',`<div class="group pad">${[['today','Hoy'],['week','Semana'],['month','Mes']].map(([k,l])=>`<div class="hrow"><span>${l}<small>${s[k].n} corte${s[k].n===1?'':'s'}</small></span><span style="text-align:right"><b>${fmt(s[k].t)}</b>${s.role==='owner'?'':`<small>le toca ${fmt(s[k].c)}</small>`}</span></div>`).join('')}${s.role==='owner'?'':`<div class="hrow"><span>Pagado este mes<small>Falta ${fmt(Math.max(0,s.month.c-s.paid))}</small></span><span style="text-align:right"><b>${fmt(s.paid)}</b></span></div><button class="btn" style="margin-top:8px" onclick="paySheet('${s.id}')">Registrar pago</button>`}</div>`)).join('')}`;
}

function paySheet(id){const s=A.team.find(x=>x.id===id);sheet(`<h2>Pago a ${esc(s.name)}</h2><p class="sub">Comisión del mes: ${fmt(s.month.c)} · ya pagado ${fmt(s.paid)}</p><div class="field"><label>Monto pagado</label><input id="pa" type="number" inputmode="numeric" value="${Math.max(0,s.month.c-s.paid)}"></div><p class="err" id="pe"></p><button class="btn primary" onclick="doPay('${id}')">Registrar</button>`)}
async function doPay(id){try{await post('/admin/payout',{staff:id,amount:$('pa').value});closeSheet();await load();draw();toast('Pago registrado')}catch(e){$('pe').textContent=e.message}}

/* ---- Clientes ---- */
const ago=d=>d?Math.floor((new Date(A.today)-new Date(d))/864e5):0;
const FL={all:['Todos',c=>1],old:['Hace tiempo',c=>c.visits>0&&ago(c.last_visit)>=30],bd:['Cumple este mes',c=>!!c.birthday&&c.birthday.slice(5,7)===A.today.slice(5,7)],ns:['Faltan seguido',c=>c.no_shows>=2]};
const cards=()=>{const l=A.clients.filter(c=>FL[fl][1](c)&&(c.name+c.whatsapp).toLowerCase().includes(q.toLowerCase()));return l.map(c=>`<button class="lrow" onclick="cliSheet('${c.id}')"><span class="avatar">${esc(initials(c.name))}</span><span class="main"><b>${esc(c.name)}${c.birthday&&c.birthday.slice(5)===A.today.slice(5)?' 🎂':''}</b><small>${c.visits} visita${c.visits===1?'':'s'} · última ${esc(c.last_visit||'—')}</small></span><span class="chev">${ico('chev')}</span></button>`).join('')||'<div class="empty"><b>Sin resultados</b></div>'};
function vCli(){return `<h1 class="title">Clientes</h1><p class="sub" style="margin:-8px 0 14px">${A.clients.length} registrados</p><div class="seg" style="margin-bottom:12px;flex-wrap:wrap">${Object.keys(FL).map(k=>`<button class="${fl===k?'on':''}" onclick="fl='${k}';draw()">${FL[k][0]}</button>`).join('')}</div><input class="search" placeholder="Buscar por nombre o WhatsApp" value="${esc(q)}" oninput="q=this.value;$('cl').innerHTML=cards()"><div class="group" id="cl">${cards()}</div>`}
function wa(c){
  const n=esc(c.name.split(' ')[0]),b=A.settings.name,T=[['Gracias por venir',`¡Hola ${c.name.split(' ')[0]}! Gracias por venir a ${b}. ¡Te esperamos pronto!`],['Cumpleaños',`¡Feliz cumpleaños ${c.name.split(' ')[0]}! 🎂 De parte de todos en ${b}.`],['Hace que no venís',`¡Hola ${c.name.split(' ')[0]}! Hace un tiempo que no te vemos por ${b}. ¿Te reservamos un turno?`],['Recordar turno',`¡Hola ${c.name.split(' ')[0]}! Te recordamos tu turno en ${b}. Si no podés venir, avisanos.`]];
  return T.map(([l,m])=>`<a class="btn" style="display:block;text-align:center;margin-bottom:8px" target="_blank" rel="noopener" href="https://wa.me/${formatWA(c.whatsapp)}?text=${encodeURIComponent(m)}">${l}</a>`).join('');
}
function cliSheet(id){
  const c=A.clients.find(x=>x.id===id);
  sheet(`<div class="center"><span class="avatar lg" style="margin:0 auto">${esc(initials(c.name))}</span><h2 style="margin-top:12px">${esc(c.name)}</h2><p class="sub">${esc(displayWA(c.whatsapp))}</p></div>
  <div class="cstats" style="grid-template-columns:repeat(3,1fr)"><div><b>${c.visits}</b><small>Visitas</small></div><div><b>${c.no_shows}</b><small>No asistió</small></div><div><b>${fmt(c.total_spent)}</b><small>Gastado</small></div></div>
  <div class="hrow" style="margin-top:12px"><span>Última visita</span><b>${esc(c.last_visit||'—')}</b></div><div class="hrow"><span>Cumpleaños</span><b>${dm(c.birthday)}</b></div>
  ${c.debt?`<div class="group pad" style="margin-top:12px"><div class="hrow"><span><b style="color:var(--bad)">Debe ${fmt(c.debt)}</b><small>Cancelación a último momento</small></span><button class="btn" onclick="feePaid('${c.id}')">Registrar cobro</button></div></div>`:''}
  ${c.notes?`<div class="cnote" style="margin-top:12px">${ico('book')} ${esc(c.notes)}</div>`:''}
  <button class="btn" style="width:100%;margin-top:12px" onclick="cliEdit('${c.id}')">Editar datos</button>
  <p class="sub" style="margin:16px 0 8px">Escribirle por WhatsApp</p>${wa(c)}`);
}

/* ---- Finanzas y configuración ---- */
function vFin(){
  const m=A.month;
  return `<h1 class="title">Finanzas</h1><section class="today"><div class="d">Este mes · ganancia neta</div><div class="big">${fmt(m.net)}</div></section>
  <button class="btn primary" style="width:100%;margin-top:14px" onclick="sumImage()">Generar resumen del día</button>
  <div class="group pad" style="margin-top:14px"><div class="hrow"><span>Ingresos${m.products||m.fees?`<small>${[m.products?'incluye '+fmt(m.products)+' de productos':'',m.fees?fmt(m.fees)+' de cancelaciones cobradas':''].filter(Boolean).join(' · ')}</small>`:''}</span><b>${fmt(m.income)}</b></div><div class="hrow"><span>Comisiones a pagar</span><b>− ${fmt(m.commissions)}</b></div><div class="hrow"><span>Gastos</span><b>− ${fmt(m.expenses)}</b></div></div>
  ${sec('Últimos 14 días','',`<div class="group pad">${chart14()}</div>`)}
  ${m.byPay&&(m.byPay.efectivo||m.byPay.transferencia)?sec('Por medio de pago','Este mes',`<div class="group pad">${[['efectivo','Efectivo'],['transferencia','Transferencia']].map(([k,l])=>{const tot=m.byPay.efectivo+m.byPay.transferencia;return `<div class="hrow"><span>${l}<small>${tot?Math.round(m.byPay[k]*100/tot):0}%</small></span><b>${fmt(m.byPay[k])}</b></div>`}).join('')}</div>`):''}
  ${A.sales&&A.sales.length?sec('Productos vendidos','Este mes',`<div class="group pad">${A.sales.map(s=>`<div class="hrow"><span>${esc(s.name)}<small>${s.u} unidad${s.u===1?'':'es'}</small></span><b>${fmt(s.t)}</b></div>`).join('')}</div>`):''}
  ${sec('Cierre de caja','Efectivo de hoy',`<div class="group pad"><div class="hrow"><span>Cobrado en efectivo hoy</span><b>${fmt(A.cash)}</b></div><div class="field"><label>Contado en caja</label><input id="cc" type="number" inputmode="numeric" oninput="const d=+this.value-A.cash;$('cd').textContent=this.value===''?'':d===0?'Caja justa':(d>0?'Sobran ':'Faltan ')+fmt(Math.abs(d))"></div><p class="hint" id="cd" style="font-weight:600"></p></div>`)}
  ${sec('Cargar un gasto','',`<div class="group pad"><div class="field" style="margin-top:0"><label>Concepto</label><input id="gc" placeholder="Ej.: alquiler, insumos"></div><div class="field"><label>Categoría</label><select id="gk">${['Alquiler','Insumos','Servicios','Publicidad','Sueldos','Otros'].map(c=>`<option>${c}</option>`).join('')}</select></div><div class="field"><label>Monto</label><input id="gm" type="number" inputmode="numeric"></div><p class="err" id="ge"></p><button class="btn primary" onclick="addExp()">Guardar gasto</button></div>`)}
  ${Object.keys(m.byCat||{}).length?sec('Gastos por categoría','Este mes',`<div class="group pad">${Object.entries(m.byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="hrow"><span>${esc(k)}<small>${m.expenses?Math.round(v*100/m.expenses):0}%</small></span><b>${fmt(v)}</b></div>`).join('')}</div>`):''}
  ${A.expenses.length?sec('Gastos del mes','',`<div class="group pad">${A.expenses.map(e=>`<div class="hrow"><span>${esc(e.concept)}<small>${esc(e.category||'Otros')} · ${esc(e.date)}</small></span><b>${fmt(e.amount)}</b></div>`).join('')}</div>`):''}
`;
}
const svNames=p=>p.service_id?p.service_id.split(',').map(i=>(M.services.find(s=>s.id===i)||{}).name).filter(Boolean).join(' · '):'—';
const pst=p=>!p.active?'Pausada':(A.now>=p.start&&A.now<p.end)?'Activa ahora':A.now<p.start?'Programada':'Finalizada';
function pcard(p){const s=pst(p);return `<div class="pcard ${s==='Activa ahora'?'on':''}"><div class="ph2"><span class="pbd">${p.kind==='2x1'?'2×1':p.pct+'% OFF'}</span><span class="pst">${s}</span></div><b class="pnm">${esc(p.title)}</b><small>${esc(svNames(p))}</small><small>${esc(p.start.replace('T',' '))} → ${esc(p.end.replace('T',' '))}</small>${p.message?`<div class="pmsg">${esc(p.message)}</div>`:''}<div class="pact"><button onclick="promoSheet('${p.id}')">Editar</button><button onclick="togPromo('${p.id}')">${p.active?'Pausar':'Activar'}</button><button class="bad" onclick="delPromo('${p.id}')">Borrar</button></div></div>`}
function vCfg(){const S=A.settings;return `<h1 class="title">Ajustes</h1>${PUSH.card('card')}
  ${sec('Datos de la barbería','',`<div class="group"><button class="lrow" onclick="shopSheet()"><span class="main"><b>${esc(S.name)}</b><small>${esc(S.address||'Sin dirección')} · ${esc(S.phone||'Sin teléfono')}</small><small>Comisión de los barberos: ${S.commission}%</small></span><span class="chev">${ico('chev')}</span></button></div>`)}
  ${sec('Horarios de atención','',`<div class="group"><button class="lrow" onclick="hSheet()"><span class="main"><b>Días y horarios</b><small>${esc(schedText(S.schedule))}</small><small>Se puede reservar hasta ${S.book_days} día${S.book_days===1?'':'s'} (contando hoy)</small></span><span class="chev">${ico('chev')}</span></button></div>`)}
  ${sec('Cancelaciones','',`<div class="group"><button class="lrow" onclick="lateSheet()"><span class="main"><b>${S.late_mode==='off'?'Sin aviso especial':S.late_mode==='fee'?'Cobro del '+S.late_pct+'% si cancelan con menos de '+S.late_hours+' h':'Aviso si cancelan con menos de '+S.late_hours+' h'}</b><small>Qué pasa cuando un cliente cancela sobre la hora</small></span><span class="chev">${ico('chev')}</span></button></div>`)}
  ${sec('Equipo',String(A.staff_all.filter(s=>s.active).length),`<div class="group">${A.staff_all.map(s=>`<button class="lrow" onclick="staffSheet('${s.id}')"><span class="main"><b>${esc(s.name)}</b><small>${s.role==='owner'?'Dueño':'Barbero'}${s.role!=='owner'&&s.comm!=null?' · '+s.comm+'%':''}${s.active?'':' · De baja'}</small></span><span class="chev">${ico('chev')}</span></button>`).join('')}</div><button class="btn" style="margin-top:10px;width:100%" onclick="staffSheet()">+ Agregar barbero</button>`)}
  ${sec('Seguridad','',`<div class="group"><button class="lrow" onclick="pinSheet()"><span class="main"><b>Cambiar mi PIN</b></span><span class="chev">${ico('chev')}</span></button><button class="lrow" onclick="secSheet()"><span class="main"><b>Pregunta de seguridad</b><small>${S.security.set?esc(S.security.question):'Sin configurar · hace falta para recuperar el PIN'}</small></span><span class="chev">${ico('chev')}</span></button><button class="lrow" onclick="rstSheet()"><span class="main"><b>Restablecer el PIN de un barbero</b></span><span class="chev">${ico('chev')}</span></button></div>`)}
  ${sec('Productos',String(M.products.length),`<div class="group">${M.products.map(p=>`<button class="lrow" onclick="prodSheet('${p.id}')"><span class="main"><b>${esc(p.name)}</b><small>${fmt(p.price)} · ${stockLabel(p)}${p.active?'':' · Oculto'}</small></span><span class="chev">${ico('chev')}</span></button>`).join('')}</div><button class="btn" style="margin-top:10px;width:100%" onclick="prodSheet()">+ Agregar producto</button>`)}
  ${sec('Servicios',M.services.length+'',`<div class="group">${M.services.map(s=>`<button class="lrow" onclick="svcSheet('${s.id}')"><span class="main"><b>${esc(s.name)}</b><small>${fmt(s.price)} · ${s.duration} min${s.addon?' · Adicional':''}${s.online?'':' · Solo en el local'}</small></span><span class="chev">${ico('chev')}</span></button>`).join('')}</div><button class="btn" style="margin-top:10px;width:100%" onclick="svcSheet()">+ Agregar servicio</button>`)}
  ${sec('Promociones',A.promos.length+'',`${A.promos.map(pcard).join('')||'<div class="group"><div class="empty"><b>Sin promociones</b></div></div>'}<button class="btn primary" style="margin-top:12px;width:100%" onclick="promoSheet()">Nueva promoción</button>`)}
  ${sec('QR del local','Para imprimir',`<div class="group pad"><a class="btn primary" style="display:block;text-align:center" target="_blank" href="/gestion/qr.html">Ver QR de la fila</a></div>`)}`}
function shopSheet(){const S=A.settings;setTimeout(logoDraw,0);sheet(`<h2>Datos de la barbería</h2><div class="field"><label>Nombre</label><input id="sn" value="${esc(S.name)}"></div><div class="field"><label>Dirección</label><input id="sa" value="${esc(S.address)}"></div><div class="field"><label>Teléfono</label><input id="sp" value="${esc(S.phone)}"></div><div class="field"><label>Instagram (sin @)</label><input id="si" value="${esc(S.instagram||'')}"></div><div class="field"><label>Logo</label><div id="lgp"></div><input type="file" id="lgf" accept="image/*" hidden onchange="logoPick(this)"><button class="btn" type="button" onclick="$('lgf').click()">Elegir logo</button> <button class="btn" type="button" id="lgr" style="color:var(--bad)" onclick="logoSet('')">Quitar</button></div><div class="field"><label>Porcentaje de los barberos (%)</label><input id="sc" type="number" inputmode="numeric" value="${S.commission}"></div><p class="err" id="se"></p><button class="btn primary" onclick="saveShop()">Guardar</button>`)}
async function saveShop(){try{await post('/admin/settings',{name:$('sn').value,address:$('sa').value,phone:$('sp').value,instagram:$('si').value,commission:$('sc').value});closeSheet();await load();draw();toast('Datos guardados')}catch(e){$('se').textContent=e.message}}
let SVP,SVX;/* SVP: undefined = foto sin cambios · '' = quitar · id = foto nueva */
const vphDraw=()=>{const id=SVP===undefined?SVX.photo:SVP;$('vph').innerHTML=id?`<img src="/api/img/${id}" alt="" style="width:100%;max-height:170px;object-fit:cover;border-radius:12px;margin-bottom:8px">`:'';$('vrm').style.display=id?'inline-block':'none'};
function shrink(file,max,keep){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{const k=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);if(keep&&file.type==='image/png'){const p=c.toDataURL('image/png');if(p.length<600000)return res(p)}let q=.85,d=c.toDataURL('image/jpeg',q);while(d.length>600000&&q>.4){q-=.1;d=c.toDataURL('image/jpeg',q)}res(d)};img.onerror=()=>rej(new Error('No se pudo leer la foto'));img.src=u})}
async function svcPhoto(inp){const f=inp.files[0];if(!f)return;try{$('ve').textContent='Subiendo foto…';const r=await post('/admin/image',{data:await shrink(f,800)});SVP=r.id;$('ve').textContent='';vphDraw()}catch(e){$('ve').textContent=e.message}}
function svcSheet(id){SVX=id?M.services.find(s=>s.id===id):{name:'',price:'',duration:30,description:'',photo:null,online:1,addon:0,addon_to:''};SVP=undefined;const x=SVX,mains=M.services.filter(s=>!s.addon&&s.id!==id),at=(x.addon_to||'').split(',');
  sheet(`<h2>${id?'Editar':'Nuevo'} servicio</h2><div class="field"><label>Nombre</label><input id="vn" value="${esc(x.name)}"></div><div class="field"><label>Precio</label><input id="vp" type="number" inputmode="numeric" value="${x.price}"></div><div class="field"><label>Duración (minutos)</label><input id="vd" type="number" inputmode="numeric" value="${x.duration}"></div>
  <div class="field"><label>Descripción (opcional)</label><textarea id="vx" rows="2" maxlength="200" placeholder="Qué incluye">${esc(x.description||'')}</textarea></div>
  <div class="field"><label>Foto (opcional)</label><div id="vph"></div><input type="file" id="vf" accept="image/*" hidden onchange="svcPhoto(this)"><button class="btn" type="button" onclick="$('vf').click()">Elegir foto</button> <button class="btn" type="button" id="vrm" style="color:var(--bad)" onclick="SVP='';vphDraw()">Quitar</button></div>
  <label class="hhead" style="margin:12px 0"><input type="checkbox" id="vo" ${x.online?'checked':''}><b>Se puede reservar online</b></label>
  <label class="hhead" style="margin:12px 0"><input type="checkbox" id="va" ${x.addon?'checked':''} onchange="$('vat').style.display=this.checked?'block':'none'"><b>Es un adicional (se suma a otro servicio)</b></label>
  <div id="vat" style="display:${x.addon?'block':'none'}"><p class="hint">Se ofrece junto a los servicios que marques. Si no marcás ninguno, se ofrece con todos.</p>${mains.map(m=>`<label class="hhead"><input type="checkbox" class="vat" value="${m.id}" ${at.includes(m.id)?'checked':''}> ${esc(m.name)}</label>`).join('')}</div>
  <p class="err" id="ve"></p><button class="btn primary" onclick="saveSvc('${id||''}')">Guardar</button>${id?`<button class="btn" style="margin-top:10px;width:100%;color:var(--bad)" onclick="delSvc('${id}')">Eliminar servicio</button>`:''}`);vphDraw()}
async function saveSvc(id){try{await post('/admin/service',{id:id||null,name:$('vn').value,price:$('vp').value,duration:$('vd').value,description:$('vx').value,photo:SVP,online:$('vo').checked,addon:$('va').checked,addon_to:[...document.querySelectorAll('.vat:checked')].map(x=>x.value)});closeSheet();await load();draw();toast('Servicio guardado')}catch(e){$('ve').textContent=e.message}}
async function delSvc(id){if(!await confirmD('¿Eliminar este servicio? Los turnos ya hechos se conservan.','Eliminar',true))return;try{await post('/admin/service/del',{id});closeSheet();await load();draw()}catch(e){alertD(e.message)}}
function promoSheet(id){const p=id?A.promos.find(x=>x.id===id):null,ck=new Set(p&&p.service_id?p.service_id.split(','):[]),k=p?p.kind:'pct';
  sheet(`<h2>${p?'Editar':'Nueva'} promoción</h2><div class="field"><label>Nombre</label><input id="pn" value="${esc(p?p.title:'')}" placeholder="Ej.: Semana del padre"></div>
  <div class="field"><label>Servicios <a href="#" onclick="document.querySelectorAll('.pv').forEach(x=>x.checked=true);return false" style="float:right;color:var(--gold-ink)">Marcar todos</a></label><div class="svpick">${M.services.map(s=>`<label class="svi"><input type="checkbox" class="pv" value="${s.id}" ${ck.has(s.id)?'checked':''}><span><b>${esc(s.name)}</b><small>${fmt(s.price)} · ${s.duration} min</small></span></label>`).join('')}</div></div>
  <div class="field"><label>Tipo</label><select id="pk" onchange="$('pp').disabled=this.value==='2x1'"><option value="pct" ${k==='pct'?'selected':''}>Descuento por porcentaje</option><option value="2x1" ${k==='2x1'?'selected':''}>2×1 (dos personas, precio de una)</option></select></div>
  <div class="field"><label>Porcentaje de descuento</label><input id="pp" type="number" inputmode="numeric" value="${p&&p.kind==='pct'?p.pct:10}" ${k==='2x1'?'disabled':''}></div>
  <div class="field"><label>Desde</label><input id="pd" type="datetime-local" value="${p?p.start:A.today+'T09:00'}"></div><div class="field"><label>Hasta</label><input id="ph" type="datetime-local" value="${p?p.end:A.today+'T23:59'}"></div>
  <div class="field"><label>Texto que verá el cliente</label><textarea id="pm" rows="2" placeholder="Ej.: Solo viernes y sábado">${esc(p&&p.message||'')}</textarea></div><p class="err" id="pe2"></p><button class="btn primary" onclick="savePromo('${id||''}')">Guardar</button>`)}
async function savePromo(id){try{await post('/admin/promo',{id:id||null,title:$('pn').value,kind:$('pk').value,pct:$('pp').value,services:[...document.querySelectorAll('.pv:checked')].map(x=>x.value),start:$('pd').value,end:$('ph').value,message:$('pm').value});closeSheet();await load();draw();toast('Promoción guardada')}catch(e){$('pe2').textContent=e.message}}
async function togPromo(id){await post('/admin/promo/toggle',{id});await load();draw()}
async function delPromo(id){if(!await confirmD('¿Borrar esta promoción?','Borrar',true))return;await post('/admin/promo/del',{id});await load();draw()}
async function addExp(){try{await post('/admin/expense',{concept:$('gc').value,category:$('gk').value,amount:$('gm').value});await load();draw();toast('Gasto guardado')}catch(e){$('ge').textContent=e.message}}

/* ---- Agenda: turnos manuales, mover/editar y bloqueos ---- */
const addDay=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
async function loadAg(){AG=await api('/agenda?date='+(agDate||M.today)+(M.me.role==='owner'?'&staff='+agStaff:''));agDate=AG.date}
function agGo(n){agDate=addDay(AG.date,n);AG=null;draw()}
function agSet(d){if(!d)return;agDate=d;AG=null;draw()}
const canDelBlk=b=>M.me.role==='owner'||b.staff_id===M.me.id;
const blkCard=b=>`<div class="group pad blk"><div class="hrow"><span><b>${ico('block')} ${b.staff_id?esc(b.sname):'Toda la barbería'}</b><small>${b.d1===b.d2?longDate(b.d1):dm(b.d1)+' al '+dm(b.d2)}${b.t1?' · '+b.t1+'–'+b.t2:' · todo el día'}${b.note?' · '+esc(b.note):''}</small></span>${canDelBlk(b)?`<button class="glassbtn" onclick="delBlk('${b.id}')" aria-label="Quitar bloqueo">${ico('x')}</button>`:''}</div></div>`;
function vAg(){
  if(!AG){loadAg().then(()=>{if(tab==='ag')draw()}).catch(e=>alertD(e.message));return '<h1 class="title">Agenda</h1><div class="group pad"><p class="hint">Cargando…</p></div>'}
  const d=AG.date,owner=M.me.role==='owner',dayB=AG.blocks.filter(b=>b.d1<=d&&b.d2>=d),later=AG.blocks.filter(b=>!(b.d1<=d&&b.d2>=d));
  return `<h1 class="title">Agenda</h1>
  <div class="agnav"><button class="glassbtn" onclick="agGo(-1)" aria-label="Día anterior">${ico('chevL')}</button><label class="agd"><b>${longDate(d)}</b><input type="date" value="${d}" onchange="agSet(this.value)"></label><button class="glassbtn" onclick="agGo(1)" aria-label="Día siguiente">${ico('chev')}</button></div>
  ${d!==AG.today?`<button class="btn" style="width:100%;margin-bottom:10px" onclick="agSet('${AG.today}')">Ir a hoy</button>`:''}
  ${owner?`<div class="field" style="margin-top:0"><label>Barbero</label><select onchange="agStaff=this.value;AG=null;draw()"><option value="all">Todos</option>${A.team.filter(s=>s.active!==false).map(s=>`<option value="${s.id}" ${agStaff===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div>`:''}
  <div class="row2"><button class="btn primary" onclick="newSheet()">+ Turno</button><button class="btn" onclick="blkSheet()">Bloquear</button></div>
  ${dayB.map(blkCard).join('')}
  ${sec('Turnos',String(AG.appts.length),AG.appts.length?AG.appts.map(a=>ev(a,true)).join(''):'<div class="group"><div class="empty"><b>Sin turnos este día</b></div></div>')}
  ${later.length?sec('Otros bloqueos',String(later.length),later.map(blkCard).join('')):''}`;
}
const svOpts=sel=>M.services.filter(s=>!s.addon).map(s=>`<option value="${s.id}" ${s.id===sel?'selected':''}>${esc(s.name)} · ${fmt(s.price)}</option>`).join('');
const exBoxes=sel=>{const ad=M.services.filter(s=>s.addon);return ad.length?`<div class="field"><label>Adicionales</label>${ad.map(a=>`<label class="hhead"><input type="checkbox" class="exs" value="${a.id}" ${sel.includes(a.id)?'checked':''} onchange="exCalc()"><span>${esc(a.name)} · +${fmt(a.price)}</span></label>`).join('')}</div>`:''};
const exSel=()=>[...document.querySelectorAll('.exs:checked')].map(x=>x.value);
function exCalc(){const s=M.services.find(x=>x.id===($('ns')||$('ms')).value),p=$('np')||$('mp');p.value=(s?s.price:0)+exSel().reduce((t,id)=>t+(M.services.find(x=>x.id===id)||{price:0}).price,0)}
const prodBoxes=cur=>{const P=(M.products||[]).filter(p=>p.active||cur[p.id]);return P.length?`<div class="field"><label>Productos (se descuentan del stock)</label>${P.map(p=>`<div class="hrow" style="gap:8px;margin:6px 0"><span>${esc(p.name)}<small>${fmt(p.price)} · ${p.track?(p.stock+(cur[p.id]||0)>0?'Quedan '+(p.stock+(cur[p.id]||0)):'Sin stock'):'Sin control de stock'}</small></span><input class="pq" data-id="${p.id}" type="number" inputmode="numeric" min="0" max="10" value="${cur[p.id]||0}" style="width:64px"></div>`).join('')}</div>`:''};
const pqSel=()=>[...document.querySelectorAll('.pq')].map(i=>({id:i.dataset.id,qty:Math.round(+i.value)||0})).filter(x=>x.qty>0);
const stOpts=sel=>A.team.filter(s=>s.active!==false).map(s=>`<option value="${s.id}" ${s.id===sel?'selected':''}>${esc(s.name)}</option>`).join('');
function newSheet(){const owner=M.me.role==='owner';
  sheet(`<h2>Cargar un turno</h2>${owner?`<div class="field"><label>Barbero</label><select id="nb">${stOpts(agStaff!=='all'?agStaff:M.me.id)}</select></div>`:''}
  <div class="field"><label>Servicio</label><select id="ns" onchange="exCalc()">${svOpts()}</select></div>${exBoxes([])}${prodBoxes({})}
  <div class="field"><label>Día</label><input id="nd" type="date" min="${M.today}" value="${AG?AG.date:M.today}"></div><div class="field"><label>Hora</label><input id="nh" type="time"></div>
  <div class="field"><label>Nombre del cliente</label><input id="nn" autocomplete="off"></div><div class="field"><label>WhatsApp</label><div class="pair"><input class="prefix" value="+54 9" disabled aria-label="Prefijo"><input id="nw" inputmode="tel" placeholder="2477 201614"></div></div>
  <div class="field"><label>Precio</label><input id="np" type="number" inputmode="numeric" value="${(M.services.find(s=>!s.addon)||{}).price||''}"></div><p class="err" id="ne"></p><button class="btn primary" onclick="saveNew()">Guardar turno</button>`)}
async function saveNew(force){const b={staff:($('nb')||{}).value,service:$('ns').value,extras:exSel(),products:pqSel(),date:$('nd').value,time:$('nh').value,name:$('nn').value,whatsapp:formatWA($('nw').value),price:$('np').value,force:!!force};
  try{await post('/appt/create',b);closeSheet();AG=null;await load();draw();toast('Turno cargado')}
  catch(e){if(e.data&&e.data.soft){if(await confirmD(e.message+' ¿Cargarlo igual?','Cargar igual'))return saveNew(true)}else $('ne').textContent=e.message}}
function moveSheet(id){const a=findAppt(id),t=a.kind==='turno',owner=M.me.role==='owner';
  sheet(`<h2>${esc(a.cname)}</h2><p class="sub">${t?'Cambiá el día, la hora, el servicio o el precio.':'Cambiá el servicio o el precio.'}</p>
  <div class="field"><label>Servicio</label><select id="ms" onchange="exCalc()">${svOpts(a.service_id)}</select></div>${exBoxes(JSON.parse(a.extras||'[]').map(x=>x.id))}${prodBoxes(Object.fromEntries((a.items||[]).map(i=>[i.product_id,i.qty])))}
  <div class="field"><label>Precio</label><input id="mp" type="number" inputmode="numeric" value="${a.price}"></div>
  ${t?`${owner?`<div class="field"><label>Barbero</label><select id="mb">${stOpts(a.staff_id||M.me.id)}</select></div>`:''}<div class="field"><label>Día</label><input id="md" type="date" min="${M.today}" value="${a.date||M.today}"></div><div class="field"><label>Hora</label><input id="mh" type="time" value="${esc(a.time)}"></div>`:''}
  <p class="err" id="me2"></p><button class="btn primary" onclick="saveMove('${id}')">Guardar cambios</button>`)}
async function saveMove(id,force){const a=findAppt(id),b={id,service:$('ms').value,extras:exSel(),products:pqSel(),price:$('mp').value,force:!!force};if($('md')){b.date=$('md').value;b.time=$('mh').value;if($('mb'))b.staff=$('mb').value}
  try{const r=await post('/appt/move',b);closeSheet();AG=null;AFF=AFF.filter(x=>x.id!==id);await load();draw();
    if(r.moved&&await dlg({title:'Turno movido',msg:'Al cliente le llega un aviso si activó las notificaciones. ¿Querés avisarle también por WhatsApp?',ok:'Avisar',cancel:'No hace falta'}))window.open(`https://wa.me/${formatWA(a.whatsapp)}?text=${encodeURIComponent('¡Hola '+a.cname.split(' ')[0]+'! Tuvimos que mover tu turno: ahora es el '+dm(b.date)+' a las '+b.time+'. Cualquier cosa avisanos.')}`,'_blank');
    else toast('Turno actualizado');
    if(AFF.length)affSheet()}
  catch(e){if(e.data&&e.data.soft){if(await confirmD(e.message+' ¿Guardarlo igual?','Guardar igual'))return saveMove(id,true)}else $('me2').textContent=e.message}}
function blkSheet(){const owner=M.me.role==='owner';
  sheet(`<h2>Bloquear días u horarios</h2><p class="hint">Sirve para vacaciones, trámites o lo que haga falta. Nadie va a poder reservar en ese lapso.</p>
  ${owner?`<div class="field"><label>Quién</label><select id="bq"><option value="all">Toda la barbería</option>${stOpts('')}</select></div>`:''}
  <div class="field"><label>Desde el día</label><input id="bd1" type="date" min="${M.today}" value="${AG?AG.date:M.today}"></div><div class="field"><label>Hasta el día (opcional)</label><input id="bd2" type="date" min="${M.today}"></div>
  <label class="hhead" style="margin:12px 0"><input type="checkbox" id="ball" checked onchange="$('btm').style.display=this.checked?'none':'block'"><b>Todo el día</b></label>
  <div id="btm" style="display:none"><div class="hrng"><input type="time" id="bt1"><span>a</span><input type="time" id="bt2"></div></div>
  <div class="field"><label>Motivo (opcional)</label><input id="bn" placeholder="Ej.: vacaciones, trámite"></div><p class="err" id="be"></p><button class="btn primary" onclick="saveBlk()">Bloquear</button>`)}
async function saveBlk(){try{const all=$('ball').checked,r=await post('/block',{staff:($('bq')||{}).value,from:$('bd1').value,to:$('bd2').value||$('bd1').value,t1:all?'':$('bt1').value,t2:all?'':$('bt2').value,note:$('bn').value});
  closeSheet();AG=null;await load();draw();AFF=r.affected;if(AFF.length)affSheet();else toast('Bloqueo guardado')}catch(e){$('be').textContent=e.message}}
function affSheet(){sheet(`<h2>Turnos afectados</h2><p class="hint">El bloqueo quedó guardado, pero estos turnos caen adentro. Movelos o cancelalos.</p>${AFF.map(a=>`<div class="group pad" style="margin-bottom:8px"><b>${esc(a.cname)}</b><small>${dm(a.date)} ${esc(a.time)} · ${esc(a.service_name)}${M.me.role==='owner'?' · '+esc(a.sname):''}</small><div class="evacts"><button class="go" onclick="moveSheet('${a.id}')">Mover</button><button class="bad" onclick="cancelAff('${a.id}')">Cancelar</button></div></div>`).join('')}<button class="btn" style="margin-top:6px;width:100%" onclick="closeSheet()">Lo resuelvo después</button>`)}
async function cancelAff(id){if(!await confirmD('¿Cancelar este turno? Al cliente le llega un aviso si activó las notificaciones.','Cancelar turno',true))return;try{await post('/appt/status',{id,status:'cancelled'});AFF=AFF.filter(x=>x.id!==id);AG=null;await load();draw();AFF.length?affSheet():(closeSheet(),toast('Turnos resueltos'))}catch(e){alertD(e.message)}}
async function delBlk(id){if(!await confirmD('¿Quitar este bloqueo? Ese horario vuelve a estar disponible.','Quitar'))return;try{await post('/block/del',{id});AG=null;draw();toast('Bloqueo quitado')}catch(e){alertD(e.message)}}

/* ---- Notificaciones, notas y datos de clientes, resumen diario ---- */
const ntime=s=>{const d=new Date(s.replace(' ','T')+'Z'),t=d.toLocaleDateString('en-CA',{timeZone:AR}),h=hh(s);return t===M.today?h:dm(t)+' '+h};
async function notifSheet(){try{const r=await api('/notifs');badge(r.unread);
  sheet(`<h2>Notificaciones</h2>${r.unread?`<button class="btn" style="width:100%;margin-bottom:10px" onclick="readAll()">Marcar todas como leídas</button>`:''}<div class="group">${r.items.length?r.items.map(n=>`<button class="lrow ${n.seen?'':'unread'}" onclick="readOne('${n.id}')"><span class="main"><b style="white-space:pre-line;font-weight:${n.seen?500:700}">${esc(n.body)}</b><small>${esc(ntime(n.created_at))}</small></span>${n.seen?'':'<span class="udot"></span>'}</button>`).join(''):'<div class="empty"><b>Sin notificaciones</b></div>'}</div>`)}catch(e){alertD(e.message)}}
async function readOne(id){await post('/notifs/read',{id});M.notif=Math.max(0,(M.notif||0)-1);notifSheet()}
async function readAll(){await post('/notifs/read',{all:true});M.notif=0;notifSheet()}
function noteSheet(cid,aid){const a=findAppt(aid);sheet(`<h2>Nota de ${esc(a.cname)}</h2><p class="hint">La ven todos los barberos cuando atienden a este cliente. Ej.: "máquina 2 a los costados".</p><div class="field"><textarea id="nt" rows="3" maxlength="300">${esc(a.notes||'')}</textarea></div><p class="err" id="nte"></p><button class="btn primary" onclick="saveNote('${cid}')">Guardar</button>`)}
async function saveNote(cid){try{await post('/client/note',{id:cid,notes:$('nt').value});closeSheet();AG=null;await load();draw();toast('Nota guardada')}catch(e){$('nte').textContent=e.message}}
function cliEdit(id){const c=A.clients.find(x=>x.id===id),w9=formatWA(c.whatsapp);
  sheet(`<h2>Editar cliente</h2><div class="field"><label>Nombre</label><input id="cn" value="${esc(c.name)}"></div><div class="field"><label>WhatsApp</label><div class="pair"><input class="prefix" value="+54 9" disabled aria-label="Prefijo"><input id="cw" inputmode="tel" value="${esc(w9.length===13?w9.slice(3):c.whatsapp)}"></div></div><div class="field"><label>Cumpleaños (opcional)</label><input id="cb" type="date" value="${esc(c.birthday||'')}"></div><div class="field"><label>Notas</label><textarea id="cx" rows="3" maxlength="300">${esc(c.notes||'')}</textarea></div><p class="err" id="ce"></p><button class="btn primary" onclick="saveCli('${id}')">Guardar</button>`)}
async function saveCli(id){try{await post('/admin/client',{id,name:$('cn').value,whatsapp:formatWA($('cw').value),birthday:$('cb').value,notes:$('cx').value});closeSheet();await load();draw();toast('Cliente actualizado')}catch(e){$('ce').textContent=e.message}}
setInterval(()=>{if(M&&document.visibilityState==='visible'&&!$('overlay').classList.contains('show'))api('/notifs?count=1').then(r=>badge(r.unread)).catch(()=>{})},30000);

/* ---- Productos y stock ---- */
let PRP,PRX;/* PRP: undefined = foto sin cambios · '' = quitar · id = foto nueva */
const stockLabel=p=>!p.track?'Sin control de stock':p.stock<=0?'Sin stock':'Quedan '+p.stock+(p.stock<=p.low?' · pocas':'');
const prDraw=()=>{const id=PRP===undefined?PRX.photo:PRP;$('pph').innerHTML=id?`<img src="/api/img/${id}" alt="" style="width:100%;max-height:170px;object-fit:cover;border-radius:12px;margin-bottom:8px">`:'';$('prm').style.display=id?'inline-block':'none'};
async function prodPhoto(inp){const f=inp.files[0];if(!f)return;try{$('pe').textContent='Subiendo foto…';const r=await post('/admin/image',{data:await shrink(f,800)});PRP=r.id;$('pe').textContent='';prDraw()}catch(e){$('pe').textContent=e.message}}
function prodSheet(id){PRX=id?M.products.find(p=>p.id===id):{name:'',description:'',price:'',stock:0,track:1,low:3,comm_pct:0,active:1,photo:null};PRP=undefined;const x=PRX;
  sheet(`<h2>${id?'Editar':'Nuevo'} producto</h2><div class="field"><label>Nombre</label><input id="pn" value="${esc(x.name)}"></div>
  <div class="field"><label>Descripción (opcional)</label><textarea id="pd" rows="2" maxlength="200">${esc(x.description||'')}</textarea></div>
  <div class="field"><label>Precio</label><input id="ppr" type="number" inputmode="numeric" value="${x.price}"></div>
  <label class="hhead" style="margin:12px 0"><input type="checkbox" id="ptk" ${x.track?'checked':''} onchange="$('pstk').style.display=this.checked?'block':'none'"><b>Controlar stock</b></label>
  <div id="pstk" style="display:${x.track?'block':'none'}">${id?`<div class="group pad" style="margin-bottom:10px"><div class="hrow"><span>Stock actual</span><b id="pcur">${x.stock}</b></div><div class="field"><label>Cantidad</label><input id="pq" type="number" inputmode="numeric" min="0" value="1"></div><div class="evacts"><button class="go" onclick="stockAdj('${id}','add')">Sumar</button><button class="bad" onclick="stockAdj('${id}','sub')">Restar</button><button onclick="stockAdj('${id}','set')">Fijar</button></div></div>`:`<div class="field"><label>Stock inicial</label><input id="pst" type="number" inputmode="numeric" min="0" value="${x.stock}"></div>`}
  <div class="field"><label>Avisarme cuando queden (unidades)</label><input id="plw" type="number" inputmode="numeric" min="0" value="${x.low}"></div></div>
  <div class="field"><label>Comisión del barbero al vender este producto (%)</label><input id="pcm" type="number" inputmode="numeric" min="0" max="100" value="${x.comm_pct}"><p class="hint">0 = no cobra comisión.</p></div>
  <div class="field"><label>Foto (opcional)</label><div id="pph"></div><input type="file" id="pf" accept="image/*" hidden onchange="prodPhoto(this)"><button class="btn" type="button" onclick="$('pf').click()">Elegir foto</button> <button class="btn" type="button" id="prm" style="color:var(--bad)" onclick="PRP='';prDraw()">Quitar</button></div>
  <label class="hhead" style="margin:12px 0"><input type="checkbox" id="pac" ${x.active?'checked':''}><b>Visible en la reserva</b></label>
  <p class="err" id="pe"></p><button class="btn primary" onclick="saveProd('${id||''}')">Guardar</button>${id?`<button class="btn" style="margin-top:10px;width:100%;color:var(--bad)" onclick="delProd('${id}')">Eliminar producto</button>`:''}`);prDraw()}
async function saveProd(id){try{await post('/admin/product',{id:id||null,name:$('pn').value,description:$('pd').value,price:$('ppr').value,track:$('ptk').checked,stock:$('pst')?$('pst').value:undefined,low:$('plw').value,comm_pct:$('pcm').value,active:$('pac').checked,photo:PRP});closeSheet();await load();draw();toast('Producto guardado')}catch(e){$('pe').textContent=e.message}}
async function stockAdj(id,op){try{const r=await post('/admin/product/stock',{id,op,qty:$('pq').value});$('pcur').textContent=r.stock;await load();toast('Stock actualizado')}catch(e){$('pe').textContent=e.message}}
async function delProd(id){if(!await confirmD('¿Eliminar este producto? Los turnos que ya lo tienen lo conservan.','Eliminar',true))return;try{await post('/admin/product/del',{id});closeSheet();await load();draw()}catch(e){alertD(e.message)}}

/* ---- Equipo: alta y baja de barberos ---- */
function staffSheet(id){const x=id?A.staff_all.find(s=>s.id===id):{name:'',role:'barber',active:1};
  sheet(`<h2>${id?'Editar':'Nuevo'} ${x.role==='owner'?'dueño':'barbero'}</h2><div class="field"><label>Nombre</label><input id="tn" value="${esc(x.name)}" maxlength="40" autocomplete="off"></div>${x.role==='owner'?'':`<div class="field"><label>Comisión (%)</label><input id="tc" type="number" inputmode="numeric" min="0" max="100" value="${x.comm==null?'':x.comm}" placeholder="General: ${A.settings.commission}"><p class="hint">Dejalo vacío para usar el porcentaje general.</p></div>`}${id?'':`<div class="field"><label>PIN inicial (4 números)</label><input id="tp" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><p class="hint">Después cada uno puede cambiarlo desde su cuenta.</p></div>`}<p class="err" id="te"></p><button class="btn primary" onclick="saveStaff('${id||''}')">Guardar</button>${id&&x.role!=='owner'?`<button class="btn" style="margin-top:10px;width:100%;${x.active?'color:var(--bad)':''}" onclick="staffActive('${id}',${x.active?0:1})">${x.active?'Dar de baja':'Reactivar'}</button>`:''}`)}
async function saveStaff(id){try{await post('/admin/staff',{id:id||null,name:$('tn').value,comm:$('tc')?$('tc').value:undefined,pin:$('tp')?$('tp').value:undefined});closeSheet();await load();draw();toast('Guardado')}catch(e){$('te').textContent=e.message}}
async function staffActive(id,on){if(!on&&!await confirmD('Deja de poder entrar y de aparecer para reservar. Sus datos y ganancias se conservan. Puede reactivarse después.','Dar de baja',true))return;try{await post('/admin/staff/active',{id,active:!!on});closeSheet();await load();draw();toast(on?'Reactivado':'Dado de baja')}catch(e){alertD(e.message,'No se pudo')}}

/* ---- Cancelaciones, logo, cobros y gráfico ---- */
function lateSheet(){const S=A.settings;sheet(`<h2>Cancelaciones sobre la hora</h2><p class="hint">Qué pasa cuando un cliente cancela su turno desde la web con poca anticipación.</p>
  ${[['off','No hacer nada'],['warn','Solo avisarle al cliente (y al equipo)'],['fee','Avisar y registrar un cobro']].map(([k,l])=>`<label class="hhead" style="margin:10px 0"><input type="radio" name="lm" value="${k}" ${S.late_mode===k?'checked':''}><b>${l}</b></label>`).join('')}
  <div class="field"><label>Se considera "sobre la hora" si faltan menos de (horas)</label><input id="lh" type="number" inputmode="numeric" min="1" max="48" value="${S.late_hours}"></div>
  <div class="field"><label>Cobro (% del servicio)</label><input id="lp" type="number" inputmode="numeric" min="1" max="100" value="${S.late_pct}"></div>
  <p class="hint">El cobro queda como deuda del cliente; se muestra en su ficha y en sus próximos turnos hasta que lo registres como cobrado.</p><p class="err" id="lte"></p><button class="btn primary" onclick="saveLate()">Guardar</button>`)}
async function saveLate(){try{await post('/admin/late',{mode:(document.querySelector('input[name=lm]:checked')||{}).value,hours:$('lh').value,pct:$('lp').value});closeSheet();await load();draw();toast('Guardado')}catch(e){$('lte').textContent=e.message}}
async function feePaid(cid){if(!await confirmD('¿Registrar que el cliente pagó la cancelación? Se suma a los ingresos del mes.','Registrar cobro'))return;try{await post('/fees/paid',{client:cid});closeSheet();AG=null;await load();draw();toast('Cobro registrado')}catch(e){alertD(e.message)}}
const logoDraw=()=>{const l=A&&A.settings.logo,p=$('lgp');if(!p)return;p.innerHTML=l?`<img src="/api/img/${l}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:50%;margin-bottom:8px">`:'';$('lgr').style.display=l?'inline-block':'none'};
async function logoPick(inp){const f=inp.files[0];if(!f)return;try{$('se').textContent='Subiendo logo…';const r=await post('/admin/image',{data:await shrink(f,512,true)});await logoSet(r.id)}catch(e){$('se').textContent=e.message}}
async function logoSet(id){try{await post('/admin/logo',{image:id});await load();A=await api('/admin');$('se')&&($('se').textContent='');logoDraw();draw()}catch(e){$('se')&&($('se').textContent=e.message)}}
function chart14(){const D=A.daily||[],mx=Math.max(1,...D.map(x=>x.t));return `<div style="display:flex;align-items:flex-end;gap:4px;height:110px">${D.map(x=>`<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%" title="${esc(dm(x.d))}: ${fmt(x.t)}"><div style="height:${Math.max(x.t?4:1,Math.round(x.t*100/mx))}%;background:${x.d===M.today?'var(--gold,#d4af5a)':'rgba(212,175,90,.45)'};border-radius:4px 4px 0 0"></div></div>`).join('')}</div><div style="display:flex;gap:4px;margin-top:4px">${D.map(x=>`<small style="flex:1;text-align:center;font-size:9px;opacity:.7">${x.d.slice(8)}</small>`).join('')}</div><div class="hrow" style="margin-top:8px"><span>Total de los 14 días</span><b>${fmt(D.reduce((t,x)=>t+x.t,0))}</b></div>`}

/* ---- Resumen del día en imagen ---- */
let SUMB=null;
const rr=(x,a,b,w,h,r,f)=>{x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h);x.fillStyle=f;x.fill()};
async function sumImage(){try{
  const d=await api('/admin/summary'),W=1080,nb=d.by.length,H=Math.max(1350,1120+nb*92+(d.products.u?110:0)),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),F='system-ui,-apple-system,Segoe UI,Roboto,sans-serif',T=(t,px,y,col,al,wt)=>{x.font=(wt||'600')+' '+px+'px '+F;x.fillStyle=col;x.textAlign=al||'center';x.fillText(t,al==='left'?70:al==='right'?W-70:W/2,y)};
  x.fillStyle='#111214';x.fillRect(0,0,W,H);x.fillStyle='#d4af5a';x.fillRect(0,0,W,14);
  let y=120;
  {try{const im=new Image();im.src=A.settings.logo?'/api/img/'+A.settings.logo:'/logo.png';await new Promise((ok,no)=>{im.onload=ok;im.onerror=no});x.save();x.beginPath();x.arc(W/2,110,60,0,7);x.clip();x.drawImage(im,W/2-60,50,120,120);x.restore();y=240}catch(e){}}
  T(A.settings.name,y>200?50:56,y,'#ffffff','center','700');y+=64;
  const f=new Date(d.date+'T12:00:00Z').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'});T(f.charAt(0).toUpperCase()+f.slice(1),36,y,'#9a9aa0','center','500');y+=70;
  rr(x,60,y,W-120,300,36,'#1c1d21');T('TOTAL DEL DÍA',30,y+70,'#9a9aa0','center','600');T(fmt(d.total),128,y+190,'#d4af5a','center','800');T(d.n?d.n+' servicio'+(d.n===1?'':'s'):'Sin servicios registrados',34,y+260,'#ffffff','center','500');y+=340;
  [['Efectivo',d.ef],['Transferencia',d.tr]].forEach(([l,v],i)=>{const a=60+i*((W-150)/2+30);rr(x,a,y,(W-150)/2,170,28,'#1c1d21');x.textAlign='center';x.font='500 30px '+F;x.fillStyle='#9a9aa0';x.fillText(l,a+(W-150)/4,y+62);x.font='700 54px '+F;x.fillStyle='#ffffff';x.fillText(fmt(v),a+(W-150)/4,y+130)});y+=230;
  if(nb){T('POR BARBERO',28,y,'#9a9aa0','left','700');y+=26;d.by.forEach(b=>{x.fillStyle='#2a2b30';x.fillRect(70,y,W-140,2);y+=62;T(b.name,40,y,'#ffffff','left','600');T(b.n+' · '+fmt(b.t),40,y,'#d4af5a','right','600');y+=30});y+=40}
  if(d.products.u){rr(x,60,y,W-120,100,28,'#1c1d21');T('Productos · '+d.products.u+' unidad'+(d.products.u===1?'':'es'),34,y+62,'#ffffff','left','500');T(fmt(d.products.t),38,y+64,'#d4af5a','right','700');y+=140}
  [['Cancelados',d.cancelled],['No asistió',d.noShow],['Sin cerrar',d.open]].forEach(([l,v],i)=>{const w3=(W-180)/3,a=60+i*(w3+30);rr(x,a,y,w3,150,28,'#1c1d21');x.textAlign='center';x.font='800 58px '+F;x.fillStyle=v&&l==='Sin cerrar'?'#ff9f0a':'#ffffff';x.fillText(String(v),a+w3/2,y+75);x.font='500 28px '+F;x.fillStyle='#9a9aa0';x.fillText(l,a+w3/2,y+122)});y+=200;
  T('Mañana: '+d.tomorrow+' turno'+(d.tomorrow===1?'':'s'),36,y,'#ffffff','center','500');
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));SUMB={blob,name:'resumen-'+d.date+'.png'};
  sheet(`<h2>Resumen del día</h2><img src="${URL.createObjectURL(blob)}" alt="Resumen del día" style="width:100%;border-radius:14px"><div class="row2"><button class="btn primary" onclick="sumShare()">Compartir</button><button class="btn" onclick="sumDl()">Descargar</button></div><p class="hint">En el celular también podés mantener apretada la imagen para guardarla.</p>`)
 }catch(e){alertD(e.message||'No se pudo generar la imagen')}}
function sumDl(){const a=document.createElement('a');a.href=URL.createObjectURL(SUMB.blob);a.download=SUMB.name;document.body.appendChild(a);a.click();a.remove()}
async function sumShare(){const f=new File([SUMB.blob],SUMB.name,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'Resumen del día'})}catch(e){}}else sumDl()}

/* ---- Horarios, PIN y seguridad ---- */
const DN=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],DS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],DO=[1,2,3,4,5,6,0];
const rtxt=r=>r.map(x=>x[0]+'–'+x[1]).join(' y ');
function schedText(S){const t=d=>(S[d]||[]).length?rtxt(S[d]):'Cerrado',out=[];let i=0;while(i<7){const d=DO[i];let j=i;while(j+1<7&&t(DO[j+1])===t(d))j++;out.push((i===j?DS[d]:DS[d]+' a '+DS[DO[j]])+': '+t(d));i=j+1}return out.join(' · ')}
function hSheet(){const S=A.settings.schedule||{};
  sheet(`<h2>Horarios de atención</h2>${DO.map(d=>{const r=S[d]||[],a=r[0]||['09:00','13:00'],b=r[1];return `<div class="hday"><label class="hhead"><input type="checkbox" id="ho${d}" ${r.length?'checked':''}><b>${DN[d]}</b></label><div class="hrng"><input type="time" id="ha${d}" value="${a[0]}"><span>a</span><input type="time" id="hb${d}" value="${a[1]}"></div><div class="hrng"><input type="time" id="hc${d}" value="${b?b[0]:''}"><span>a</span><input type="time" id="hd${d}" value="${b?b[1]:''}"></div></div>`}).join('')}
  <p class="hint">La segunda franja es opcional (por ejemplo, la tarde). Dejala vacía si no corta al mediodía.</p>
  <div class="field"><label>Ofrecer turnos cada</label><select id="hstep">${[5,10,15,20,30,60].map(m=>`<option value="${m}" ${A.settings.slot_step===m?'selected':''}>${m} minutos</option>`).join('')}</select></div>
  <div class="field"><label>Días para reservar (contando hoy)</label><input id="hdays" type="number" inputmode="numeric" min="1" max="30" value="${A.settings.book_days}"></div><p class="err" id="he"></p><button class="btn primary" onclick="saveSched()">Guardar</button>`)}
async function saveSched(){try{const sch={};DO.forEach(d=>{if(!$('ho'+d).checked)return;const r=[[$('ha'+d).value,$('hb'+d).value]];if($('hc'+d).value||$('hd'+d).value)r.push([$('hc'+d).value,$('hd'+d).value]);sch[d]=r});
  const x=await post('/admin/schedule',{schedule:sch,book_days:$('hdays').value,step:$('hstep').value});closeSheet();await load();draw();
  if(x.outside)alertD(`Quedaron ${x.outside} turno${x.outside===1?'':'s'} reservado${x.outside===1?'':'s'} fuera del horario nuevo. Revisalos en Mi día.`,'Horarios guardados');else toast('Horarios guardados')}catch(e){$('he').textContent=e.message}}
function weakBanner(){return `<div class="group pad" style="margin-bottom:12px"><b>Tu PIN es el de ejemplo</b><p class="hint">Cambialo ahora para que nadie más pueda entrar.</p><button class="btn primary" onclick="pinSheet()">Cambiar PIN</button></div>`}
function vMi(){return `<h1 class="title">Cuenta</h1>${PUSH.card('card')}<div class="group"><button class="lrow" onclick="pinSheet()"><span class="main"><b>Cambiar mi PIN</b><small>4 números</small></span><span class="chev">${ico('chev')}</span></button></div><p class="hint" style="margin-top:10px">Si te olvidás el PIN, pedile al dueño que lo restablezca.</p>`}
function pinSheet(){sheet(`<h2>Cambiar mi PIN</h2><div class="field"><label>PIN actual</label><input id="pc" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><div class="field"><label>PIN nuevo (4 números)</label><input id="pn1" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><div class="field"><label>Repetí el PIN nuevo</label><input id="pn2" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><p class="err" id="pe"></p><button class="btn primary" onclick="savePin()">Guardar</button>`)}
async function savePin(){try{if($('pn1').value!==$('pn2').value)throw new Error('Los dos PIN nuevos no coinciden');await post('/pin/change',{current:$('pc').value,pin:$('pn1').value});closeSheet();await load();draw();toast('PIN cambiado')}catch(e){$('pe').textContent=e.message}}
function secSheet(){const S=A.settings;sheet(`<h2>Pregunta de seguridad</h2><p class="hint">Sirve para recuperar tu PIN si lo olvidás. Elegí algo que solo vos sepas.</p><div class="field"><label>Pregunta</label><input id="sq" value="${esc(S.security.question)}" placeholder="Ej.: ¿Cómo se llamaba mi primera mascota?"></div><div class="field"><label>Respuesta ${S.security.set?'(dejala vacía para mantener la actual)':''}</label><input id="sa2" autocomplete="off"></div><div class="field"><label>Intentos de PIN antes de bloquear</label><input id="sx" type="number" inputmode="numeric" value="${S.pin_max}"></div><div class="field"><label>Minutos de bloqueo</label><input id="sl" type="number" inputmode="numeric" value="${S.pin_lock}"></div><p class="err" id="sec"></p><button class="btn primary" onclick="saveSec()">Guardar</button>`)}
async function saveSec(){try{await post('/admin/security',{question:$('sq').value,answer:$('sa2').value,pin_max:$('sx').value,pin_lock:$('sl').value});closeSheet();await load();draw();toast('Seguridad guardada')}catch(e){$('sec').textContent=e.message}}
function rstSheet(){const b=A.team.filter(s=>s.role!=='owner'&&s.active!==false);sheet(`<h2>Restablecer PIN</h2><div class="field"><label>Barbero</label><select id="rs">${b.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>PIN nuevo (4 números)</label><input id="rn" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><p class="err" id="re2"></p><button class="btn primary" onclick="saveRst()">Guardar</button>`)}
async function saveRst(){try{await post('/admin/staff-pin',{staff:$('rs').value,pin:$('rn').value});closeSheet();toast('PIN restablecido. Avisale al barbero')}catch(e){$('re2').textContent=e.message}}
async function forgot(){const p=await api('/public'),me=p.staff.find(s=>s.id===$('ls').value);
  if(!me||me.role!=='owner'){alertD('Pedile al dueño que te restablezca el PIN desde Ajustes → Seguridad.','Olvidé mi PIN');return}
  const r=await api('/recover-info');
  if(!r.question){alertD('Todavía no hay una pregunta de seguridad configurada, así que el PIN no se puede recuperar desde acá.','Recuperar PIN');return}
  sheet(`<h2>Recuperar PIN</h2><p class="hint">${esc(r.question)}</p><div class="field"><label>Tu respuesta</label><input id="ra" autocomplete="off"></div><div class="field"><label>PIN nuevo (4 números)</label><input id="rp" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><p class="err" id="rce"></p><button class="btn primary" onclick="doRecover()">Cambiar PIN</button>`)}
async function doRecover(){try{await post('/recover',{answer:$('ra').value,pin:$('rp').value});closeSheet();toast('PIN cambiado. Ya podés entrar')}catch(e){$('rce').textContent=e.message}}

setInterval(()=>{if(M&&tab==='dia'&&!$('overlay').classList.contains('show')&&!document.querySelector('.dlg')&&document.visibilityState==='visible'){const b=new Set(M.day.map(a=>a.id));load().then(()=>{if(M.day.some(a=>!b.has(a.id))){toast('Nuevo turno o cliente en la fila');try{navigator.vibrate&&navigator.vibrate(200)}catch(e){}}draw()}).catch(()=>{})}},15000);
boot();

/* ---- Avisos push: al llegar uno (o volver a la app) se actualiza la campana y, si no hay nada abierto, la pantalla ---- */
PUSH.onchange=()=>{if(M&&!$('overlay').classList.contains('show')&&['dia','mi','cfg'].includes(tab))draw()};
function pushRefresh(){if(!M)return;api('/notifs?count=1').then(r=>badge(r.unread)).catch(()=>{});
  if($('overlay').classList.contains('show')||!['dia','ag'].includes(tab))return;
  load().then(()=>{if(tab==='ag'){AG=null;return loadAg().then(draw)}draw()}).catch(()=>{})}
if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.type==='push')pushRefresh()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pushRefresh()});
