/* FX base · fondo, vidrio, onda al tocar, reflejo, esqueleto y cinta de éxito. Compartido por todas las páginas. No toca la lógica. */
(function(){
  var R=document.documentElement,app=document.getElementById('app');if(!app)return;
  var calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var low=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=2;
  if(low||calm)R.classList.add('fx-lite');
  document.addEventListener('visibilitychange',function(){R.classList.toggle('fx-pause',document.hidden)});
  var FX=window.FX={calm:calm,low:low};

  // Fondo: aurora dorada + rayas de poste + tijera gigante
  var W='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width=".35" stroke-linecap="round"><path d="M22 3 7 17M22 21 7 7"/><circle cx="5.5" cy="18.5" r="3"/><circle cx="5.5" cy="5.5" r="3"/></svg>';
  document.body.insertAdjacentHTML('afterbegin','<div class="fx-bg" aria-hidden="true"><i class="a"></i><i class="b"></i><i class="c"></i>'+W+'</div>');

  // Tijera que corta una cinta dorada (momento de éxito)
  var SC='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" style="width:50px;height:50px"><g class="a"><path d="M22 3 7 17"/><circle cx="5.5" cy="18.5" r="3"/></g><g class="b"><path d="M22 21 7 7"/><circle cx="5.5" cy="5.5" r="3"/></g></svg>';
  FX.ribbon=function(){
    if(calm)return;
    var r=document.createElement('div');r.className='fx-rb';r.setAttribute('aria-hidden','true');
    r.innerHTML='<u class="l"></u><u class="r"></u><span class="fx-sc">'+SC+'</span>';
    document.body.appendChild(r);setTimeout(function(){r.remove()},1900);
    FX.flash(.7);
  };
  FX.flash=function(delay){
    if(calm)return;
    var f=document.createElement('div');f.className='fx-flash';f.style.animationDelay=(delay||0)+'s';document.body.appendChild(f);setTimeout(function(){f.remove()},1700);
  };

  // Onda dorada al tocar
  document.addEventListener('pointerdown',function(e){
    if(calm||!e.target.closest)return;
    var b=e.target.closest('.btn,.evacts button,.pact button,.qd,.tab,.time,.seg button');if(!b)return;
    var r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*1.6,i=document.createElement('i');
    i.className='fx-rip';i.style.cssText='width:'+s+'px;height:'+s+'px;left:'+(e.clientX-r.left-s/2)+'px;top:'+(e.clientY-r.top-s/2)+'px';
    b.appendChild(i);setTimeout(function(){i.remove()},650);
  },{passive:true});

  // Aviso de guardado: destello (cada página puede reaccionar al evento fx:toast)
  var ta=document.getElementById('toast');
  if(ta)new MutationObserver(function(){
    if(!ta.classList.contains('show')||calm)return;
    var d={text:ta.textContent,handled:false};
    dispatchEvent(new CustomEvent('fx:toast',{detail:d}));
    if(!d.handled)FX.flash(0);
  }).observe(ta,{attributes:true,attributeFilter:['class']});

  // Reflejo del vidrio: sigue la inclinación del celular (o el mouse en compu)
  if(!low&&!calm){
    var mx=30,my=0,t0=0;
    var spec=function(x,y){var n=performance.now();if(n-t0<45)return;x=Math.round(Math.max(0,Math.min(100,x)));y=Math.round(Math.max(-10,Math.min(70,y)));if(x===mx&&y===my)return;t0=n;mx=x;my=y;R.style.setProperty('--mx',x+'%');R.style.setProperty('--my',y+'%')};
    var ori=function(e){if(e.gamma==null)return;spec(50+e.gamma*1.2,(e.beta-45)*.9)};
    var on=false,listen=function(){if(on)return;on=true;addEventListener('deviceorientation',ori,{passive:true})};
    var D=window.DeviceOrientationEvent;
    if(D&&typeof D.requestPermission==='function'){
      document.addEventListener('pointerdown',function ask(){document.removeEventListener('pointerdown',ask);D.requestPermission().then(function(r){if(r==='granted')listen()}).catch(function(){})},{passive:true});
    }else if(D)listen();
    addEventListener('pointermove',function(e){if(e.pointerType==='mouse')spec(e.clientX/innerWidth*100,e.clientY/innerHeight*70)},{passive:true});
  }

  // "Cargando…" -> esqueleto en vidrio (se saca solo cuando llega el contenido)
  var sheetEl=document.getElementById('sheet');
  var isLoad=function(g){return Array.prototype.some.call(g.querySelectorAll('.hint,.empty b'),function(e){return e.textContent.trim()==='Cargando…'})};
  var sk=function(){
    [app,sheetEl].forEach(function(root){if(!root)return;
      root.querySelectorAll('.fx-sk').forEach(function(g){if(!isLoad(g))g.classList.remove('fx-sk')});
      root.querySelectorAll('.hint,.empty b').forEach(function(e){
        if(e.textContent.trim()!=='Cargando…')return;var g=e.closest('.group');if(g&&!g.classList.contains('fx-sk'))g.classList.add('fx-sk');
      });
    });
  };
  var sm=new MutationObserver(sk);sm.observe(app,{childList:true,subtree:true,characterData:true});
  if(sheetEl)sm.observe(sheetEl,{childList:true,subtree:true,characterData:true});
})();
