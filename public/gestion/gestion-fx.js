/* Gestión FX · lo propio del panel: poste, cascada al cambiar de pestaña, números que suben y cinta al registrar un servicio. Requiere fx-base.js */
(function(){
  var R=document.documentElement,app=document.getElementById('app'),FX=window.FX;if(!app||!FX)return;
  var calm=FX.calm;
  var bar=document.querySelector('.bar');
  if(bar&&!calm)bar.insertAdjacentHTML('afterend','<div class="fx-pole" aria-hidden="true"><i></i></div>');
  var last=null,tm;
  function tag(){
    var k={};app.querySelectorAll('.appt,.stat,.pcard,.bw,div[title]').forEach(function(e){
      var g=e.matches('div[title]')?'t':e.className.split(' ')[0];k[g]=(k[g]||0);if(k[g]<14)e.style.setProperty('--i',k[g]);k[g]++;
    });
  }
  function counters(){
    if(calm)return;
    app.querySelectorAll('.today .m b,.big,.stat b,.cstats b').forEach(function(el){
      if(el.dataset.fx)return;el.dataset.fx=1;
      var m=el.textContent.match(/^(\D*)(\d[\d.]*)(\D*)$/);if(!m)return;
      var to=parseInt(m[2].replace(/\./g,''),10);if(!(to>0))return;
      var t0=performance.now(),d=Math.min(1100,520+String(to).length*90),dot=m[2].indexOf('.')>-1;
      (function st(t){var k=Math.min(1,(t-t0)/d),v=Math.round(to*(1-Math.pow(1-k,4)));
        el.textContent=m[1]+(dot?v.toLocaleString('es-AR'):v)+m[3];if(k<1)requestAnimationFrame(st)})(t0);
    });
  }
  new MutationObserver(function(){
    var t=document.querySelector('.tab.active'),key=t?t.textContent:'login',fresh=key!==last;last=key;
    tag();
    var long=/Clientes|Finanzas/.test(key)||app.querySelectorAll('.hrow,.lrow').length>30;R.classList.toggle('fx-long',long);
    if(fresh&&!calm){if(!long)app.classList.add('fx-go');clearTimeout(tm);tm=setTimeout(function(){app.classList.remove('fx-go')},1700)}
    counters();
  }).observe(app,{childList:true});


  // Al registrar un servicio: la tijera corta la cinta
  addEventListener('fx:toast',function(e){if(/registrado/i.test(e.detail.text)){e.detail.handled=true;FX.ribbon()}});
})();
