(function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const peso=c=>'\u20b1'+(c/100).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const cat=l=>l.category||'Uncategorized';
let csv=[];
const data=()=>(window.PV&&window.PV.logs)||[];
function fill(){
 const L=data(),yrs=[...new Set(L.map(l=>l.date.slice(0,4)))].sort().reverse();
 const cy=$('#r-year').value,cm=$('#r-month').value,ty=String(new Date().getFullYear());
 $('#r-year').innerHTML=yrs.length?yrs.map(y=>`<option>${y}</option>`).join(''):`<option>${ty}</option>`;
 $('#r-year').value=yrs.includes(cy)?cy:(yrs.includes(ty)?ty:(yrs[0]||ty));
 $('#r-month').innerHTML='<option value="">Whole year</option>'+MN.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
 $('#r-month').value=cm;
}
function render(){
 const t=$('#r-type').value,y=$('#r-year').value;let m=$('#r-month').value;
 $('#r-ml').classList.toggle('hidden',t==='monthly');
 const inYear=data().filter(l=>l.date.slice(0,4)===y);
 let html='',title='',rows=[];
 if(t==='monthly'){
  title='Monthly expenses \u00b7 '+y;
  const tot=Array(12).fill(0),n=Array(12).fill(0);
  inYear.forEach(l=>{const i=+l.date.slice(5,7)-1;tot[i]+=l.cents;n[i]++});
  const mx=Math.max(1,...tot),sum=tot.reduce((a,b)=>a+b,0);
  csv=[['Month','Vouchers','Total']];
  html='<table class="lg"><thead><tr><th>Month</th><th class="num">Vouchers</th><th class="num">Total</th><th>Share</th></tr></thead><tbody>'+
   MN.map((M,i)=>{csv.push([M+' '+y,n[i],(tot[i]/100).toFixed(2)]);return `<tr><td>${M}</td><td class="num">${n[i]}</td><td class="num">${peso(tot[i])}</td><td><span class="bars" style="width:${Math.round(tot[i]/mx*100)}%"></span></td></tr>`}).join('')+
   `</tbody><tfoot><tr><td>Total</td><td class="num">${n.reduce((a,b)=>a+b,0)}</td><td class="num">${peso(sum)}</td><td></td></tr></tfoot></table>`;
  csv.push(['Total',n.reduce((a,b)=>a+b,0),(sum/100).toFixed(2)]);
  $('#r-sum').innerHTML='Total for <b>'+y+'</b>: <b>'+peso(sum)+'</b> across '+inYear.length+' vouchers';
 }else{
  if(t==='category'&&m==='')m='';
  const sel=m?inYear.filter(l=>+l.date.slice(5,7)===+m):inYear,per=m?MN[m-1]+' '+y:y;
  if(t==='category'){
   title='Expenses per category \u00b7 '+per;
   const g={};sel.forEach(l=>{const k=cat(l).trim().toLowerCase();(g[k]=g[k]||{name:cat(l).trim(),n:0,c:0});g[k].n++;g[k].c+=l.cents});
   const arr=Object.values(g).map(v=>[v.name,v]).sort((a,b)=>b[1].c-a[1].c),sum=arr.reduce((a,[,v])=>a+v.c,0),mx=arr.length?arr[0][1].c:1;
   csv=[['Category','Vouchers','Total','Percent']];
   html=arr.length?'<table class="lg"><thead><tr><th>Category</th><th class="num">Vouchers</th><th class="num">Total</th><th class="num">%</th><th>Share</th></tr></thead><tbody>'+
    arr.map(([k,v])=>{const p=(v.c/sum*100).toFixed(1);csv.push([k,v.n,(v.c/100).toFixed(2),p]);return `<tr><td>${esc(k)}</td><td class="num">${v.n}</td><td class="num">${peso(v.c)}</td><td class="num">${p}%</td><td><span class="bars" style="width:${Math.round(v.c/mx*100)}%"></span></td></tr>`}).join('')+
    `</tbody><tfoot><tr><td>Total</td><td class="num">${sel.length}</td><td class="num">${peso(sum)}</td><td class="num">100%</td><td></td></tr></tfoot></table>`:'<p class="empty">No vouchers for this period.</p>';
   $('#r-sum').innerHTML='<b>'+per+'</b>: '+peso(sum)+' in '+arr.length+' categories';
  }else{
   if(!m){const has=[...new Set(inYear.map(l=>+l.date.slice(5,7)))].sort((a,b)=>b-a);m=has[0]||(new Date().getMonth()+1);$('#r-month').value=m}
   const per2=MN[m-1]+' '+y,s2=inYear.filter(l=>+l.date.slice(5,7)===+m).sort((a,b)=>b.cents-a.cents);
   title='Highest expenses ranked \u00b7 '+per2;
   const sum=s2.reduce((a,l)=>a+l.cents,0);
   csv=[['Rank','PV No.','Date','Requested by','Category','Purpose','Amount']];
   html=s2.length?'<table class="lg"><thead><tr><th>Rank</th><th>PV No.</th><th>Date</th><th>Requested by</th><th>Category</th><th>Purpose</th><th class="num">Amount</th><th class="num">% of month</th></tr></thead><tbody>'+
    s2.map((l,i)=>{csv.push([i+1,l.pv,l.date,l.requester,cat(l),l.purpose,(l.cents/100).toFixed(2)]);return `<tr><td class="rk">#${i+1}</td><td><b>${esc(l.pv)}</b></td><td>${esc(l.date)}</td><td>${esc(l.requester)}</td><td>${esc(cat(l))}</td><td class="pur">${esc(l.purpose)}</td><td class="num">${peso(l.cents)}</td><td class="num">${(l.cents/sum*100).toFixed(1)}%</td></tr>`}).join('')+
    `</tbody><tfoot><tr><td colspan="6">Total</td><td class="num">${peso(sum)}</td><td></td></tr></tfoot></table>`:'<p class="empty">No vouchers for this month.</p>';
   $('#r-sum').innerHTML='<b>'+per2+'</b>: '+peso(sum)+' across '+s2.length+' vouchers'+(s2[0]?' \u00b7 highest: <b>'+peso(s2[0].cents)+'</b> ('+esc(s2[0].pv)+')':'');
  }
 }
 $('#r-title').textContent=title;$('#r-out').innerHTML=html;
}
function tab(t){
 document.body.classList.toggle('rep',t==='reports');
 $('#reports').classList.toggle('hidden',t!=='reports');
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
 if(t==='reports'){fill();render()}
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('.tab');if(b)tab(b.dataset.t)});
['#r-type','#r-year','#r-month'].forEach(s=>$(s).addEventListener('change',render));
window.addEventListener('pv:data',()=>{if(!$('#reports').classList.contains('hidden')){fill();render()}});
$('#r-print').onclick=()=>window.print();
$('#r-csv').onclick=()=>{
 const q=v=>{v=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
 const b=new Blob(['\ufeff'+csv.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='PV-report-'+$('#r-type').value+'-'+$('#r-year').value+'.csv';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
})();
