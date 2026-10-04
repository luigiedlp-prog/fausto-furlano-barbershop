/* Animaciones de la página de reservas. Se desactivan solas si el celular pide "reducir movimiento". */
(function(){
  var calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var app=document.getElementById('app');if(!app)return;

  // 3) Las secciones aparecen en cascada al llegar a la pantalla
  var io=calm||!('IntersectionObserver' in window)?null:new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      io.unobserve(e.target);e.target.classList.add('in');
      setTimeout(function(){e.target.classList.add('done')},1600);
    });
  },{threshold:.08,rootMargin:'0px 0px -6% 0px'});

  // 6) Contador: los números suben hasta su valor
  function count(el,from,to,fmt){
    if(calm||from===to){el.textContent=fmt(to);return}
    var t0=performance.now(),dur=650;
    (function step(t){
      var k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);
      el.textContent=fmt(Math.round(from+(to-from)*e));
      if(k<1)requestAnimationFrame(step);
    })(t0);
  }
  var lastPrice=null,lastKeys={};

  function scan(){
    if(io)app.querySelectorAll('.sec:not(.rv)').forEach(function(s){s.classList.add('rv');io.observe(s)});

    // 4) Al elegir un servicio o barbero: foto con rebote y tilde que se dibuja
    ['svcs','stf'].forEach(function(id){
      var box=document.getElementById(id);if(!box)return;
      var on=box.querySelector('.svc.on'),key=on?(on.querySelector('b')||{}).textContent||'':'';
      if(key&&key!==lastKeys[id]&&lastKeys[id]!==undefined&&!calm)on.classList.add('fresh');
      lastKeys[id]=key;
    });

    app.querySelectorAll('.cnt:not([data-fx])').forEach(function(el){
      el.setAttribute('data-fx','1');
      var to=parseInt(el.getAttribute('data-to'),10)||0;
      count(el,0,to,String);
    });

    var pr=document.querySelector('.dock .top .pr');
    if(pr&&!pr.hasAttribute('data-fx')){
      pr.setAttribute('data-fx','1');
      var to=parseInt(pr.textContent.replace(/\D/g,''),10)||0;
      if(lastPrice!==null&&lastPrice!==to&&!calm){var f=lastPrice;pr.classList.add('tick');count(pr,f,to,window.fmt||String)}
      lastPrice=to;
    }
  }
  new MutationObserver(scan).observe(app,{childList:true,subtree:true});
  scan();
})();
