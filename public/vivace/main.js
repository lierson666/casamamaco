const $=s=>document.querySelector(s);
document.getElementById('y').textContent=new Date().getFullYear();
const hd=$('header'),bg=$('#heroBg');
addEventListener('scroll',()=>{hd.classList.toggle('scrolled',scrollY>30);if(bg&&scrollY<innerHeight)bg.style.transform=`scale(1.08) translateY(${scrollY*.15}px)`},{passive:true});
const menu=$('#menu');$('.burger').onclick=()=>menu.classList.toggle('open');
menu.querySelectorAll('a').forEach(a=>a.onclick=()=>menu.classList.remove('open'));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll('.rv').forEach(el=>io.observe(el));
const co=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;co.unobserve(e.target);const el=e.target,n=+el.dataset.n,p=el.dataset.prefix||'',s=el.dataset.suffix||'',t0=performance.now();
 (function f(t){const k=Math.min((t-t0)/1600,1),v=Math.round(n*(1-Math.pow(1-k,3)));el.textContent=p+v+s;if(k<1)requestAnimationFrame(f)})(t0)}),{threshold:.6});
document.querySelectorAll('[data-n]').forEach(el=>co.observe(el));
const fm=$('#form');if(fm)fm.onsubmit=e=>{e.preventDefault();
 const t=`Olá, Vivace! Sou ${$('#nome').value}.\n${$('#msg').value}\n\nTelefone: ${$('#tel').value||'-'}\nE-mail: ${$('#mail').value}`;
 open('https://wa.me/5511995164432?text='+encodeURIComponent(t),'_blank')};

/* filtro de produtos */
(function(){const bar=document.querySelector('.cats');if(!bar)return;
 bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const c=b.dataset.cat;
  bar.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('.cat-block').forEach(s=>s.hidden=(c!=='todos'&&s.dataset.cat!==c));
  document.getElementById('lista').scrollIntoView({behavior:'smooth',block:'start'})})})();
