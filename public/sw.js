// Service worker: app instalable + avisos push (mismo sistema que Melly Barber y BarberFlowBR). Nunca guarda /api (siempre datos en vivo).
const CACHE='bp14';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){d={body:e.data?e.data.text():''}}
  e.waitUntil((async()=>{
    await self.registration.showNotification(d.title||'Fausto Furlano Buti Barber Shop',{body:d.body||'',icon:'/icon-192.png',badge:'/badge-96.png',tag:d.tag||undefined,data:{url:d.url||'/'}});
    const cs=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    cs.forEach(c=>c.postMessage({type:'push',url:d.url||'/'}));
  })());
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=new URL((e.notification.data&&e.notification.data.url)||'/',self.location.origin);
  e.waitUntil((async()=>{
    const cs=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of cs){if(new URL(c.url).pathname.startsWith(target.pathname)&&'focus' in c)return c.focus()}
    return self.clients.openWindow(target.href);
  })());
});
// Páginas: red primero (siempre la versión nueva; sin red, la última guardada).
// CSS, JS e imágenes: salen al instante de la caché y se actualizan en segundo plano (la versión nueva se ve en la siguiente apertura).
const STATIC=/\.(?:css|js|png|webp|jpg|svg|ico|webmanifest)$/;
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/'))return;
  if(r.mode!=='navigate'&&STATIC.test(u.pathname)){
    e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(r);
      const net=fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x}).catch(()=>hit);
      if(hit){e.waitUntil(net);return hit}return net}));return}
  e.respondWith(fetch(r).then(x=>{if(x.ok){const c=x.clone();caches.open(CACHE).then(k=>k.put(r,c))}return x}).catch(()=>caches.match(r)))});
