// Service worker: app instalable + avisos push (mismo sistema que Melly Barber y BarberFlowBR). Nunca guarda /api (siempre datos en vivo).
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(_){d={body:e.data?e.data.text():''}}
  e.waitUntil((async()=>{
    await self.registration.showNotification(d.title||'Barbería',{body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',tag:d.tag||undefined,data:{url:d.url||'/'}});
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
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.pathname.startsWith('/api/'))return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok&&u.origin===location.origin){const c=r.clone();caches.open('bp1').then(k=>k.put(e.request,c))}return r}).catch(()=>caches.match(e.request)))});
