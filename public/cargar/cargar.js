/* Cargar turno · página aparte (/cargar/) para cargar turnos o fila rápido, con estado al guardar.
   Usa la misma sesión de gestión (cookie del mismo sitio) y los mismos pedidos del panel: /boot, /appt/create, /queue/add, /appt/done y /appt/status. */
(function(){
  var FOUND={},ftT=0,ftN=0,CG=null,M=null,A=null,TZ='America/Argentina/Buenos_Aires';
  var addDay=function(d,n){var x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
  var load=async function(){var r=await api('/boot');A=r.admin||null;delete r.admin;M=r};
  var render=function(){$('app').innerHTML=window.vCargar()};
  $('miniLogo').innerHTML='<img src="/logo.png" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  $('backBtn').innerHTML=ico('cal');
  var owner=function(){return M.me.role==='owner'};
  var team=function(){return owner()&&A&&A.team?A.team.filter(function(s){return s.active!==false}):[]};
  var svs=function(){return M.services.filter(function(s){return !s.addon})};
  var ads=function(){return M.services.filter(function(s){return s.addon})};
  var prods=function(){return (M.products||[]).filter(function(p){return p.active!==0&&p.active!==false})};
  var nowT=function(){var t=new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:TZ}).split(':'),h=+t[0],m=+t[1];return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')};
  var total=function(){var s=M.services.find(function(x){return x.id===CG.service});return (s?s.price:0)+CG.extras.reduce(function(t,id){return t+((M.services.find(function(x){return x.id===id})||{}).price||0)},0)};
  function init(){
    var s=svs()[0],tm=team(),me=tm.find(function(t){return t.id===M.me.id})||tm[0];
    CG={mode:'turno',staff:owner()?(me?me.id:''):M.me.id,service:s?s.id:'',extras:[],prods:{},dayk:'hoy',date:M.today,time:nowT(),name:'',wa:'',price:s?s.price:'',status:'pending',pay:'efectivo',cid:'',fresh:false,busy:false};
  }
  var chip=function(g,v,l,sub){return '<button type="button" class="cg-chip" data-g="'+g+'" data-v="'+esc(v)+'" onclick="CGX.pick(\''+g+'\',\''+esc(v)+'\')"><b>'+l+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</button>'};
  var segb=function(g,v,l){return '<button type="button" data-g="'+g+'" data-v="'+v+'" onclick="CGX.pick(\''+g+'\',\''+v+'\')">'+l+'</button>'};

  window.vCargar=function(){
    if(!CG)init();
    var P=prods();
    var h='<div class="cg-top"><h1 class="title">Cargar turno</h1><div class="seg cg-mode">'+segb('mode','turno','Con turno')+segb('mode','fila','Sin turno · fila')+'</div></div><div class="cg-cols"><div class="cg-col">'
    +'<section class="sec" style="margin-top:18px"><div class="sechead"><b>Servicio</b><span id="cg-tot"></span></div><div class="cg-grid">'+svs().map(function(s){return chip('service',s.id,esc(s.name),fmt(s.price))}).join('')+'</div>'
    +(ads().length?'<div class="cg-row" style="margin-top:10px">'+ads().map(function(a){return chip('extra',a.id,'+ '+esc(a.name),fmt(a.price))}).join('')+'</div>':'')+'</section>'
    +(owner()?'<section class="sec" id="cg-stf"><div class="sechead"><b id="cg-stl">Barbero</b><span></span></div><div class="cg-row">'+team().map(function(t){return chip('staff',t.id,esc(t.name))}).join('')+'</div></section>':'')
    +'<section class="sec" id="cg-when"><div class="sechead"><b>Cuándo</b><span></span></div><div class="cg-row">'+chip('day','hoy','Hoy')+chip('day','man','Mañana')
    +'<input type="date" id="cg-d" class="cg-in cg-date" value="'+CG.date+'" onchange="CGX.date(this.value)" aria-label="Otro día"></div>'
    +'<div class="cg-row" style="margin-top:10px"><input type="time" id="cg-t" class="cg-in cg-time" value="'+CG.time+'" oninput="CGX.time(this.value)" aria-label="Hora"><button type="button" class="cg-chip cg-now" onclick="CGX.now()"><b>Ahora</b></button></div></section>'
    +'</div><div class="cg-col"><section class="sec"><div class="sechead"><b>Cliente</b><span></span></div><div class="group pad"><div class="field" style="margin-top:0"><label for="cg-n">Nombre</label><input id="cg-n" autocomplete="off" autocapitalize="words" value="'+esc(CG.name)+'" oninput="CGX.find(this.value)"></div><div id="cg-sug" class="cg-row"></div>'
    +'<div class="field"><label for="cg-w">WhatsApp</label><div class="pair"><input class="prefix" value="+54 9" disabled aria-label="Prefijo"><input id="cg-w" inputmode="tel" placeholder="2477 201614" value="'+esc(CG.wa)+'" oninput="CGX.find(this.value)"></div></div><label class="cg-new"><input type="checkbox" id="cg-new"'+(CG.fresh?' checked':'')+' onchange="CGX.fresh(this.checked)"> Es otra persona (crear contacto nuevo aunque el número ya exista)</label></div></section>'
    +(P.length?'<section class="sec"><details class="group cg-det"><summary><b>Productos</b><span id="cg-pc">Opcional</span></summary><div class="pad">'+P.map(function(p){return '<div class="hrow"><span>'+esc(p.name)+'<small>'+fmt(p.price)+(p.track?' · '+(p.stock>0?'Quedan '+p.stock:'Sin stock'):'')+'</small></span><span class="qty"><button type="button" onclick="CGX.qty(\''+p.id+'\',-1)" aria-label="Menos">−</button><b id="cg-q-'+p.id+'">0</b><button type="button" onclick="CGX.qty(\''+p.id+'\',1)" aria-label="Más">+</button></span></div>'}).join('')+'</div></details></section>':'')
    +'<section class="sec"><div class="sechead"><b>Estado</b><span>Cómo queda el turno</span></div><div class="seg cg-st">'+segb('status','pending','Pendiente')+segb('status','done','Hecho')+segb('status','no_show','No asistió')+segb('status','cancelled','Cancelado')+'</div>'
    +'<div class="group pad cg-pricebox" style="margin-top:12px"><div class="field" style="margin-top:0"><label for="cg-p">Precio</label><input id="cg-p" type="number" inputmode="numeric" value="'+CG.price+'" oninput="CGX.price(this.value)"></div>'
    +'<div class="field" id="cg-pay"><label>Medio de pago</label><div class="seg">'+segb('pay','efectivo','Efectivo')+segb('pay','transferencia','Transferencia')+'</div></div></div></section>'
    +'<p class="err" id="cg-err"></p><button class="btn primary" id="cg-go" onclick="CGX.save(false)">Cargar turno</button><button class="btn" onclick="CGX.save(true)">Cargar y volver a Mi día</button><p class="cg-keys"><kbd>Enter</kbd> carga el turno · <kbd>Mayús</kbd> + <kbd>Enter</kbd> carga y vuelve a Mi día</p></div></div>';
    setTimeout(sync,0);
    return h;
  };

  var fine=function(){return matchMedia('(hover:hover) and (pointer:fine)').matches};
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'||e.isComposing||!CG||!$('cg-go'))return;var t=e.target;
    if(!t||t.tagName!=='INPUT'||!/^cg-/.test(t.id||''))return;if(document.querySelector('.dlg'))return;
    e.preventDefault();window.CGX.save(!!e.shiftKey);
  });
  var KEY={mode:'mode',service:'service',staff:'staff',day:'dayk',status:'status',pay:'pay'};
  function mark(){
    document.querySelectorAll('#app [data-g]').forEach(function(b){var g=b.dataset.g,on=g==='extra'?CG.extras.indexOf(b.dataset.v)>-1:String(CG[KEY[g]])===b.dataset.v;b.classList.toggle('on',on)});
  }
  function sync(){
    if(!$('cg-go'))return;mark();
    var fila=CG.mode==='fila',done=CG.status==='done';
    $('cg-when').classList.toggle('hidden',fila);
    $('cg-pay').classList.toggle('hidden',!done);
    var st=$('cg-stf');if(st){st.classList.toggle('hidden',fila&&!done);$('cg-stl').textContent=fila?'¿De quién fue el corte?':'Barbero'}
    $('cg-tot').textContent=total()?fmt(total()):'';
    $('cg-go').textContent=fila?'Anotar en la fila':'Cargar turno';
    var n=Object.keys(CG.prods).filter(function(k){return CG.prods[k]>0}).length,pc=$('cg-pc');if(pc)pc.textContent=n?n+' elegido'+(n>1?'s':''):'Opcional';
  }
  var X=window.CGX={
    pick:function(g,v){
      if(g==='mode')CG.mode=v;
      else if(g==='service'){CG.service=v;CG.price=total()}
      else if(g==='extra'){var i=CG.extras.indexOf(v);i>-1?CG.extras.splice(i,1):CG.extras.push(v);CG.price=total()}
      else if(g==='staff')CG.staff=v;
      else if(g==='day'){CG.dayk=v;CG.date=v==='hoy'?M.today:addDay(M.today,1);$('cg-d').value=CG.date}
      else if(g==='status')CG.status=v;
      else if(g==='pay')CG.pay=v;
      if(g==='service'||g==='extra')$('cg-p').value=CG.price;
      sync();
    },
    date:function(v){if(!v)return;CG.date=v;CG.dayk=v===M.today?'hoy':v===addDay(M.today,1)?'man':'otro';sync()},
    time:function(v){CG.time=v},now:function(){CG.time=nowT();$('cg-t').value=CG.time},
    price:function(v){CG.price=v},
    qty:function(id,d){var p=(M.products||[]).find(function(x){return x.id===id}),mx=p.track?Math.min(10,p.stock):10;CG.prods[id]=Math.max(0,Math.min(mx,(CG.prods[id]||0)+d));$('cg-q-'+id).textContent=CG.prods[id];sync()},
    find:function(q){
      if(CG)CG.cid='';
      var box=$('cg-sug');if(!box)return;q=String(q||'').trim().toLowerCase();var d=q.replace(/\D/g,'');
      var show=function(r){r.forEach(function(c){FOUND[c.id]=c});box.innerHTML=r.map(function(c){return '<button type="button" class="cg-chip cg-sg" onclick="CGX.fill(\''+c.id+'\')"><b>'+esc(c.name)+'</b><small>'+esc(displayWA(c.whatsapp))+'</small></button>'}).join('')};
      if(owner()){
        if(!A||!A.clients||q.length<2){box.innerHTML='';return}
        show(A.clients.filter(function(c){return c.name.toLowerCase().indexOf(q)>-1||(d.length>2&&String(c.whatsapp).indexOf(d)>-1)}).slice(0,4));return;
      }
      /* barbero: no recibe la lista completa; pregunta al servidor (solo nombre y WhatsApp, 4 resultados, desde 3 letras) */
      clearTimeout(ftT);var my=++ftN;
      if(q.length<3){box.innerHTML='';return}
      ftT=setTimeout(async function(){try{var r=await post('/client/find',{q:q});if(my!==ftN)return;show((r&&r.clients)||[])}catch(e){}},220);
    },
    fill:function(id){var c=(A&&A.clients?A.clients.find(function(x){return x.id===id}):null)||FOUND[id];if(!c)return;$('cg-n').value=c.name;$('cg-w').value=displayWA(c.whatsapp).replace(/^\+54 9 /,'');$('cg-sug').innerHTML='';CG.cid=c.id;CG.fresh=false;var nw=$('cg-new');if(nw)nw.checked=false},
    fresh:function(v){CG.fresh=!!v;if(v)CG.cid=''},
    save:async function(go,force){
      if(CG.busy)return;var err=$('cg-err'),btn=$('cg-go');err.textContent='';
      CG.name=$('cg-n').value.trim();CG.wa=$('cg-w').value;CG.time=($('cg-t')||{}).value||CG.time;
      if(CG.dayk==='hoy')CG.date=arDay();else if(CG.dayk==='man')CG.date=addDay(arDay(),1);
      var fila=CG.mode==='fila',wa=formatWA(CG.wa);
      if(!CG.service){err.textContent='Elegí un servicio';return}
      if(!CG.name){err.textContent='Escribí el nombre del cliente';return}
      if(!fila&&(!CG.date||!CG.time)){err.textContent='Elegí el día y la hora';return}
      if(owner()&&(!fila||CG.status==='done')&&!CG.staff){err.textContent='Elegí el barbero';return}
      var pl=Object.keys(CG.prods).filter(function(k){return CG.prods[k]>0}).map(function(k){return{id:k,qty:CG.prods[k]}});
      CG.busy=true;if(btn)btn.disabled=true;
      try{
        var r=fila?await post('/queue/add',{service:CG.service,extras:CG.extras,products:pl,name:CG.name,whatsapp:wa,price:CG.price,client_id:CG.cid||undefined,fresh:CG.fresh||undefined})
                  :await post('/appt/create',{staff:owner()?CG.staff:undefined,service:CG.service,extras:CG.extras,products:pl,date:CG.date,time:CG.time,name:CG.name,whatsapp:wa,price:CG.price,force:!!force,client_id:CG.cid||undefined,fresh:CG.fresh||undefined});
        var msg=fila?'Anotado en la fila · lugar '+r.position:'Turno cargado',warn=null;
        if(r.dup)msg='Ese turno ya estaba cargado: no se duplicó';
        /* Si el turno ya existía (reintento tras un corte de conexión) también hay que marcarlo: antes quedaba Pendiente sin aviso.
           Si ya estaba cerrado el Worker responde 409 y se deja como está. */
        if(CG.status!=='pending'&&r.id){
          try{
            if(CG.status==='done'){await post('/appt/done',{id:r.id,staff:fila?CG.staff||undefined:undefined,serviceId:CG.service,amount:CG.price,pay:CG.pay});msg='Servicio registrado'}
            else{await post('/appt/status',{id:r.id,status:CG.status});msg=CG.status==='no_show'?'Cargado como "No asistió"':'Cargado como cancelado'}
          }catch(e2){if(!(r.dup&&e2.status===409))warn='El turno quedó cargado como Pendiente, pero no se pudo marcar: '+e2.message}
        }
        await load();
        CG.name='';CG.wa='';CG.prods={};CG.time=nowT();CG.price=total();CG.status='pending';CG.pay='efectivo';CG.cid='';CG.fresh=false;
        render();if(fine()&&!go)setTimeout(function(){var n=$('cg-n');if(n)n.focus({preventScroll:true})},60);
        if(warn)alertD(warn);else{toast(msg);window.scrollTo({top:0,behavior:'smooth'})}
        if(go&&!warn)setTimeout(function(){location.href='/gestion/'},900);
      }catch(e){
        if(e.data&&e.data.soft){CG.busy=false;if(await confirmD(e.message+' ¿Cargarlo igual?','Cargar igual'))return X.save(go,true)}
        else err.textContent=e.status?e.message:'Sin conexión: no se guardó nada. Lo que escribiste sigue acá, probá de nuevo.';
      }finally{CG.busy=false;var b=$('cg-go');if(b)b.disabled=false}
    }
  };
  // Cambio de día con la página abierta (igual que gestión): pasada la medianoche (hora de Buenos Aires) se recarga sola,
  // salvo que haya un diálogo abierto, se esté guardando o haya un cliente escrito (así no se pierde nada).
  var arDay=function(){return new Date().toLocaleDateString('en-CA',{timeZone:TZ})},seenDay=arDay();
  var dayCheck=function(){if(arDay()===seenDay||!M)return;if(document.querySelector('.dlg'))return;var n=$('cg-n');if((CG&&CG.busy)||(n&&n.value.trim()))return;location.reload()};
  setInterval(dayCheck,30000);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')dayCheck()});addEventListener('pageshow',dayCheck);

  // Si el aviso es de un servicio registrado: tijera y cinta dorada
  addEventListener('fx:toast',function(e){if(/registrado/i.test(e.detail.text)&&window.FX){e.detail.handled=true;FX.ribbon()}});

  async function login(){
    var p=await api('/public?lite=1');
    $('app').innerHTML='<section class="hero"><div class="halo"><div class="mark"><img src="'+(p.logo?'/api/img/'+p.logo:'/logo.png')+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"></div></div><h1>'+esc(p.name)+'</h1><p>Cargar turno · acceso del equipo</p></section>'
    +'<div class="group pad" style="margin-top:18px"><div class="field" style="margin-top:0"><label for="ls">¿Quién sos?</label><select id="ls">'+p.staff.map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>'}).join('')+'</select></div>'
    +'<div class="field"><label for="lp">PIN</label><input id="lp" class="pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div><p class="err" id="le"></p><button class="btn primary" onclick="CGX.login()">Entrar</button></div>';
  }
  X.login=async function(){try{await post('/login',{staff:$('ls').value,pin:$('lp').value});await load();CG=null;render()}catch(e){$('le').textContent=e.message}};
  (async function(){try{await load();render()}catch(e){if(e.status===401)login();else $('app').innerHTML='<div class="group pad"><p class="err">'+esc(e.message)+'</p></div>'}})();
})();

/* Cargar turno · PC y tablet sin scroll: si el formulario no entra en la ventana, se achica todo solo (hasta 40%) para que entre.
   Mide siempre con TODAS las secciones visibles (día/hora, barbero, medio de pago), así el tamaño no salta al cambiar de modo o de estado.
   En celular (ventana angosta) no hace nada. En tablet, mientras escribís (teclado abierto) no recalcula. */
(function(){
  var mq=matchMedia('(min-width:900px) and (min-height:520px)'),fine=matchMedia('(hover:hover) and (pointer:fine)'),raf=0,mo=null,app=document.getElementById('app');
  var OPT={childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','open']};
  var setZ=function(w,z){w.style.zoom=z;w.style.setProperty('--cgz',z)};
  var fits=function(){var b=document.body;return b.scrollHeight<=b.clientHeight+1};
  var typing=function(){var a=document.activeElement;return !fine.matches&&!!a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)};
  function fit(){
    raf=0;
    var w=document.querySelector('.wrap'),h=document.documentElement;
    if(!w||typing())return;
    var on=mq.matches&&!!document.querySelector('.cg-cols');
    h.classList.toggle('cg-fit',on);
    if(!on){w.style.zoom='';w.style.removeProperty('--cgz');return}
    if(mo)mo.disconnect();
    var hid=[];
    try{
      ['cg-when','cg-stf','cg-pay'].forEach(function(id){var e=document.getElementById(id);if(e&&e.classList.contains('hidden')){e.classList.remove('hidden');hid.push(e)}});
      setZ(w,1);
      if(!fits()){var lo=.4,hi=1;for(var i=0;i<9;i++){var m=(lo+hi)/2;setZ(w,m);if(fits())lo=m;else hi=m}setZ(w,lo)}
    }finally{
      hid.forEach(function(e){e.classList.add('hidden')});
      if(mo&&app)mo.observe(app,OPT);
    }
  }
  var req=function(){if(!raf)raf=requestAnimationFrame(fit)};
  if(app){mo=new MutationObserver(req);mo.observe(app,OPT)}
  addEventListener('resize',req);
  if(mq.addEventListener)mq.addEventListener('change',req);
  document.addEventListener('focusout',function(){setTimeout(req,250)});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(req);
  req();
})();

/* Cargar turno · PC: la lista de Productos flotante se cierra al tocar afuera o con Esc */
(function(){
  var close=function(){var d=document.querySelector('html.cg-fit .cg-det[open]');if(d)d.removeAttribute('open');return d};
  document.addEventListener('click',function(e){var d=document.querySelector('html.cg-fit .cg-det[open]');if(d&&!d.contains(e.target))d.removeAttribute('open')});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
})();

guardSalir();
