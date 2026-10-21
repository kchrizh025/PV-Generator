(function(){
const $=s=>document.querySelector(s),R=document.documentElement,B=document.body;
const KEY='pv_ui',COLORS={indigo:'#4f46e5',teal:'#0f766e',pink:'#db2777',amber:'#b45309',slate:'#475569'};
const sysDark=()=>window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
const DEF=()=>({mode:sysDark()?'dark':'light',color:'teal',font:'system',size:'1',side:'right',pat:'none'});
let u=DEF(),photo='';
try{const j=JSON.parse(localStorage.getItem(KEY)||'null');if(j)u=Object.assign(DEF(),j)}catch(e){}
try{photo=localStorage.getItem(KEY+'_photo')||''}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(u))}catch(e){}}
function apply(){
 R.dataset.theme=u.mode;R.dataset.accent=u.color;R.dataset.font=u.font;R.dataset.side=u.side;
 R.style.setProperty('--fs',u.size);B.dataset.pat=u.pat;
 if(photo){B.classList.add('photo');B.style.backgroundImage='url("'+photo+'")'}else{B.classList.remove('photo');B.style.backgroundImage=''}
 document.querySelectorAll('#u-mode button').forEach(b=>b.classList.toggle('on',b.dataset.v===u.mode));
 document.querySelectorAll('#u-side button').forEach(b=>b.classList.toggle('on',b.dataset.v===u.side));
 document.querySelectorAll('#u-color button').forEach(b=>b.classList.toggle('on',b.dataset.v===u.color));
 $('#u-colorg').classList.toggle('off',u.mode!=='light');
 $('#u-font').value=u.font;$('#u-size').value=u.size;$('#u-pat').value=u.pat;
}
$('#u-color').innerHTML=Object.keys(COLORS).map(k=>`<button type="button" data-v="${k}" title="${k}" aria-label="${k}" style="background:${COLORS[k]}"></button>`).join('');
const open=o=>{$('#setpanel').classList.toggle('hidden',!o)};
$('#set-tab').onclick=()=>open($('#setpanel').classList.contains('hidden'));
$('#open-set').onclick=()=>open(true);$('#set-x').onclick=()=>open(false);
document.addEventListener('keydown',e=>{if(e.key==='Escape')open(false)});
const pick=(sel,key)=>$(sel).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;u[key]=b.dataset.v;save();apply()});
pick('#u-mode','mode');pick('#u-color','color');pick('#u-side','side');
[['#u-font','font'],['#u-size','size'],['#u-pat','pat']].forEach(([s,k])=>$(s).addEventListener('change',e=>{u[k]=e.target.value;save();apply()}));
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
