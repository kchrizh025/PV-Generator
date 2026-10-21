(function(){
const $=s=>document.querySelector(s),R=document.documentElement,B=document.body;
const KEY='pv_ui',COLORS={indigo:'#4f46e5',teal:'#0f766e',pink:'#db2777',amber:'#b45309',slate:'#475569'};
const sysDark=()=>window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
const DEF=()=>({mode:sysDark()?'dark':'light',color:'teal',font:'system',size:'1',side:'right',pat:'none',dens:'comfy',paper:'letter'});
let u=DEF(),photo='';
try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j)u=Object.assign(DEF(),j)}catch(e){}
try{photo=localStorage.getItem(KEY+'_photo')||''}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(u))}catch(e){}}
function apply(){
 const eff=u.mode==='system'?(sysDark()?'dark':'light'):u.mode;
 if(u.mode==='system')delete R.dataset.theme;else R.dataset.theme=u.mode;
 R.dataset.eff=eff;R.dataset.density=u.dens;R.dataset.accent=u.color;R.dataset.font=u.font;R.dataset.side=u.side;
 R.style.setProperty('--fs',u.size);B.dataset.pat=u.pat;
 if(photo){B.classList.add('photo');B.style.backgroundImage='url("'+photo+'")'}else{B.classList.remove('photo');B.style.backgroundImage=''}
 document.querySelectorAll('#u-mode button').forEach(b=>b.classList.toggle('on',b.dataset.v===u.mode));
 document.querySelectorAll('#u-side button').forEach(b=>b.classList.toggle('on',b.dataset.v===u.side));
 document.querySelectorAll('#u-color button').forEach(b=>b.classList.toggle('on',b.dataset.v===u.color));
 document.querySelectorAll('#u-dens button').forEach(b=>b.classList.toggle('on',b.dataset.v===u.dens));
 $('#u-colorg').classList.toggle('off',eff!=='light');
 $('#t-paper').value=u.paper;PVUI.paper=u.paper;
 let pg=$('#pg');if(!pg){pg=document.createElement('style');pg.id='pg';document.head.appendChild(pg)}
 pg.textContent='@media print{@page{size:'+(u.paper==='a4'?'A4':'letter')+';margin:0}}';
 if(PVUI.refit)PVUI.refit();
 $('#u-font').value=u.font;$('#u-size').value=u.size;$('#u-pat').value=u.pat;
}
$('#u-color').innerHTML=Object.keys(COLORS).map(k=>`<button type="button" data-v="${k}" title="${k}" aria-label="${k}" style="background:${COLORS[k]}"></button>`).join('');
const open=o=>{$('#setpanel').classList.toggle('hidden',!o)};
$('#set-tab').onclick=()=>open($('#setpanel').classList.contains('hidden'));
$('#open-set').onclick=()=>open(true);$('#set-x').onclick=()=>open(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape')open(false)});
const pick=(sel,key)=>$(sel).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;u[key]=b.dataset.v;save();apply()});
pick('#u-dens','dens');pick('#u-mode','mode');pick('#u-color','color');pick('#u-side','side');
[['#u-font','font'],['#u-size','size'],['#u-pat','pat']].forEach(([s,k])=>$(s).addEventListener('change',e=>{u[k]=e.target.value;save();apply()}));
if(window.matchMedia)matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(u.mode==='system')apply()});
$('#ptabs').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 document.querySelectorAll('#ptabs button').forEach(x=>x.classList.toggle('on',x===b));
 document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('hidden',p.dataset.p!==b.dataset.p))});
$('#t-paper').addEventListener('change',e=>{u.paper=e.target.value;save();apply()});
const cur=()=>parseFloat($('#paper').style.zoom)||1;
function zoom(d){PVUI.zoom=d===0?0:Math.min(1.6,Math.max(.4,+(cur()+d).toFixed(2)));PVUI.refit()}
$('#z-in').onclick=()=>zoom(.1);$('#z-out').onclick=()=>zoom(-.1);$('#z-fit').onclick=()=>zoom(0);
$('#t-form').onclick=()=>{$('#grid').classList.toggle('collapsed');setTimeout(()=>PVUI.refit(),60)};
$('#u-photo').onclick=()=>$('#u-file').click();
$('#u-file').addEventListener('change',e=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;
 const img=new Image(),url=URL.createObjectURL(f);
 img.onload=()=>{ // shrink so it fits browser storage
  const k=Math.min(1,1600/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  URL.revokeObjectURL(url);photo=c.toDataURL('image/jpeg',.7);
  try{localStorage.setItem(KEY+'_photo',photo)}catch(x){}
  apply()};
 img.onerror=()=>URL.revokeObjectURL(url);img.src=url});
$('#u-nophoto').onclick=()=>{photo='';try{localStorage.removeItem(KEY+'_photo')}catch(e){}apply()};
$('#u-reset').onclick=()=>{u=DEF();photo='';try{localStorage.removeItem(KEY);localStorage.removeItem(KEY+'_photo')}catch(e){}apply()};
apply();
})();
