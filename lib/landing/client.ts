// Browser script for the homepage. Plain JS (no template literals — it lives inside a TS string).
export const HOME_JS = String.raw`
(function(){
var D=window.__H||{},P={},KEY='cc_cart_v1';
(D.products||[]).forEach(function(p){P[p.v]=p});
var $=function(s,r){return (r||document).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function fmt(m){try{return new Intl.NumberFormat(undefined,{style:'currency',currency:D.cur,currencyDisplay:'narrowSymbol',minimumFractionDigits:0,maximumFractionDigits:D.exp}).format(m/Math.pow(10,D.exp))}catch(e){return D.cur+' '+(m/Math.pow(10,D.exp))}}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

/* splash — once per session, skippable, never for reduced motion */
var sp=$('#splash');
if(sp){
  var seen=false;try{seen=sessionStorage.getItem('splashSeen')==='1'}catch(e){}
  if(seen||reduce){sp.remove()}else{
    var t0=Date.now(),gone=false;
    var hide=function(){if(gone)return;gone=true;sp.classList.add('out');try{sessionStorage.setItem('splashSeen','1')}catch(e){}setTimeout(function(){sp.remove()},700)};
    sp.addEventListener('click',hide);document.addEventListener('keydown',hide,{once:true});
    var ready=function(){setTimeout(hide,Math.max(0,1700-(Date.now()-t0)))};
    if(document.readyState==='complete')ready();else window.addEventListener('load',ready);
    setTimeout(hide,3500);
  }
}

/* cart — the store's real cart, so the normal checkout takes over */
function load(){try{var c=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(c)?c:[]}catch(e){return []}}
function save(c){try{localStorage.setItem(KEY,JSON.stringify(c))}catch(e){}render()}
function unit(p){return p.m}
function render(){
  var c=load(),n=c.reduce(function(s,l){return s+(l.qty||0)},0);
  $$('[data-count]').forEach(function(e){e.textContent=n});
  var bar=$('#bagBar');if(bar){bar.classList.toggle('on',n>0);$('#barTxt').textContent=n+(n===1?' item':' items')}
  var body=$('#bagBody');if(!body)return;
  var total=0,unknown=0,html='';
  c.forEach(function(l){
    var p=l.variantId&&P[l.variantId];
    if(!p){unknown+=l.qty||1;return}
    total+=unit(p)*l.qty;
    html+='<div class="ln"><div class="th" style="background:'+esc(p.bg)+'">'+(p.img?'<img src="'+esc(p.img)+'" alt="">':esc(p.icon))+'</div><div class="t">'+esc(p.name)+'<small>'+fmt(unit(p))+'</small></div><div class="q"><button type="button" data-q="-1" data-v="'+esc(l.variantId)+'" aria-label="Fewer">−</button><span>'+l.qty+'</span><button type="button" data-q="1" data-v="'+esc(l.variantId)+'" aria-label="More">+</button></div></div>';
  });
  if(unknown)html+='<p class="ln" style="color:#6b6680;font-weight:600">+ '+unknown+' other item'+(unknown>1?'s':'')+' from the shop</p>';
  body.innerHTML=html||'<p style="text-align:center;color:#6b6680;padding:40px 0">Your bag is empty.</p>';
  $('#bagTotal').textContent=unknown?(total?fmt(total)+' +':'—'):fmt(total);
  $('#bagGo').style.display=n?'':'none';
}
function openBag(){$('#drawer').classList.add('open');$('#shade').classList.add('open');render()}
function closeBag(){$('#drawer').classList.remove('open');$('#shade').classList.remove('open')}
var tt;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},1800)}
function add(v){
  var p=P[v];if(!p)return;var c=load(),i=-1;
  c.forEach(function(l,k){if(l.variantId===v)i=k});
  if(i>=0)c[i].qty=Math.min(999,c[i].qty+1);else c.push({variantId:v,qty:1});
  save(c);toast('Added: '+p.name);
}
document.addEventListener('click',function(e){
  var a=e.target.closest('[data-add]');if(a){add(a.getAttribute('data-add'));return}
  var q=e.target.closest('[data-q]');if(q){var v=q.getAttribute('data-v'),d=+q.getAttribute('data-q'),c=load();
    c=c.map(function(l){if(l.variantId===v)l.qty+=d;return l}).filter(function(l){return l.qty>0});save(c);return}
  if(e.target.closest('[data-bag]')){openBag();return}
  if(e.target.closest('[data-close]')){closeBag();return}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeBag()});

/* shop filters (products are already in the HTML, so search engines see them) */
var cards=$$('.pc'),tab='All',chip='',q='';
function filter(){
  var shown=0;
  cards.forEach(function(c){
    var ok=(tab==='All'||c.dataset.cat===tab)&&(!chip||c.dataset.sub===chip)&&(!q||c.dataset.name.indexOf(q)>-1);
    c.hidden=!ok;if(ok)shown++;
  });
  $('#none').hidden=shown>0;
  $$('.tab').forEach(function(b){b.setAttribute('aria-pressed',b.dataset.tab===tab)});
  var subs=[];cards.forEach(function(c){if((tab==='All'||c.dataset.cat===tab)&&c.dataset.sub&&subs.indexOf(c.dataset.sub)<0)subs.push(c.dataset.sub)});
  var box=$('#chips');
  box.innerHTML=tab==='All'||subs.length<2?'':['']. concat(subs).map(function(s){return '<button type="button" class="chipf" data-chip="'+esc(s)+'" aria-pressed="'+(s===chip)+'">'+(s||'All')+'</button>'}).join('');
}
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-tab]');if(t){tab=t.dataset.tab;chip='';filter();if(t.dataset.go)$('#shop').scrollIntoView({behavior:reduce?'auto':'smooth'});return}
  var c=e.target.closest('[data-chip]');if(c){chip=c.dataset.chip;filter()}
});
function onSearch(v){q=v.trim().toLowerCase();filter()}
$$('.qs').forEach(function(i){i.addEventListener('input',function(){onSearch(i.value);$$('.qs').forEach(function(o){if(o!==i)o.value=i.value})});
  i.form&&i.form.addEventListener('submit',function(e){e.preventDefault();$('#shop').scrollIntoView({behavior:reduce?'auto':'smooth'})})});
filter();

/* currency */
var sel=$('#cur');if(sel)sel.addEventListener('change',function(){document.cookie='cc_currency='+sel.value+'; path=/; max-age=31536000; samesite=lax';location.reload()});

/* 3D: hero follows the pointer; cards tilt */
var fine=window.matchMedia&&matchMedia('(hover: hover) and (pointer: fine)').matches;
if(!reduce){
  var sc=$('#scene'),st=$('#stage');
  if(sc&&st&&fine){sc.addEventListener('mousemove',function(e){var r=sc.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;st.style.setProperty('--ry',(x*16)+'deg');st.style.setProperty('--rx',(-y*10)+'deg')});
    sc.addEventListener('mouseleave',function(){st.style.setProperty('--ry','0deg');st.style.setProperty('--rx','0deg')})}
  else if(st){var ph=0;setInterval(function(){ph+=.05;st.style.setProperty('--ry',(Math.sin(ph)*8)+'deg');st.style.setProperty('--rx',(Math.cos(ph*.8)*3)+'deg')},60)}
  if(fine){document.addEventListener('mousemove',function(e){
    var el=e.target.closest&&e.target.closest('.pc,.cat,.rc');if(!el)return;
    var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    el.style.transform='perspective(800px) rotateY('+(x*9)+'deg) rotateX('+(-y*9)+'deg) translateY(-4px)'});
    document.addEventListener('mouseout',function(e){var el=e.target.closest&&e.target.closest('.pc,.cat,.rc');if(el&&!el.contains(e.relatedTarget))el.style.transform=''})}
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}})},{rootMargin:'0px 0px -8% 0px'});$$('.rise').forEach(function(el){io.observe(el)})}
  else $$('.rise').forEach(function(el){el.classList.add('in')});
}else $$('.rise').forEach(function(el){el.classList.add('in')});

render();
})();
`;
