/* Reservar FX · esqueleto de la primera carga y cinta dorada al confirmar el turno. Requiere fx-base.js */
(function(){
  var app=document.getElementById('app'),FX=window.FX;if(!app||!FX)return;
  if(!app.children.length&&!FX.calm)app.innerHTML='<div class="skel" aria-busy="true" aria-label="Cargando"><i></i><i></i><i></i></div>';
  var shown=false;
  new MutationObserver(function(){
    var ok=!!app.querySelector('.okmark');
    if(ok&&!shown){shown=true;FX.ribbon()}
    if(!ok)shown=false;
  }).observe(app,{childList:true});
})();
