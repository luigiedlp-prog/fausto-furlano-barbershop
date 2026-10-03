/* Barbería Pergamino  utilidades compartidas (reserva + gestin) */
(function(W){
'use strict';
W.$=id=>document.getElementById(id);
W.fmt=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n||0));
W.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
W.api=async function(url,opt){
  const r=await fetch('/api'+url,opt);let j={};try{j=await r.json()}catch(e){}
  if(!r.ok)throw Object.assign(new Error(j.error||'Error'),{data:j,status:r.status});
  return j;
};
W.post=(url,body)=>api(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{})});

/* conos (trazo, estilo SF Symbols) */
const IC={
bell:'<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',
cal:'<rect x="3" y="5" width="18" height="16" rx="3.5"/><path d="M8 3v4M16 3v4M3 10h18"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.2.7 3.5 2.6 3.5 5.7"/>',
chart:'<path d="M5 20v-9M12 20V5M19 20v-12"/>',
scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
chev:'<path d="m9 6 6 6-6 6"/>',
chevL:'<path d="m15 6-6 6 6 6"/>',
check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
x:'<path d="M6 6l12 12M18 6 6 18"/>',
phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
pin:'<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
edit:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
share:'<path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
copy:'<rect x="9" y="9" width="11" height="11" rx="3"/><path d="M5 15V7a2 2 0 0 1 2-2h8"/>',
block:'<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
noshow:'<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c0-3.6 2.9-6 6.5-6"/><path d="m15.5 15.5 5 5M20.5 15.5l-5 5"/>',
lock:'<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
out:'<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9"/>',
spark:'<path d="M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9Z"/><path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
tag:'<path d="M3 12V4h8l10 10-8 8Z"/><circle cx="7.5" cy="8.5" r="1.2"/>',
wa:'<path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8L4 20Z"/>',
wallet:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14.5h2"/>',
book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
cake:'<path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6Z"/><path d="M12 12V8M12 5.5c1-1 1-2 0-3-1 1-1 2 0 3Z"/>'
,gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>'
};
const FILLED=new Set(['bell','cal','clock','users','chart','pin','lock','copy','block','noshow','phone','wa','scissors','spark','tag','wallet','book','cake']);
W.ico=n=>`<svg class="i${FILLED.has(n)?' f':''}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]||''}</svg>`;

/* WhatsApp argentino */
W.formatWA=function(v){let d=String(v||'').replace(/\D/g,'');if(d.startsWith('549')&&d.length===13)return d;if(d.startsWith('54')&&d.length===12)return '549'+d.slice(2);if(d.startsWith('9')&&d.length===11)return '54'+d;if(d.length===10)return '549'+d;return d};
W.displayWA=function(v){let d=formatWA(v);return d.length===13?'+54 9 '+d.slice(3,7)+' '+d.slice(7):(v||'')};
W.durationText=n=>n>=60?`${Math.floor(n/60)} h${n%60?' '+n%60+' min':''}`:`${n} min`;
W.longDate=d=>new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(String(d).slice(0,10)+'T12:00:00')).replace(/^./,x=>x.toUpperCase());
W.initials=n=>String(n||'').trim().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'BP';

/* Tema claro/oscuro (se recuerda en el celular) */
(function(){const r=document.documentElement,m=document.querySelector('meta[name=theme-color]');
 const paint=x=>{r.dataset.theme=x;if(m)m.content=x==='dark'?'#0c0c0e':'#f6f3ec';const b=document.getElementById('themeBtn');if(b)b.textContent=x==='dark'?'☀':'☾'};
 W.toggleTheme=()=>{const x=r.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('bp_theme',x)}catch(e){}paint(x)};
 const mk=()=>{if(document.getElementById('themeBtn'))return;const b=document.createElement('button');b.id='themeBtn';b.className='glassbtn';b.setAttribute('aria-label','Cambiar entre modo claro y oscuro');b.onclick=W.toggleTheme;const bar=document.querySelector('.bar');if(bar)bar.appendChild(b);else{b.style.cssText='position:fixed;top:12px;right:12px;z-index:9';document.body.appendChild(b)}paint(r.dataset.theme||'light')};
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mk):mk()})();
/* Avisos push (mismo sistema que Melly Barber y BarberFlowBR; necesitan los secrets VAPID en Cloudflare) */
(function(){
const ua=navigator.userAgent||'',isIOS=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone===true;
const b64=s=>{s=String(s).replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);const r=atob(s),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u};
const P=W.PUSH={state:'checking',key:null,staff:false,wa:'',onchange:null};
const box=(t,p,b)=>`<div class="group pad" style="margin-bottom:12px"><b>${t}</b><p class="hint">${p}</p>${b||''}</div>`;
const T=()=>P.staff?{offT:'Activá los avisos',offP:'Recibí en este celular tus turnos nuevos, cancelaciones y un recordatorio 1 hora antes de cada turno.',onP:'Este celular recibe los avisos de tus turnos.'}:{offT:'Recibí avisos de tu turno',offP:'Te avisamos 1 hora antes de tu turno y si se cancela o se mueve.',onP:'Te vamos a avisar 1 hora antes de tu turno.'};
// kind 'banner': solo si falta activar. kind 'card': estado completo con prueba y desactivar.
P.card=function(kind){
  const s=P.state,t=T(),card=kind==='card';
  if(s==='off')return box(t.offT,t.offP,'<button class="btn primary" onclick="PUSH.enable().catch(e=>alertD(e.message))">Activar avisos</button>');
  if(s==='ios-install')return box('Instalá la app para recibir avisos','En iPhone los avisos funcionan desde la pantalla de inicio: tocá <b>Compartir</b> (el cuadrado con la flecha) → <b>Agregar a inicio</b> y abrí la página desde ese ícono.');
  if(s==='on')return card?box('Avisos activados',t.onP,(P.staff?'<button class="btn" onclick="PUSH.test()">Enviar aviso de prueba</button>':'')+'<button class="btn" style="margin-top:8px" onclick="PUSH.disable()">Desactivar avisos en este celular</button>'):'';
  if(!card)return '';
  if(s==='denied')return box('Avisos bloqueados','Las notificaciones de este sitio están bloqueadas. Activalas desde los ajustes del teléfono o del navegador y volvé a abrir esta página.');
  if(s==='off-server')return box('Avisos','Todavía no están configurados en el servidor.');
  if(s==='unsupported')return box('Avisos','Este navegador no permite recibir avisos. Probá con Chrome en Android, o desde la pantalla de inicio en iPhone.');
  return '';
};
const changed=()=>{try{P.onchange&&P.onchange()}catch(e){}};
P.init=async function(staff){
  P.staff=!!staff;
  try{
    if(!('serviceWorker'in navigator)){P.state=isIOS&&!standalone?'ios-install':'unsupported';return changed()}
    if(!('PushManager'in window)||!('Notification'in window)){P.state=isIOS&&!standalone?'ios-install':'unsupported';return changed()}
    P.key=(await api('/push-key')).key;
    if(!P.key){P.state='off-server';return changed()}
    if(Notification.permission==='denied'){P.state='denied';return changed()}
    const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    P.state=sub&&Notification.permission==='granted'?'on':'off';
    // Si ya estaba activado, se vuelve a registrar en el servidor con la sesión actual (así el celular siempre es de quien está adentro).
    if(P.state==='on'&&(P.staff||P.wa))post('/push-sub',{sub:sub.toJSON(),wa:P.wa}).catch(()=>{});
  }catch(e){P.state='unsupported'}
  changed();
};
P.enable=async function(wa){
  if(wa)P.wa=wa;
  if(!P.staff&&String(P.wa||'').replace(/\D/g,'').length<8)throw new Error('Primero escribí tu WhatsApp.');
  if(!P.key){const k=await api('/push-key');P.key=k.key;if(!P.key)throw new Error('Los avisos todavía no están configurados.')}
  if(!('serviceWorker'in navigator&&'PushManager'in window))throw new Error('Este navegador no soporta avisos. En iPhone instalá primero la app (Compartir → Agregar a inicio).');
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){P.state=perm==='denied'?'denied':'off';changed();throw new Error('Permiso de notificaciones denegado.')}
  const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub){
    const opts={userVisibleOnly:true,applicationServerKey:b64(P.key)};
    try{sub=await reg.pushManager.subscribe(opts)}catch(e){const old=await reg.pushManager.getSubscription();if(old)await old.unsubscribe();sub=await reg.pushManager.subscribe(opts)}
  }
  await post('/push-sub',{sub:sub.toJSON(),wa:P.wa});
  P.state='on';changed();
};
P.disable=async function(){
  try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
    if(sub){try{await post('/push-unsub',{endpoint:sub.endpoint})}catch(e){}await sub.unsubscribe()}
    P.state='off';
  }catch(e){alertD('No se pudieron desactivar los avisos: '+(e&&e.message||e))}
  changed();
};
// Al cerrar sesión el celular deja de ser de esa persona (el navegador conserva la suscripción; al entrar otra persona se re-registra a su nombre).
P.release=async function(){try{const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub)await post('/push-unsub',{endpoint:sub.endpoint})}catch(e){}};
P.test=async function(){try{const r=await post('/push-test');toast(r.sent?'Aviso enviado. Tiene que llegarte en unos segundos.':'No hay ningún celular registrado. Desactivá y volvé a activar los avisos.')}catch(e){alertD(e.message)}};
W.pushOn=wa=>P.enable(wa);
})();
/* Toast */
W.toast=function(t){const el=$('toast');if(!el)return;el.textContent=t;el.classList.add('show');clearTimeout(W.__toast);W.__toast=setTimeout(()=>el.classList.remove('show'),2300)};

/* Dilogos al estilo iOS: reemplazan alert / confirm / prompt del navegador */
W.dlg=function({title='',msg='',ok='Aceptar',cancel='',input=false,def='',ph='',danger=false}){
  return new Promise(res=>{
    const d=document.createElement('div');d.className='dlg';
    d.innerHTML=`<div class="box" role="alertdialog" aria-modal="true"><div class="body">${title?`<h3>${esc(title)}</h3>`:''}${msg?`<p>${esc(msg)}</p>`:''}${input?`<input id="dlgIn" value="${esc(def)}" placeholder="${esc(ph)}" autocomplete="off">`:''}</div><div class="acts">${cancel?`<button data-v="0">${esc(cancel)}</button>`:''}<button data-v="1" class="${danger?'bad':''}">${esc(ok)}</button></div></div>`;
    const done=v=>{d.remove();res(v)};
    d.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const yes=b.dataset.v==='1';done(input?(yes?d.querySelector('#dlgIn').value:null):yes)});
    document.body.appendChild(d);const i=d.querySelector('#dlgIn');if(i){i.focus();i.addEventListener('keydown',e=>{if(e.key==='Enter')done(i.value)})}
  });
};
W.alertD=(msg,title)=>dlg({msg,title});
W.confirmD=(msg,ok='Confirmar',danger=false)=>dlg({msg,ok,cancel:'Cancelar',danger});
W.promptD=(msg,def='',ph='')=>dlg({msg,input:true,def,ph,ok:'Aceptar',cancel:'Cancelar'});
})(window);
