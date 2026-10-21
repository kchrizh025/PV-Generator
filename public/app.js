(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let logs=[],st={seed:'',reset:true},dlCap=true,ready=false,current=null,pvDirty=false,booting=false,view=[];

/* ---------- amount helpers ---------- */
const O=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const T=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function h(n){let s='';if(n>=100){s=O[Math.floor(n/100)]+' Hundred';n%=100;if(n)s+=' '}
 if(n>=20){s+=T[Math.floor(n/10)]+(n%10?'-'+O[n%10]:'')}else if(n)s+=O[n];return s}
function intWords(n){if(n===0)return'Zero';const sc=['','Thousand','Million','Billion','Trillion'];const p=[];let i=0;
 while(n>0){const c=n%1000;if(c)p.unshift(h(c)+(sc[i]?' '+sc[i]:''));n=Math.floor(n/1000);i++}return p.join(' ')}
function amtWords(c){const p=Math.floor(c/100),q=c%100,o=[];
 if(p>0)o.push(intWords(p)+(p===1?' Peso':' Pesos'));
 if(q>0)o.push(intWords(q)+(q===1?' Centavo':' Centavos'));return o.join(' and ')+' Only'}
function parseCents(s){s=String(s||'').replace(/[^\d.]/g,'');if(!s||s==='.'||(s.match(/\./g)||[]).length>1)return NaN;
 const n=Math.round(parseFloat(s)*100);return n>0&&n<1e14?n:NaN}
const fmtAmt=c=>Math.floor(c/100).toLocaleString('en-US')+(c%100?'.'+String(c%100).padStart(2,'0'):'');
const fmtFull=c=>(c/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const fmtDate=iso=>{const p=String(iso).split('-');return p.length===3?(+p[1])+'/'+(+p[2])+'/'+p[0]:''};
const wordsOf=c=>Number.isFinite(c)?amtWords(c):'';

/* ---------- PV numbering (mirrors the server) ---------- */
function parsePV(pv){const m=/^(\d{1,2})-(\d{4})-(\d{1,9})$/.exec(String(pv||'').trim());return m?{month:+m[1],year:+m[2],seq:+m[3]}:null}
const pvKey=pv=>{const p=parsePV(pv);return p?p.year+'-'+p.month+'-'+p.seq:String(pv||'').trim().toLowerCase()};
function nextPV(date){
 const [y,m]=(date||today()).split('-').map(Number);
 const ps=logs.map(l=>parsePV(l.pv)).filter(Boolean),sd=parsePV(st.seed);
 const seqs=(st.reset?ps.filter(p=>p.year===y&&p.month===m):ps).map(p=>p.seq);
 const sdSeq=sd&&(!st.reset||(sd.year===y&&sd.month===m))?sd.seq:0;
 return String(m).padStart(2,'0')+'-'+y+'-'+String(Math.max(0,sdSeq,...seqs)+1).padStart(3,'0')}

/* ---------- log ordering and filters ---------- */
const DIR0={pv:'desc',date:'desc',requester:'asc',amount:'desc'};
const LBL={pv:['Oldest first','Newest first'],date:['Oldest first','Newest first'],requester:['A \u2192 Z','Z \u2192 A'],amount:['Lowest first','Highest first']};
let ord={sort:'pv',dir:'desc',req:'',from:'',to:''};
try{const o=JSON.parse(localStorage.getItem('pv_ord')||'null');if(o&&DIR0[o.sort]){ord.sort=o.sort;ord.dir=o.dir==='asc'?'asc':'desc'}}catch(e){}
const ordQS=()=>{const p=new URLSearchParams({sort:ord.sort,dir:ord.dir});if(ord.req)p.set('requester',ord.req);if(ord.from)p.set('from',ord.from);if(ord.to)p.set('to',ord.to);return p.toString()};
let viewSeq=0;
async function loadView(){const n=++viewSeq;const v=await api('/vouchers?'+ordQS());if(n===viewSeq){view=v;renderLogs()}}
async function reload(){await loadAll();reqOpts();await loadView()}
function syncCtl(){
 $('#o-sort').value=ord.sort;$('#o-dir').textContent=LBL[ord.sort][ord.dir==='asc'?0:1]+(ord.dir==='asc'?' \u2191':' \u2193');
 $('#o-req').value=ord.req;$('#o-from').value=ord.from;$('#o-to').value=ord.to;
 document.querySelectorAll('th[data-s]').forEach(t=>{t.textContent=t.dataset.l+(t.dataset.s===ord.sort?(ord.dir==='asc'?' \u25b2':' \u25bc'):'')})}
function applyOrd(){try{localStorage.setItem('pv_ord',JSON.stringify({sort:ord.sort,dir:ord.dir}))}catch(e){}syncCtl();loadView().catch(e=>{if(e.status!==401)flash(e.message)})}
function reqOpts(){
 const seen=new Map();logs.forEach(l=>{const k=l.requester.trim().toLowerCase();if(!seen.has(k))seen.set(k,l.requester.trim())});
 const sel=$('#o-req');
 sel.innerHTML='<option value="">All requesters</option>'+[...seen].sort((a,b)=>a[1].localeCompare(b[1])).map(([k,n])=>'<option value="'+esc(k)+'">'+esc(n)+'</option>').join('');
 if(!seen.has(ord.req))ord.req='';sel.value=ord.req}

/* ---------- voucher markup ---------- */
function sheet(v){
 const amt=Number.isFinite(v.cents)?fmtAmt(v.cents):'',words=wordsOf(v.cents),dt=v.date?fmtDate(v.date):'';
 const pur=esc(v.purpose).replace(/\n/g,'<br>'),L='______________';
 const c3='<colgroup><col style="width:33.4%"><col style="width:33.3%"><col style="width:33.3%"></colgroup>';
 const copy=sub=>`<div class="pv"><h2>PAYMENT VOUCHER</h2>
<table>${c3}<tr><td><b>PV No.</b>&nbsp; ${esc(v.pv)}</td><td><b>Amount:</b> ${amt}</td><td><b>Date:</b> ${dt}</td></tr>
<tr><td colspan="3"><b>Amount in Words:</b><span class="v">${esc(words)}</span></td></tr>
<tr><td colspan="3"><b>Purpose:</b><span class="v">${pur}</span></td></tr>
<tr><td><b>Requested by:</b><span class="v">${esc(v.requester)}</span>${L}</td><td><b>Approved for Release:</b><span class="v"></span>${L}</td><td><b>Released Date:</b><span class="v"></span>${L}</td></tr></table>
<table><colgroup><col style="width:50%"><col style="width:50%"></colgroup><tr><td><b>Cash Released: P${L}</b></td><td><b>Received by (Requester): ${L}</b></td></tr></table>
<table><colgroup><col style="width:29%"><col style="width:24%"><col style="width:24%"><col style="width:23%"></colgroup><tr><th>LIQUIDATION</th><th>Amount</th><th>Date</th><th>Signature / Verification</th></tr><tr><td>Actual Expenses:</td><td>P__________</td><td>${L}</td><td>${L}</td></tr></table>
<table>${c3}<tr><td><b>Cash Returned to Treasury: P_______</b></td><td><b>Date Returned: _______</b></td><td><b>Received by Treasury: _______</b></td></tr></table>
<table>${c3}${sub?'<tr><td><b>Submitted for Audit:</b></td><td><b>Date Submitted:</b></td><td><b>Received By:</b></td></tr>':''}<tr><td><b>AUDIT &mdash; Audited by: _______</b></td><td><b>Date Audited: _______</b></td><td><b>Remarks: _______</b></td></tr></table>
<table><tr><td class="note"><b>NOTE:</b> This payment is subject to liquidation and audit within fourteen (14) working days from the date of release. Any unliquidated or unsupported amount shall be returned to Treasury or otherwise settled by the responsible person.</td></tr></table></div>`;
 return copy(false)+'<div class="cut"></div><div class="cutl">&#9986; CUT HERE</div>'+copy(true)}

function paint(v){$('#paper').innerHTML=sheet(v);fit()}
function fit(){$('#paper').style.zoom=Math.min(1,$('#stage').clientWidth/816)}

/* ---------- API (talks to the Node backend) ---------- */
async function api(path,opt){
 opt=opt||{};
 const r=await fetch('/api'+path,{method:opt.method||'GET',headers:opt.body?{'Content-Type':'application/json'}:undefined,body:opt.body?JSON.stringify(opt.body):undefined,credentials:'same-origin'});
 let j=null;try{j=await r.json()}catch(e){}
 if(r.status===401&&path!=='/login'){showLogin();throw Object.assign(new Error('Please sign in.'),{status:401})}
 if(!r.ok)throw Object.assign(new Error((j&&j.error)||'Request failed'),{status:r.status});
 return j}
function showLogin(){ready=false;booting=false;$('#login').classList.remove('hidden');$('#logout').classList.add('hidden')}
async function loadAll(){logs=await api('/vouchers?sort=pv&dir=asc');const s=await api('/settings');st={seed:s.seed||'',reset:s.reset!==false};ready=true}

/* ---------- UI ---------- */
let mt;function flash(t){const m=$('#msg');m.textContent=t;m.classList.remove('hidden');clearTimeout(mt);mt=setTimeout(()=>m.classList.add('hidden'),3500)}
function defaults(){
 $('#f-date').value=today();
 if(!pvDirty)$('#f-pv').value=nextPV($('#f-date').value);
 $('#pv-hint').textContent=st.reset?'Numbered by the month of the date requested.':'Numbering continues across months.'}
function draftVal(){return{pv:$('#f-pv').value.trim(),date:$('#f-date').value,cents:parseCents($('#f-amt').value),purpose:$('#f-purpose').value.trim(),requester:$('#f-req').value.trim()}}
function refresh(){
 const v=draftVal(),amtTxt=$('#f-amt').value.trim();
 $('#f-words').textContent=Number.isFinite(v.cents)?amtWords(v.cents):'\u2014';
 const dup=v.pv&&logs.some(l=>pvKey(l.pv)===pvKey(v.pv));
 $('#gen').disabled=!(ready&&v.pv&&v.date&&Number.isFinite(v.cents)&&v.purpose&&v.requester&&!dup);
 $('#gen-hint').textContent=!ready?'Loading your log\u2026':dup?'PV No. '+v.pv+' is already in the log.':(amtTxt&&!Number.isFinite(v.cents)?'Enter an amount greater than zero.':'');
 if(!current)paint(v)}
function reqList(){$('#reqs').innerHTML=[...new Set(logs.map(l=>l.requester))].sort().map(r=>'<option value="'+esc(r)+'">').join('')}
function renderLogs(){
 const q=$('#q').value.trim().toLowerCase();
 const list=view.filter(l=>!q||[l.pv,l.requester,l.purpose,l.date,fmtDate(l.date),fmtAmt(l.cents)].join(' ').toLowerCase().includes(q));
 const total=list.reduce((a,l)=>a+l.cents,0),filt=q||ord.req||ord.from||ord.to;
 $('#lg-title').textContent='Voucher log ('+(filt?list.length+' of '+logs.length:logs.length)+(list.length?' \u00b7 \u20b1'+fmtFull(total):'')+')';
 $('#rows').innerHTML=list.length?list.map(l=>`<tr class="${current&&current.id===l.id?'cur':''}"><td><b>${esc(l.pv)}</b></td><td>${fmtDate(l.date)}</td><td>${esc(l.requester)}</td><td class="pur">${esc(l.purpose)}</td><td class="num">${fmtFull(l.cents)}</td><td class="act"><button class="btn sm" data-a="view" data-id="${l.id}">Open</button> <button class="btn sm" data-a="print" data-id="${l.id}">Print</button> <button class="btn sm dl ${dlCap?'':'hidden'}" data-a="pdf" data-id="${l.id}">PDF</button> <button class="btn sm danger" data-a="del" data-id="${l.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">'+(logs.length?'No vouchers match these filters.':'No vouchers yet. Generated forms will be listed here.')+'</td></tr>';
 reqList()}
function openRec(id){
 const r=logs.find(l=>l.id===id);if(!r)return;current=r;
 $('#draft').classList.add('hidden');$('#view').classList.remove('hidden');
 $('#v-title').textContent='PV No. '+r.pv;
 $('#v-meta').innerHTML='<b>'+esc(r.requester)+'</b> &middot; &#8369;'+fmtFull(r.cents)+' &middot; '+fmtDate(r.date);
 paint(r);renderLogs();window.scrollTo({top:0,behavior:'smooth'})}
function newVoucher(){
 current=null;pvDirty=false;
 ['#f-amt','#f-purpose','#f-req'].forEach(s=>$(s).value='');
 $('#view').classList.add('hidden');$('#draft').classList.remove('hidden');
 defaults();refresh();renderLogs()}

async function generate(){
 const v=draftVal();if($('#gen').disabled)return;$('#gen').disabled=true;
 let rec;
 try{rec=await api('/vouchers',{method:'POST',body:{pv:pvDirty?v.pv:'',date:v.date,amount:(v.cents/100).toFixed(2),purpose:v.purpose,requester:v.requester}})}
 catch(e){if(e.status===409){try{await loadAll()}catch(x){}pvDirty=false;defaults()}refresh();return flash(e.message)}
 try{await reload()}catch(e){logs.push(rec)}openRec(rec.id)}

async function save(name,data){
 const type=/\.pdf$/.test(name)?'application/pdf':'application/octet-stream';
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);flash('Saved '+name)}
async function pdf(rec){
 if(!window.html2canvas||!window.jspdf)return flash('PDF tools did not load. Check your connection.');
 flash('Preparing PDF\u2026');
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0';
 host.innerHTML='<div class="paper">'+sheet(rec)+'</div>';document.body.appendChild(host);
 try{
  const cv=await html2canvas(host.firstChild,{scale:2.5,backgroundColor:'#ffffff'});
  let w=8.5,hh=8.5*cv.height/cv.width;if(hh>11){w=w*11/hh;hh=11}
  const doc=new jspdf.jsPDF({unit:'in',format:'letter',compress:true});
  doc.addImage(cv.toDataURL('image/jpeg',.93),'JPEG',(8.5-w)/2,0,w,hh);
  await save('PV_'+rec.pv+'.pdf',doc.output('arraybuffer'));
 }catch(e){flash('Could not create the PDF.')}finally{host.remove()}}
function doPrint(){try{window.print()}catch(e){flash('Printing is not available here. Download the PDF instead.')}}

/* ---------- events ---------- */
['#f-pv','#f-date','#f-amt','#f-purpose','#f-req'].forEach(s=>$(s).addEventListener('input',()=>{if(s==='#f-pv')pvDirty=true;if(s==='#f-date'&&!pvDirty&&$('#f-date').value)$('#f-pv').value=nextPV($('#f-date').value);refresh()}));
$('#f-amt').addEventListener('blur',()=>{const c=parseCents($('#f-amt').value);if(Number.isFinite(c))$('#f-amt').value=fmtFull(c);refresh()});
$('#gen').addEventListener('click',generate);
$('#v-new').addEventListener('click',newVoucher);
$('#v-print').addEventListener('click',doPrint);
$('#v-pdf').addEventListener('click',()=>current&&pdf(current));
$('#q').addEventListener('input',renderLogs);
$('#o-sort').addEventListener('change',()=>{ord.sort=$('#o-sort').value;ord.dir=DIR0[ord.sort];applyOrd()});
$('#o-dir').addEventListener('click',()=>{ord.dir=ord.dir==='asc'?'desc':'asc';applyOrd()});
$('#o-req').addEventListener('change',()=>{ord.req=$('#o-req').value;applyOrd()});
$('#o-from').addEventListener('change',()=>{ord.from=$('#o-from').value;applyOrd()});
$('#o-to').addEventListener('change',()=>{ord.to=$('#o-to').value;applyOrd()});
$('#o-clear').addEventListener('click',()=>{ord.req='';ord.from='';ord.to='';$('#q').value='';applyOrd()});
document.querySelector('.lg thead').addEventListener('click',e=>{const t=e.target.closest('th[data-s]');if(!t)return;const k=t.dataset.s;if(ord.sort===k)ord.dir=ord.dir==='asc'?'desc':'asc';else{ord.sort=k;ord.dir=DIR0[k]}applyOrd()});
$('#rows').addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;const id=b.dataset.id,r=logs.find(l=>l.id===id);if(!r)return;
 if(b.dataset.a==='view')openRec(id);
 else if(b.dataset.a==='print'){openRec(id);setTimeout(doPrint,150)}
 else if(b.dataset.a==='pdf')pdf(r);
 else if(b.dataset.a==='del'){
  if(!b.dataset.arm){b.dataset.arm=1;b.textContent='Confirm?';setTimeout(()=>{if(b.isConnected){delete b.dataset.arm;b.textContent='Delete'}},3000);return}
  try{await api('/vouchers/'+id,{method:'DELETE'});await reload()}catch(x){return flash(x.message)}
  if(current&&current.id===id)newVoucher();else{defaults();refresh()}renderLogs();flash('Deleted '+r.pv)}});
$('#x-csv').addEventListener('click',()=>{if(!view.length)return flash('Nothing to export for this view.');location.href='/api/export.csv?'+ordQS()});
$('#x-json').addEventListener('click',()=>{location.href='/api/backup.json'});
$('#x-restore').addEventListener('click',()=>$('#x-file').click());
$('#x-file').addEventListener('change',async e=>{
 const f=e.target.files[0];e.target.value='';if(!f)return;
 try{const o=JSON.parse(await f.text());const r=await api('/import',{method:'POST',body:{logs:Array.isArray(o)?o:(o.logs||[])}});
  await reload();flash('Restored '+r.imported+' voucher'+(r.imported===1?'':'s')+(r.skipped?' ('+r.skipped+' already existed or invalid)':''));
  renderLogs();if(!current){pvDirty=false;defaults();refresh()}}
 catch(x){flash(x.status?x.message:'That file could not be read.')}});
$('#s-save').addEventListener('click',async()=>{
 st={seed:$('#s-seed').value.trim(),reset:$('#s-reset').checked};
 try{await api('/settings',{method:'PUT',body:st})}catch(e){return flash(e.message)}
 if(!current){pvDirty=false;defaults();refresh()}flash('Numbering settings saved')});
if(window.ResizeObserver)new ResizeObserver(fit).observe($('#stage'));else addEventListener('resize',fit);

/* ---------- start ---------- */
defaults();refresh();syncCtl();renderLogs();
async function boot(){
 if(booting)return;booting=true;$('#login').classList.add('hidden');$('#logout').classList.remove('hidden');
 try{await reload()}catch(e){booting=false;if(e.status!==401)flash('Could not load the log: '+e.message);return}
 $('#s-seed').value=st.seed||'';$('#s-reset').checked=st.reset!==false;
 if(!current){defaults();refresh()}renderLogs()}
$('#login-form').addEventListener('submit',async e=>{
 e.preventDefault();$('#login-err').textContent='';$('#l-btn').disabled=true;
 try{await api('/login',{method:'POST',body:{username:$('#l-user').value.trim(),password:$('#l-pass').value}});$('#l-pass').value='';boot()}
 catch(x){$('#login-err').textContent=x.message}
 $('#l-btn').disabled=false});
$('#logout').addEventListener('click',async()=>{try{await api('/logout',{method:'POST'})}catch(e){}location.reload()});
api('/me').then(boot).catch(showLogin);
})();
