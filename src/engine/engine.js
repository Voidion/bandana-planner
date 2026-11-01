/* eslint-disable */
// @ts-nocheck
/* Cut-plan engine, extracted unchanged from the Bandana Planner prototype (bandana-planner.html).
   Regenerate with `npm run engine -- <path to bandana-planner.html>` rather than editing by hand.
   The engine reads the shop from S, set with setEngineState() before planning. */
let S=null,RC={};
export function setEngineState(state){if(state!==S){S=state;RC={};if(typeof NEST_CACHE!=='undefined')NEST_CACHE.clear()}}
const fab=id=>(S&&S.fabrics||[]).find(f=>f.id===id)||null;
const run=id=>(S&&S.runs||[]).find(r=>r.id===id)||null;
const MET=()=>false;
const cm1=v=>String(Math.round(v*2.54*10)/10);
const L=v=>MET()?cm1(+v||0)+' cm':String(Math.round((+v||0)*100)/100)+'"';
const pieces=r=>Object.values(r.qty).reduce((a,b)=>a+b,0);
const mats=r=>r.fabUse&&r.fabUse.length?fabCostOf(r)+strapCostOf(r)+prodNotions(r.prod)+Object.entries(r.qty||{}).reduce((a,[k,n])=>a+n*(S.sizes[k]?sizeNotions(k)+supEach('bandana')+mailerEach():0),0)+prodCount(r.prod)*(supEach('item')+mailerEach()):Object.entries(r.qty).reduce((a,[k,n])=>a+n*(unitMat(k)||0),0)+prodMat(r.prod);
const isLow=f=>f.low>0&&f.yards<=f.low;
const strapStyle=k=>S.straps.find(x=>x.id===(S.sizes[k]||{}).strap)||S.straps[0]||{id:'none',name:'No strap',w:2,l:16,mins:0,mat:0};
const strapOwn=k=>{const o=(S.sizes[k]||{}).strapCut;return o&&(o.file||+o.w||+o.l)?o:null};
const strapOf=k=>{const st=strapStyle(k),o=strapOwn(k);if(!o||st.id==='none')return st;return{...st,w:+o.w||+st.w,l:+o.l||+st.l,file:o.file||null,key:st.id+'@'+k,own:true}};
const orderSups=()=>(S.supplies||[]).filter(x=>x.use==='order');
const mailerEach=()=>orderSups().reduce((a,x)=>a+(+x.cost||0)*(+x.per||1),0)/Math.max(1,+S.cfg.fees.perOrder||1);
const supEach=kind=>(S.supplies||[]).reduce((a,x)=>a+((x.use==='item'||(kind==='bandana'&&x.use==='bandana'))?(+x.cost||0)*(+x.per||1):0),0);
const szFabric=()=>(S.fabrics.find(f=>!f.offcut&&f.grain!=='directional'&&f.cost>0)||S.fabrics.find(f=>!f.offcut)||{}).id;
function sizeYd(k){return memo('szyd:'+k,()=>{const z=S.sizes[k];if(!z||!z.cw||!z.cl)return null;const fid=szFabric(),f=fab(fid);let cp;try{cp=cutPlan({[k]:12},{body:f,strap:f,fast:true})}catch(e){return null}const kf=fid?fabFactor(fid).k:1;return {body:cp.yards/12*kf,strap:cp.strapYards/12*kf}})}
const sizeFab=(k,cost)=>{const y=sizeYd(k);return y?(y.body+y.strap)*(cost??avgFabCost()):0};
const sizeNotions=k=>{const z=S.sizes[k];return z&&z.notions!=null?+z.notions:.2};
const unitMat=k=>{const z=S.sizes[k];if(!z){const v=pv(k);return v?vMat(v):null}return (!z.cw||!z.cl)?null:sizeFab(k)+sizeNotions(k)+(+strapOf(k).mat||0)+supEach('bandana')+mailerEach()};
const memo=(k,f)=>{if(!RC)return f();if(!(k in RC))RC[k]=f();return RC[k]};
const VENTURE_MATS=[{id:'v1224',name:'24 × 12" mat',mw:24,ml:12,w:23.5,l:11.5,sub:'Loads sideways'},{id:'v2428',name:'24 × 28" mat',mw:24,ml:28,w:23.5,l:27.5,sub:'Full size'}];
const ventMat=()=>VENTURE_MATS.find(m=>m.id===S.cfg.cut.mat)||VENTURE_MATS[1];
function maxRects(W,H,items,gap,free0){
 let free=free0?free0.map(f=>({...f})):[{x:0,y:0,w:W+gap,h:H+gap}];const out=[];const E=1e-9;
 for(const it of items){const iw=it.w+gap,ih=it.h+gap;let best=null;
  const opts=it.fixed==null?[[iw,ih,false],[ih,iw,true]]:it.fixed?[[ih,iw,true]]:[[iw,ih,false]];
  for(const f of free)for(const [w,h,rot] of opts){if(w<=f.w+E&&h<=f.h+E){const ss=Math.min(f.w-w,f.h-h),ls=Math.max(f.w-w,f.h-h);const fy=f.y+h;if(!best||fy<best.fy-E||(Math.abs(fy-best.fy)<E&&(ss<best.ss-E||(Math.abs(ss-best.ss)<E&&(ls<best.ls-E||(Math.abs(ls-best.ls)<E&&f.x<best.x))))))best={x:f.x,y:f.y,fy,w,h,rot,ss,ls}}}
  if(!best)return null;
  out.push({...it,x:best.x,y:best.y,rot:best.rot,pw:best.rot?it.h:it.w,ph:best.rot?it.w:it.h});
  const r=best,nf=[];
  for(const f of free){if(r.x>=f.x+f.w-E||r.x+r.w<=f.x+E||r.y>=f.y+f.h-E||r.y+r.h<=f.y+E){nf.push(f);continue}
   if(r.x>f.x+E)nf.push({x:f.x,y:f.y,w:r.x-f.x,h:f.h});
   if(r.x+r.w<f.x+f.w-E)nf.push({x:r.x+r.w,y:f.y,w:f.x+f.w-r.x-r.w,h:f.h});
   if(r.y>f.y+E)nf.push({x:f.x,y:f.y,w:f.w,h:r.y-f.y});
   if(r.y+r.h<f.y+f.h-E)nf.push({x:f.x,y:r.y+r.h,w:f.w,h:f.y+f.h-r.y-r.h})}
  free=nf.filter((a,i)=>!nf.some((b,j)=>j!==i&&a.x>=b.x-E&&a.y>=b.y-E&&a.x+a.w<=b.x+b.w+E&&a.y+a.h<=b.y+b.h+E&&(j<i||a.w*a.h<b.w*b.h-E)));
 }
 out.free=free;return out;
}
function freeOf(W,L,g,pieces){let free=[{x:0,y:0,w:W+g,h:L+g}];const E=1e-9;
 for(const p of pieces){const r={x:p.x,y:p.y,w:p.pw+g,h:p.ph+g},nf=[];
  for(const f of free){if(r.x>=f.x+f.w-E||r.x+r.w<=f.x+E||r.y>=f.y+f.h-E||r.y+r.h<=f.y+E){nf.push(f);continue}
   if(r.x>f.x+E)nf.push({x:f.x,y:f.y,w:r.x-f.x,h:f.h});if(r.x+r.w<f.x+f.w-E)nf.push({x:r.x+r.w,y:f.y,w:f.x+f.w-r.x-r.w,h:f.h});
   if(r.y>f.y+E)nf.push({x:f.x,y:f.y,w:f.w,h:r.y-f.y});if(r.y+r.h<f.y+f.h-E)nf.push({x:f.x,y:r.y+r.h,w:f.w,h:f.y+f.h-r.y-r.h})}
  free=nf.filter((a,i)=>!nf.some((b,j)=>j!==i&&a.x>=b.x-E&&a.y>=b.y-E&&a.x+a.w<=b.x+b.w+E&&a.y+a.h<=b.y+b.h+E&&(j<i||a.w*a.h<b.w*b.h-E)))}
 return free}
function repairMats(bm,all,W,L,g){const usedOf=m=>Math.max(0,...m.pieces.map(p=>p.y+p.ph)),areaOf=list=>list.reduce((a,m)=>a+W*usedOf(m),0);
 const effOf=m=>m.pieces.reduce((a,p)=>a+(p.kind==='strap'?p.pw*p.ph:p.n*p.bw*p.bl/2),0)/Math.max(1e-6,W*usedOf(m));
 const strip=u=>{const {x,y,rot,pw,ph,...rest}=u;return rest};
 const singles=u=>u.cnt>1?Array.from({length:u.cnt},()=>({...strip(u),cnt:1,n:1,w:u.bw,h:u.bl})):[strip(u)];
 const attempt=wi=>{const before=areaOf(bm),others=bm.filter((_,i)=>i!==wi).map(m=>({m,pieces:m.pieces.slice(),free:freeOf(W,L,g,m.pieces)}));
  const place=u=>{let best=null;for(const o of others){const r=maxRects(W,L,[u],g,o.free);if(!r)continue;const grow=Math.max(0,r[0].y+r[0].ph-Math.max(0,...o.pieces.map(p=>p.y+p.ph)));if(!best||grow<best.grow-1e-9)best={o,r,grow}}if(!best)return false;best.o.pieces.push(best.r[0]);best.o.free=best.r.free;return true};
  const src=bm[wi].pieces.slice().sort((a,b)=>b.pw*b.ph-a.pw*a.ph),left=[];for(const u of src){if(place(strip(u)))continue;for(const s1 of singles(u))if(!place(s1))left.push(s1)}
  let rest=null;if(left.length){rest=packMat(W,L,left,g);if(!rest)return false}
  const after=others.reduce((a,o)=>a+W*Math.max(0,...o.pieces.map(p=>p.y+p.ph)),0)+(rest?W*Math.max(0,...rest.map(p=>p.y+p.ph)):0);
  if(after>=before-1e-6)return false;
  others.forEach(o=>{o.m.pieces=o.pieces;if(o.m.fab==='strap'&&o.pieces.some(p=>p.kind!=='strap'))o.m.fab='body'});
  const old=bm[wi];if(rest){old.pieces=rest;old.fab=rest.some(p=>p.kind!=='strap')?'body':'strap'}else{bm.splice(wi,1);const ai=all.indexOf(old);if(ai>=0)all.splice(ai,1)}
  return true};
 for(let guard=0;guard<12&&bm.length>1;guard++){const order=bm.map((m,i)=>[effOf(m),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);let did=false;for(const wi of order){if(attempt(wi)){did=true;break}}if(!did)break}
 bm.forEach(m=>{m.pieces.free=freeOf(W,L,g,m.pieces)})}
const PACK_ORDERS=[(a,b)=>b.w*b.h-a.w*a.h,(a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h)||b.w*b.h-a.w*a.h,(a,b)=>b.h-a.h||b.w-a.w,(a,b)=>b.w-a.w||b.h-a.h];
function packMat(W,L,units,gap){let best=null,bu=Infinity;for(const o of PACK_ORDERS){const r=maxRects(W,L,[...units].sort(o),gap);if(r){const u=Math.max(0,...r.map(p=>p.y+p.ph));if(u<bu-1e-9){best=r;bu=u}}}return best}
const TOPS={up:{fixed:false,flip180:false},down:{fixed:false,flip180:true},left:{fixed:true,flip180:false},right:{fixed:true,flip180:true}};
const topOf=f=>TOPS[f&&f.top]?f.top:(f&&f.dir==='horizontal'?'left':'up');
const grainOf=f=>{const d=!!f&&f.grain==='directional';if(!d)return{dir:false,fixed:null,flip:true,flip180:false,sfixed:null};const t=TOPS[topOf(f)];return{dir:true,fixed:t.fixed,flip:f.way==='two',flip180:t.flip180,sfixed:S.cfg.cut.strapTurn===false?f.dir==='horizontal':null,top:topOf(f)}};
const MAT_COST=4;
function stripMats(SS,W,L,g,sfixed,fast){const w=SS[0].w,l=SS[0].l,E=1e-9;const allowV=sfixed!==true,allowH=sfixed!==false;
 const cap=(a,b)=>Math.floor((a+g)/(b+g)+E);const maxV=allowV?cap(W,w)*cap(L,l):0,maxH=allowH?cap(W,l)*cap(L,w):0,top=Math.max(1,maxV+maxH);
 const best=new Array(top+1).fill(null);/* best[t] = shortest mat holding t straps */
 for(let v=0;v<=maxV;v++)for(let h=0;h<=maxH;h++){const t=v+h;if(!t||t>top)continue;const its=[...Array(v)].map(()=>({kind:'strap',w,h:l,n:0,fixed:false})).concat([...Array(h)].map(()=>({kind:'strap',w,h:l,n:0,fixed:true})));
  for(const ord of fast?[its]:[its,its.slice().reverse()]){const r=maxRects(W,L,ord,g);if(!r)continue;const u=Math.max(0,...r.map(p=>p.y+p.ph));if(!best[t]||u<best[t].u-E)best[t]={u,r}}}
 for(let t=top-1;t>=1;t--)if(best[t+1]&&(!best[t]||best[t+1].u<best[t].u-E))best[t]={u:best[t+1].u,r:best[t+1].r.slice(0,t)};
 const N=SS.length,f=new Array(N+1).fill(Infinity),pick=new Array(N+1).fill(0);f[0]=0;
 for(let n=1;n<=N;n++)for(let t=1;t<=Math.min(n,top);t++){if(!best[t])continue;const c=f[n-t]+best[t].u+MAT_COST;if(c<f[n]-E){f[n]=c;pick[n]=t}}
 const ts=[];for(let n=N;n>0&&pick[n];n-=pick[n])ts.push(pick[n]);ts.sort((a,b)=>b-a);
 let i=0;return ts.map(t=>({fab:'strap',pieces:best[t].r.slice(0,t).map(p=>({...p,k:SS[i++].k}))}))}
function shelfBodies(items,W,L,g,gr){if(!items.length)return[];const E=1e-9;const cnt={},dim={};items.forEach(b=>{cnt[b.k]=(cnt[b.k]||0)+1;dim[b.k]={w:b.w,l:b.l}});
 const rowLen=(w,l,k)=>{if(!gr.flip)return k*w+(k-1)*g;const d=g*Math.sqrt((w/2)**2+l*l)/l;return w+(k-1)*(w/2+d)};
 const kFit=(w,l,len)=>{if(len+E<w)return 0;if(!gr.flip)return Math.floor((len+g)/(w+g)+E);const d=g*Math.sqrt((w/2)**2+l*l)/l;return Math.floor((len-w)/(w/2+d)+E)+1};
 const mkRow=(k,n,along)=>{const {w,l}=dim[k],d=gr.flip?g*Math.sqrt((w/2)**2+l*l)/l:0,step=gr.flip?w/2+d:0;return{kind:'row',k,bw:w,bl:l,step,cnt:n,w:rowLen(w,l,n),h:l,n,fixed:along,fl:gr.flip180,_along:along}};
 /* split a run of n triangles into row units (one-way prints: singles side by side) */
 const units=(k,n,along)=>gr.flip?[mkRow(k,n,along)]:Array.from({length:n},()=>mkRow(k,1,along));
 const plan=(left,along,maxMats,how)=>{const Ls=along?L:W,D=along?W:L,c={...left},mats=[];
  const sizes=()=>Object.keys(c).filter(k=>c[k]>0&&dim[k].w<=Ls+E&&dim[k].l<=D+E).sort((a,b)=>dim[b].l-dim[a].l||dim[b].w-dim[a].w);
  while(sizes().length&&mats.length<maxMats){let pos=0;const rows=[];
   for(;;){const room=D-pos;const cand=sizes().filter(k=>dim[k].l<=room+E);if(!cand.length)break;
    /* the band takes the size that covers the most of its length; ties go to the tallest */
    /* build the band each candidate size would start, with shorter sizes filling its leftover length, and keep the fullest */
    const build=k0=>{const cc={...c},band=[];let x=0;const h=dim[k0].l;const put=(k,n)=>{units(k,n,along).forEach(u=>{u._x=x;u._y=pos;band.push(u);x+=u.w+g});cc[k]-=n};
     const n0=Math.min(cc[k0],kFit(dim[k0].w,dim[k0].l,Ls));if(!n0)return null;put(k0,n0);
     for(;;){const rem=Ls-x;let f=null;Object.keys(cc).forEach(k=>{if(!(cc[k]>0)||dim[k].l>h+E)return;const n=Math.min(cc[k],kFit(dim[k].w,dim[k].l,rem));if(n&&(!f||n*dim[k].w*dim[k].l>f.n*dim[f.k].w*dim[f.k].l))f={k,n}});if(!f)break;put(f.k,f.n)}
     const area=band.reduce((a,u)=>a+u.n*u.bw*u.bl/2,0);return{band,cc,h,fill:area/(Ls*h)}};
    let best=null;for(const k of (how==='tall'?cand.slice(0,1):cand)){const b=build(k);if(b&&(!best||b.fill>best.fill+1e-6))best=b}if(!best)break;
    Object.assign(c,best.cc);rows.push(...best.band);pos+=best.h+g}
   if(!rows.length)break;
   const pieces=rows.map(u=>{const {_x,_y,_along,...p}=u;return along?{...p,x:_y,y:_x,rot:true,pw:p.h,ph:p.w}:{...p,x:_x,y:_y,rot:false,pw:p.w,ph:p.h}});
   mats.push({fab:'body',pieces})}
  return{mats,left:c}};
 const usedOf=m=>Math.max(0,...m.pieces.map(p=>p.y+p.ph)),lenOf=ms=>ms.reduce((a,m)=>a+usedOf(m),0);
 const dirs=gr.fixed==null?[false,true]:[!!gr.fixed];let best=null;
 for(const along of dirs)for(const how of ['fill','tall']){const r=plan(cnt,along,999,how);if(Object.values(r.left).some(n=>n>0))continue;let ms=r.mats;
  /* last mat: also try it the other way round */
  if(dirs.length>1&&ms.length){const last=ms[ms.length-1],lc={};last.pieces.forEach(p=>lc[p.k]=(lc[p.k]||0)+p.n);const o=plan(lc,!along,1,how);if(!Object.values(o.left).some(n=>n>0)&&o.mats.length&&usedOf(o.mats[0])<usedOf(last)-E)ms=ms.slice(0,-1).concat(o.mats)}
  const fab=lenOf(ms)+ms.length*1e-3;if(!best||fab<best.fab-E)best={ms,fab}}
 const out=best?best.ms:[];out.forEach(m=>{m.pieces.free=freeOf(W,L,g,m.pieces)});return out}
function cutUnits(bodies,straps,gap,cap,gr,W,L){const u=[],by={};bodies.forEach(b=>{(by[b.k]=by[b.k]||[]).push(b)});
 Object.values(by).forEach(list=>{const {w,l}=list[0],k0=list[0].k;let n=list.length;
  if(cap&&gr.flip){const d=gap*Math.sqrt((w/2)**2+l*l)/l,step=w/2+d;const kOn=len=>len+1e-9>=w?Math.floor((len-w)/step+1e-9)+1:1;
   const kW=l<=L+1e-9?kOn(W):1,kL=l<=W+1e-9?kOn(L):1;let k=gr.fixed==null?Math.max(kW,kL):gr.fixed?kL:kW;if(cap!=='max')k=Math.min(k,cap);k=Math.max(1,k);
   while(n>0){const kk=Math.min(k,n);u.push({kind:'row',k:k0,bw:w,bl:l,step,cnt:kk,w:w+(kk-1)*step,h:l,n:kk,fixed:gr.fixed,fl:gr.flip180});n-=kk}}
  else while(n-->0)u.push({kind:'row',k:k0,bw:w,bl:l,step:0,cnt:1,w,h:l,n:1,fixed:gr.fixed,fl:gr.flip180})});
 straps.forEach(s=>u.push({kind:'strap',k:s.k,w:s.w,h:s.l,n:0,fixed:gr.sfixed}));return u}
function perms(a){return a.length<2?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]))}
function fitMax(W,L,gap,seq,mk,gr,mode){
 const pack=items=>{const {bodies,straps}=mk(items);for(const cap of ['max',2,0]){const r=packMat(W,L,cutUnits(bodies,straps,gap,cap,gr,W,L),gap);if(r)return r}return null};
 const kinds=[...new Set(seq.map(x=>x.key))];let orders=kinds.length<=3?perms(kinds):[kinds,[...kinds].reverse()];if(mode==='big')orders=orders.filter(o=>o[0]===seq[0].key);
 let best=null;
 for(const ord of orders){const sq=ord.flatMap(k=>seq.filter(x=>x.key===k));
  let area=0,hi=0;for(const it of sq){area+=it.area;if(area>W*L+1e-9)break;hi++}
  let lo=0,lr=null;while(lo<hi){const mid=Math.ceil((lo+hi)/2);const r=pack(sq.slice(0,mid));if(r){lo=mid;lr=r}else hi=mid-1}
  for(let n=lo;n>=Math.max(lo?1:0,lo-3);n--){const chosen=sq.slice(0,n),rest=sq.slice(n),failed=new Set();let r=n===lo?lr:(n?pack(chosen):null);
   /* top-up: try one more of each remaining size and keep the addition that leaves the mat most efficient */
   const effOf=(items,res)=>items.reduce((a,x)=>a+x.pa,0)/(W*Math.max(1e-6,...res.map(p=>p.y+p.ph)));
   for(;;){let pick=null;for(const key of new Set(rest.map(x=>x.key))){if(failed.has(key))continue;const i=rest.findIndex(x=>x.key===key);const t=pack([...chosen,rest[i]]);if(!t){failed.add(key);continue}const e=effOf([...chosen,rest[i]],t);if(!pick||e>pick.e+1e-9)pick={i,t,e}}
    if(!pick)break;chosen.push(rest[pick.i]);rest.splice(pick.i,1);r=pick.t}
   if(!r||!chosen.length||(mode==='big'&&!chosen.some(x=>x.key===seq[0].key)))continue;const used=Math.max(1e-6,...r.map(p=>p.y+p.ph)),eff=chosen.reduce((a,x)=>a+x.pa,0)/(W*used);
   if(!best||eff>best.eff+1e-6||(Math.abs(eff-best.eff)<=1e-6&&chosen.length>best.chosen.length))best={placed:r,chosen,rest,eff}}
 }
 return best||{placed:[],chosen:[],rest:[...seq]};
}
function polyArea(p){let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);return a/2}
function pieceOutline(kind,o){const f=o&&o.file;if(f&&f.outline&&f.outline.length)return{polys:f.outline,w:f.w,h:f.h,area:f.area||f.outline.reduce((a,p)=>a+Math.abs(polyArea(p)),0),file:true};
 if(kind==='body'){const w=+o.cw,l=+o.cl;return{polys:[[[0,0],[w,0],[w/2,l]]],w,h:l,area:w*l/2,file:false}}
 const w=+o.w,l=+o.l;return{polys:[[[0,0],[w,0],[w,l],[0,l]]],w,h:l,area:w*l,file:false}}
const NEST_MASKS=new Map();
function nestMask(key,ol,rot,R,d){const mk=key+'|'+ol.w+'x'+ol.h+'|'+(+ol.area).toFixed(3)+'|'+ol.polys.length+'|'+(ol.polys[0]||[]).length+'|'+rot+'|'+R+'|'+d;let m=NEST_MASKS.get(mk);if(m)return m;
 const cos=Math.round(Math.cos(rot*Math.PI/180)),sin=Math.round(Math.sin(rot*Math.PI/180));
 let polys=ol.polys.map(p=>p.map(([x,y])=>[x*cos-y*sin,x*sin+y*cos]));let mnx=Infinity,mny=Infinity,mxx=-Infinity,mxy=-Infinity;
 polys.forEach(p=>p.forEach(([x,y])=>{mnx=Math.min(mnx,x);mny=Math.min(mny,y);mxx=Math.max(mxx,x);mxy=Math.max(mxy,y)}));
 polys=polys.map(p=>p.map(([x,y])=>[x-mnx,y-mny]));const w=mxx-mnx,h=mxy-mny,cw=Math.max(1,Math.ceil(w/R-1e-6)),ch=Math.max(1,Math.ceil(h/R-1e-6));
 const bm=new Uint8Array(cw*ch);
 /* conservative fill: a cell is taken if the outline covers any part of it (three scanlines per row, edges rounded outward) */
 polys.forEach(p=>{for(let r=0;r<ch;r++){[r*R+1e-4,(r+.5)*R,(r+1)*R-1e-4].forEach(yy=>{const xs=[];for(let i=0,j=p.length-1;i<p.length;j=i++){const [x1,y1]=p[j],[x2,y2]=p[i];if((y1>yy)!==(y2>yy))xs.push(x1+(yy-y1)*(x2-x1)/(y2-y1))}xs.sort((a,b)=>a-b);
   for(let k=0;k+1<xs.length;k+=2){const a=Math.max(0,Math.floor(xs[k]/R)),b=Math.min(cw-1,Math.ceil(xs[k+1]/R)-1);for(let x=a;x<=b;x++)bm[r*cw+x]=1}});
   p.forEach(([x,y])=>{const rr=Math.min(ch-1,Math.floor(y/R)),cc=Math.min(cw-1,Math.floor(x/R));if(rr===r)bm[r*cw+cc]=1})}});
 const spans=(B,W,H)=>{const out=[];for(let r=0;r<H;r++){let x=0;while(x<W){if(B[r*W+x]){let e=x;while(e+1<W&&B[r*W+e+1])e++;out.push([r,x,e]);x=e+1}else x++}}return out};
 /* the gap: grow the shape by d cells all round for the collision test, so neighbours stay one blade gap apart */
 const DW=cw+2*d,DH=ch+2*d,dm=new Uint8Array(DW*DH);for(let r=0;r<ch;r++)for(let x=0;x<cw;x++)if(bm[r*cw+x])for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)dm[(r+d+dy)*DW+(x+d+dx)]=1;
 m={cw,ch,w,h,polys,raw:spans(bm,cw,ch),dil:spans(dm,DW,DH).map(([r,a,b])=>[r-d,a-d,b-d]),rot};NEST_MASKS.set(mk,m);if(NEST_MASKS.size>600)NEST_MASKS.delete(NEST_MASKS.keys().next().value);return m}
function nestMats(items,W,L,g,R){if(!items.length)return{mats:[],tooBig:[]};const orders=R<.5?['a','h','w']:['a'];let best=null;
 for(const o of orders){const r=nestMats1(items,W,L,g,R,o);const used=r.mats.reduce((a,m)=>a+Math.max(0,...m.pieces.map(p=>p.y+p.ph)),0)+r.mats.length*1e-3;if(!best||used<best.used-1e-6)best={r,used}}return best.r}
function nestMats1(items,W,L,g,R,order){const cols=Math.floor(W/R+1e-6),rows=Math.floor(L/R+1e-6),d=Math.ceil(g/R-1e-6);const mats=[];const sk=order==='h'?(x=>Math.max(x.ol.w,x.ol.h)):order==='w'?(x=>Math.min(x.ol.w,x.ol.h)):(x=>x.ol.area);let rest=items.slice().sort((a,b)=>sk(b)-sk(a)||b.ol.area-a.ol.area||String(a.key).localeCompare(String(b.key)));const tooBig=[];
 rest=rest.filter(it=>{const ok=it.rots.some(r=>{const m=nestMask(it.key,it.ol,r,R,d);return m.cw<=cols&&m.ch<=rows});if(!ok)tooBig.push(it);return ok});
 let guard=0;while(rest.length&&guard++<300){const occ=new Uint8Array(cols*rows),run=new Int16Array(cols*rows);
  const fixRow=r=>{let c=0;for(let x=cols-1;x>=0;x--){c=occ[r*cols+x]?0:c+1;run[r*cols+x]=c}};for(let r=0;r<rows;r++)fixRow(r);
  const fitAt=(m,x,y)=>{for(const [r,a,b] of m.dil){const yy=y+r;if(yy<0||yy>=rows)continue;const xa=Math.max(0,x+a),xb=Math.min(cols-1,x+b);if(xa>xb)continue;const fr=run[yy*cols+xa];if(fr<xb-xa+1)return xa+fr-a+1}return -1};
  const find=m=>{const mx=cols-m.cw,my=rows-m.ch;for(let y=0;y<=my;y++){let x=0;while(x<=mx){const nx=fitAt(m,x,y);if(nx<0)return{x,y};x=Math.max(x+1,nx)}}return null};
  const placed=[];const failed=new Set();
  for(let i=0;i<rest.length;){const it=rest[i];if(failed.has(it.key)){i++;continue}let best=null;
   for(const rot of it.rots){const m=nestMask(it.key,it.ol,rot,R,d);if(m.cw>cols||m.ch>rows)continue;const p=find(m);if(p&&(!best||p.y+m.ch<best.p.y+best.m.ch||(p.y+m.ch===best.p.y+best.m.ch&&p.x<best.p.x)))best={p,m}}
   if(!best){failed.add(it.key);i++;continue}
   const {p,m}=best;m.raw.forEach(([r,a,b])=>{for(let x=p.x+a;x<=p.x+b;x++)occ[(p.y+r)*cols+x]=1});for(let r=p.y;r<p.y+m.ch;r++)fixRow(r);
   const ox=p.x*R,oy=p.y*R;placed.push({kind:'poly',sub:it.sub,k:it.k,bow:it.bow,x:ox,y:oy,pw:m.w,ph:m.h,rot:m.rot,polys:m.polys.map(q=>q.map(([x,y])=>[ox+x,oy+y])),area:it.ol.area,n:it.sub==='body'?1:0,file:it.ol.file});rest.splice(i,1)}
  if(!placed.length)break;const mt={fab:items[0]&&items[0].sub==='body'?'body':items[0].sub==='bow'?'bow':'strap',pieces:placed};Object.defineProperty(mt,'_occ',{value:{occ,cols,rows,R,d},enumerable:false});mats.push(mt)}
 return{mats,tooBig}}
function nestFill(mats,items,g){const left=items.slice().sort((a,b)=>b.ol.area-a.ol.area);let n=0;
 mats.forEach(mt=>{const G=mt._occ;if(!G||!left.length)return;const {occ,cols,rows,R,d}=G;const maxRow=Math.ceil(Math.max(0,...mt.pieces.map(p=>p.y+p.ph))/R-1e-6);const run=new Int16Array(cols*rows);
  const fixRow=r=>{let c=0;for(let x=cols-1;x>=0;x--){c=occ[r*cols+x]?0:c+1;run[r*cols+x]=c}};for(let r=0;r<rows;r++)fixRow(r);
  const fitAt=(m,x,y)=>{for(const [r,a,b] of m.dil){const yy=y+r;if(yy<0||yy>=rows)continue;const xa=Math.max(0,x+a),xb=Math.min(cols-1,x+b);if(xa>xb)continue;const fr=run[yy*cols+xa];if(fr<xb-xa+1)return xa+fr-a+1}return -1};
  const find=m=>{const mx=cols-m.cw,my=Math.min(rows,maxRow)-m.ch;for(let y=0;y<=my;y++){let x=0;while(x<=mx){const nx=fitAt(m,x,y);if(nx<0)return{x,y};x=Math.max(x+1,nx)}}return null};
  for(let i=0;i<left.length;){const it=left[i];let best=null;for(const rot of it.rots){const m=nestMask(it.key,it.ol,rot,R,d);if(m.cw>cols)continue;const p=find(m);if(p&&(!best||p.y<best.p.y))best={p,m}}
   if(!best){i++;if(left.slice(i).every(x=>x.key===it.key))break;continue}const {p,m}=best;m.raw.forEach(([r,a,b])=>{for(let x=p.x+a;x<=p.x+b;x++)occ[(p.y+r)*cols+x]=1});for(let r=p.y;r<p.y+m.ch;r++)fixRow(r);
   const ox=p.x*R,oy=p.y*R;mt.pieces.push({kind:'poly',sub:it.sub,k:it.k,x:ox,y:oy,pw:m.w,ph:m.h,rot:m.rot,polys:m.polys.map(q=>q.map(([x,y])=>[ox+x,oy+y])),area:it.ol.area,n:0,off:true,file:it.ol.file});left.splice(i,1);n++}});
 return{left,n}}
function rotsFor(gr,isRect){if(gr.fixed==null)return isRect?[0,90]:[0,90,180,270];const b=gr.fixed?90:0;return gr.flip&&!isRect?[b,b+180]:[b]}
const hasOutlines=qty=>Object.entries(qty||{}).some(([k,n])=>n&&S.sizes[k]&&(S.sizes[k].file||strapOf(k).file));
const bowsIn=opt=>Object.entries((opt&&opt.prod)||{}).filter(([id,n])=>n>0&&!!pv(id));
const NEST_CACHE=new Map();
function nestKey(qty,opt,c,R){const fk=f=>f&&f.file?[f.file.name,f.file.w,f.file.h,(f.file.outline||[]).length]:0;return JSON.stringify([qty,opt.prod||0,opt.body&&[opt.body.id,opt.body.grain,opt.body.way,opt.body.top,opt.body.dir],opt.strap&&[opt.strap.id,opt.strap.grain,opt.strap.dir],c.width,c.matLen,c.mat,c.gap,c.buffer,c.bolt,R,Object.entries(S.sizes).map(([k,z])=>[k,z.cw,z.cl,z.strap,fk(z),z.strapCut?[z.strapCut.w,z.strapCut.l,fk(z.strapCut)]:0]),S.straps.map(s=>[s.id,s.w,s.l,fk(s)]),PV().map(b=>[b.id,b.w,b.l,b.pieces,fk(b),b.part,vPart(b)&&[vPart(b).w,vPart(b).l,vPart(b).pieces,fk(vPart(b))]])])}
function bowItems(opt){const gb=grainOf(opt.body),out=[];bowsIn(opt).forEach(([id,n])=>{const b=pv(id),ol=pieceOutline('bow',b),cnt=n*Math.max(1,b.pieces||1);for(let i=0;i<cnt;i++)out.push({key:'w'+id,sub:'bow',k:id,bow:id,ol,rots:rotsFor(gb,!ol.file)});const x=vPart(b);if(x){const xo=pieceOutline('bow',x),xc=n*Math.max(1,x.pieces||1);for(let i=0;i<xc;i++)out.push({key:'x'+x.id,sub:'bow',k:id,bow:id,ol:xo,rots:rotsFor(gb,!xo.file)})}});return out}
function finishMats(mats,SW,L){mats.forEach(m=>{m.used=Math.min(L,Math.max(0,...m.pieces.map(p=>p.y+p.ph)));m.pieceArea=m.pieces.reduce((a,p)=>a+(p.kind==='poly'?p.area:p.kind==='strap'?p.pw*p.ph:p.n*p.bw*p.bl/2),0);m.area=SW*m.used;m.waste=m.area?1-m.pieceArea/m.area:0;m.bandanas=m.pieces.reduce((a,p)=>a+(p.n||0),0);m.straps=m.pieces.filter(p=>p.kind==='strap'||p.sub==='strap').length;m.offStraps=m.pieces.filter(p=>p.sub==='strap'&&p.off).length;m.bows=m.pieces.filter(p=>p.sub==='bow').length})}
function cutPlan(qty,opt={}){const outl=hasOutlines(qty),bw=bowsIn(opt).length;if(!outl&&!bw&&opt.fast)return cutPlan0(qty,opt);
 const c=S.cfg.cut,R=opt.fast?.5:.125,key=nestKey(qty,opt,c,R);const hit=NEST_CACHE.get(key);if(hit)return hit;
 const res=outl?outlinePlan(qty,opt,R):addBowMats(cutPlan0(qty,opt),opt,R);NEST_CACHE.set(key,res);if(NEST_CACHE.size>120)NEST_CACHE.delete(NEST_CACHE.keys().next().value);return res}
function addBowMats(cp,opt,R){const c=S.cfg.cut,SW=+c.width,W=Math.min(SW,ventMat().w),L=Math.min(+c.matLen||ventMat().l,ventMat().l),g=Math.max(0,+c.gap||0);const items=bowItems(opt);if(!items.length)return cp;
 const nm=nestMats(items,W,L,g,R);finishMats(nm.mats,SW,L);const out=Object.assign({},cp);out.bwm=nm.mats;out.mats=cp.mats.concat(nm.mats);
 const across=cp.across,side=Math.max(0,c.bolt-across*SW),bl=nm.mats.reduce((a,m)=>a+m.used,0)/across,ba=nm.mats.reduce((a,m)=>a+m.area,0),bp=nm.mats.reduce((a,m)=>a+m.pieceArea,0);
 nm.mats.forEach(m=>{m.parts={corners:0,gaps:0,open:Math.max(0,m.area-m.pieceArea),edge:side>.01?side*m.used/across:0}});
 out.bowYards=bl/36*(1+c.buffer/100);out.cutArea=cp.cutArea+ba;out.pieceArea=cp.pieceArea+bp;out.sideArea=cp.sideArea+(side>.01?side*bl:0);out.inMat=out.cutArea-out.pieceArea;
 out.waste=out.cutArea+out.sideArea?Math.max(0,1-(out.pieceArea+cp.reuse+cp.kept)/(out.cutArea+out.sideArea)):0;out.tooBigBows=nm.tooBig.length;out.tooBig=cp.tooBig+nm.tooBig.length;
 const parts=Object.assign({},cp.parts);nm.mats.forEach(m=>Object.keys(parts).forEach(k=>parts[k]+=m.parts[k]));out.parts=parts;
 out.byFab=bowFab(cp.byFab.map(g=>Object.assign({},g,{parts:Object.assign({},g.parts)})),nm.mats,opt,c);return out}
function bowFab(groups,bmats,opt,c){if(!bmats.length)return groups;const f=opt.body||null,key=f?f.id:'_b';let gr=groups.find(x=>x.key===key);if(!gr){gr={key,f,name:f?f.name:'Body fabric',roles:new Set(),mats:0,area:0,pieces:0,parts:{corners:0,gaps:0,open:0,edge:0}};groups.push(gr)}
 gr.roles=new Set([...(gr.roles||[]),'bows']);bmats.forEach(m=>{gr.mats++;gr.area+=m.area+m.parts.edge;gr.pieces+=m.pieceArea;Object.keys(gr.parts).forEach(k=>gr.parts[k]+=m.parts[k])});
 gr.waste=Math.max(0,gr.area-gr.pieces-(gr.kept||0));gr.pct=gr.area?gr.waste/gr.area:0;gr.yd=gr.waste/(36*c.bolt);gr.cost=gr.f?gr.yd*gr.f.cost:null;gr.role=[...gr.roles].join(' and ');return groups}
function outlinePlan(qty,opt,R){const c=S.cfg.cut,SW=+c.width,W=Math.min(SW,ventMat().w),L=Math.min(+c.matLen||ventMat().l,ventMat().l),g=Math.max(0,+c.gap||0),E=1e-9;
 const gb=grainOf(opt.body),gs=grainOf(opt.strap),B=[],SS=[];
 Object.entries(qty).forEach(([k,n])=>{const z=S.sizes[k];if(!n||!z||!z.cw)return;const st=strapOf(k),bo=pieceOutline('body',z),so=st.id==='none'?null:pieceOutline('strap',st);
  for(let i=0;i<n;i++){B.push({key:'b'+k,sub:'body',k,ol:bo,rots:rotsFor(gb,false)});if(so)SS.push({key:'s'+(st.key||st.id),sub:'strap',k:st.id,ol:so,rots:rotsFor({fixed:gs.sfixed,flip:true},!so.file)})}});
 const sameF=!opt.strap||!opt.body||opt.strap===opt.body;
 /* bandanas keep one direction on a mat (tip to base along the same axis) so the mat cuts cleanly: try across and down, keep the shorter */
 let nb=null;{const axes=gb.fixed==null?[[0,180],[90,270]]:[null];const lenM=ms=>ms.reduce((a,m)=>a+Math.max(0,...m.pieces.map(p=>p.y+p.ph)),0);
  for(const ax of axes){const BB=ax?B.map(x=>({...x,rots:gb.flip?ax:[ax[0]]})):B;const r=nestMats(BB,W,L,g,R);if(!nb||r.tooBig.length<nb.tooBig.length||(r.tooBig.length===nb.tooBig.length&&lenM(r.mats)<lenM(nb.mats)))nb=r}}let SS2=SS,offCut=0;if(false){const fl=nestFill(nb.mats,SS,g);SS2=fl.left;offCut=fl.n}let ns=nestMats(SS2,W,L,g,R);
 /* same fabric: also try bandanas and straps nested together on shared mats, and keep whichever uses less length */
 if(false){const lenM=ms=>ms.reduce((a,m)=>a+Math.max(0,...m.pieces.map(p=>p.y+p.ph)),0);const all=nestMats(B.concat(SS),W,L,g,R);
  if(all.tooBig.length<=nb.tooBig.length+ns.tooBig.length&&lenM(all.mats)<lenM(nb.mats)+lenM(ns.mats)-.25){const bodyM=all.mats.filter(m=>m.pieces.some(p=>p.sub==='body')),strM=all.mats.filter(m=>!m.pieces.some(p=>p.sub==='body'));
   strM.forEach(m=>m.fab='strap');bodyM.forEach(m=>{m.fab='body';m.pieces.forEach(p=>{if(p.sub==='strap')p.off=true})});offCut=bodyM.reduce((a,m)=>a+m.pieces.filter(p=>p.sub==='strap').length,0);
   nb={mats:bodyM,tooBig:all.tooBig.filter(x=>x.sub==='body')};ns={mats:strM,tooBig:all.tooBig.filter(x=>x.sub!=='body')}}}
 const nw=nestMats(bowItems(opt),W,L,g,R);const bm=nb.mats,sm=ns.mats,bwm=nw.mats,mats=bm.concat(sm,bwm);finishMats(mats,SW,L);
 const across=Math.max(1,Math.floor(c.bolt/SW+E)),side=Math.max(0,c.bolt-across*SW);const lenOf=list=>list.reduce((a,m)=>a+m.used,0)/across;
 mats.forEach(m=>{m.parts={corners:0,gaps:0,open:Math.max(0,m.area-m.pieceArea),edge:side>.01?side*m.used/across:0}});
 const cutArea=mats.reduce((a,m)=>a+m.area,0),pieceArea=mats.reduce((a,m)=>a+m.pieceArea,0),len=lenOf(mats),sideArea=side>.01?side*len:0;
 const sameFab=!opt.strap||!opt.body||opt.strap===opt.body;const groups=[];
 bm.concat(sm).forEach(m=>{const f=m.fab==='body'?opt.body:(opt.strap||null),key=f?f.id:(m.fab==='body'?'_b':(sameFab?'_b':'_s'));let gr=groups.find(x=>x.key===key);if(!gr){gr={key,f,name:f?f.name:(key==='_b'?'Body fabric':'Strap fabric'),roles:new Set(),mats:0,area:0,pieces:0,parts:{corners:0,gaps:0,open:0,edge:0}};groups.push(gr)}
  gr.roles.add(m.fab==='body'?'bandanas':'straps');gr.mats++;gr.area+=m.area+m.parts.edge;gr.pieces+=m.pieceArea;Object.keys(gr.parts).forEach(k=>gr.parts[k]+=m.parts[k])});
 groups.forEach(gr=>{gr.waste=Math.max(0,gr.area-gr.pieces);gr.pct=gr.area?gr.waste/gr.area:0;gr.yd=gr.waste/(36*c.bolt);gr.cost=gr.f?gr.yd*gr.f.cost:null;gr.role=[...gr.roles].join(' and ')});
 const parts={corners:0,gaps:0,open:0,edge:0};mats.forEach(m=>Object.keys(parts).forEach(k=>parts[k]+=m.parts[k]));const buf=1+c.buffer/100;
 return{W,L,gap:g,mats,bm,sm,bwm,across,exact:side<=.01,parts,byFab:bowFab(groups,bwm,opt,c),outline:true,
  yards:lenOf(bm)/36*buf,strapYards:lenOf(sm)/36*buf,bowYards:lenOf(bwm)/36*buf,
  per:bm.length?Math.max(...bm.map(m=>m.bandanas)):0,bandanas:bm.reduce((a,m)=>a+m.bandanas,0),
  cutArea,pieceArea,sideArea,inMat:cutArea-pieceArea,reuse:0,offStraps:0,offCut,sameFab,strapRef:SS[0]?{w:SS[0].ol.w,l:SS[0].ol.h}:{w:2,l:16},floor:0,kLong:[],
  waste:cutArea+sideArea?Math.max(0,1-pieceArea/(cutArea+sideArea)):0,kept:0,keptCorners:0,keptOpen:0,keptEdge:0,bows:0,useSc:false,minS:2,bowW:0,bowL:0,rawWaste:cutArea+sideArea?1-pieceArea/(cutArea+sideArea):0,
  bodyWaste:(()=>{const a=bm.reduce((x,m)=>x+m.area,0);return a?1-bm.reduce((x,m)=>x+m.pieceArea,0)/a:0})(),strapWaste:(()=>{const a=sm.reduce((x,m)=>x+m.area,0);return a?1-sm.reduce((x,m)=>x+m.pieceArea,0)/a:0})(),
  tooBig:nb.tooBig.length+ns.tooBig.length+nw.tooBig.length,tooBigBodies:nb.tooBig.length,tooBigStraps:ns.tooBig.length,tooBigBows:nw.tooBig.length,gb,gs}}
function cutPlan0(qty,opt={}){
 const c=S.cfg.cut,SW=+c.width,W=Math.min(SW,ventMat().w),L=Math.min(+c.matLen||ventMat().l,ventMat().l),g=Math.max(0,+c.gap||0),E=1e-9;
 const gb=grainOf(opt.body),gs=grainOf(opt.strap);
 const fitsG=(w,l,gr)=>gr.fixed==null?((w<=W+E&&l<=L+E)||(l<=W+E&&w<=L+E)):gr.fixed?(l<=W+E&&w<=L+E):(w<=W+E&&l<=L+E);
 const B=[],SS=[];Object.entries(qty).forEach(([k,n])=>{const z=S.sizes[k];if(!n||!z||!z.cw)return;const st=strapOf(k);for(let i=0;i<n;i++){B.push({k,key:'b'+k,w:+z.cw,l:+z.cl,area:(+z.cw)*(+z.cl)/2,pa:(+z.cw)*(+z.cl)/2});SS.push({k,key:'s'+(st.key||st.id),w:+st.w,l:+st.l,area:(+st.w+g)*(+st.l+g),pa:(+st.w)*(+st.l)})}});
 B.sort((a,b)=>b.area-a.area||a.k.localeCompare(b.k));SS.sort((a,b)=>b.l-a.l);
 const okB=B.filter(x=>fitsG(x.w,x.l,gb)),okS=SS.filter(x=>fitsG(x.w,x.l,{fixed:gs.sfixed}));
 const mats=[];
 const fill=(seq,mk,fab,gr,mode)=>{const out=[];let rest=seq,guard=0;while(rest.length&&guard++<400){const r=fitMax(W,L,g,rest,mk,gr,mode);if(!r.chosen.length)break;out.push({fab,pieces:r.placed});rest=r.rest}out.forEach(m=>mats.push(m));return out};
 /* two whole-plan strategies for the bodies: most efficient mat first, or always place the biggest size first; keep whichever uses less fabric */
 shelfBodies(okB,W,L,g,gb).forEach(m=>mats.push(m));
 /* Straps from the scraps: when straps share the body fabric, cut as many as fit in each bandana mat's leftover space,
    never past the last bandana, so they only use fabric that would have been waste. The rest get their own mats. */
 const sameFab=(!opt.body&&!opt.strap)||(!!opt.body&&!!opt.strap&&opt.body.id===opt.strap.id);let offCut=0;
 /* Straps may lie across, along, or mixed. Free turning isn't always best for a greedy packer, so when straps can turn, try
    mixed, all-along and all-across, and keep whichever uses the least fabric. Only layouts that fit every strap count. */
 const snap=mats.map(m=>({m,pieces:m.pieces.slice(),free:m.pieces.free,fab:m.fab}));
 const restore=()=>{mats.length=0;snap.forEach(b=>{b.m.pieces=Object.assign(b.pieces.slice(),{free:b.free});b.m.fab=b.fab;mats.push(b.m)})};
 const strapStage=sf=>{const gS={...gs,sfixed:sf};let pool=SS.filter(x=>fitsG(x.w,x.l,{fixed:sf}));offCut=0;
  if(false)mats.filter(m=>m.fab==='body').forEach(m=>{const used=Math.max(0,...m.pieces.map(p=>p.y+p.ph));let fr=(m.pieces.free||[]).map(f=>({...f,h:Math.min(f.h,used+g-f.y)})).filter(f=>f.h>1e-6);const failed=new Set();
   for(let i=0;i<pool.length;){const s1=pool[i],key=s1.w+'x'+s1.l;if(failed.has(key)){i++;continue}const r=maxRects(0,0,[{kind:'strap',k:s1.k,w:s1.w,h:s1.l,n:0,fixed:sf,off:true}],g,fr);if(r){m.pieces.push(r[0]);fr=r.free;pool.splice(i,1);offCut++}else{failed.add(key);i++}}
   m.pieces.free=fr});
  fill(pool,a=>({bodies:[],straps:a}),'strap',gS,'eff');
  if(false)repairMats(mats.slice(),mats,W,L,g)};
 let variants=gs.sfixed==null?[null,false,true]:[gs.sfixed];
 variants=variants.filter(v=>SS.filter(x=>fitsG(x.w,x.l,{fixed:v})).length===okS.length);if(!variants.length)variants=[gs.sfixed];if(opt.fast)variants=variants.slice(0,1);
 const uni=new Set(okS.map(x=>x.w+'x'+x.l)).size===1&&okS.length===SS.length;
 if(uni&&SS.length){stripMats(SS,W,L,g,gs.sfixed,opt.fast).forEach(m=>mats.push(m))}
 else if(variants.length>1){let best=null;for(const v of variants){restore();strapStage(v);const area=mats.reduce((a,m)=>a+W*Math.max(0,...m.pieces.map(p=>p.y+p.ph)),0);if(!best||area<best.area-1e-6)best={v,area}}restore();strapStage(best.v)}
 else strapStage(variants[0]);
 mats.forEach(m=>{m.used=Math.min(L,Math.max(0,...m.pieces.map(p=>p.y+p.ph)));m.pieceArea=m.pieces.reduce((a,p)=>a+(p.kind==='strap'?p.pw*p.ph:p.n*p.bw*p.bl/2),0);m.area=SW*m.used;m.waste=m.area?1-m.pieceArea/m.area:0;m.bandanas=m.pieces.reduce((a,p)=>a+p.n,0);m.straps=m.pieces.filter(p=>p.kind==='strap').length});
 const across=Math.max(1,Math.floor(c.bolt/SW+E)),side=Math.max(0,c.bolt-across*SW);
 const lenOf=f=>mats.filter(m=>m.fab===f).reduce((a,m)=>a+m.used,0)/across;
 const len=lenOf('body')+lenOf('strap'),cutArea=mats.reduce((a,m)=>a+m.area,0),pieceArea=mats.reduce((a,m)=>a+m.pieceArea,0),sideArea=side>.01?side*len:0;
 const bm=mats.filter(m=>m.fab==='body'),sm=mats.filter(m=>m.fab==='strap');
 const ref=SS[0]||{w:+strapOf('M').w,l:+strapOf('M').l};let offStraps=0;
 /* straps are always cut on their own mats */
 const reuse=c.useScraps===true?0:Math.min(cutArea-pieceArea,offStraps*ref.w*ref.l);
 const kLong=[...new Set(B.map(x=>x.k))].map(k=>{const z=S.sizes[k],w=+z.cw,l=+z.cl,d=g*Math.sqrt((w/2)**2+l*l)/l,st=w/2+d,len=gb.flip?(gb.fixed==null?Math.max(W,L):gb.fixed?L:W):0;const kk=gb.flip&&len>=w?Math.floor((len-w)/st+1e-9)+1:1;return{k,n:B.filter(x=>x.k===k).length,kk,floor:gb.flip?1/(kk+1):.5}});
 const floor=B.length?kLong.reduce((a,x)=>a+x.floor*x.n,0)/B.length:0;
 /* Where the waste comes from, per mat: triangle corners left by nesting, blade gaps, and open space; plus the strip past the last full width of the bolt. */
 mats.forEach(m=>{let corners=0,gaps=0;m.pieces.forEach(p=>{if(p.kind!=='strap')corners+=p.pw*p.ph-p.n*p.bw*p.bl/2;gaps+=(p.pw+g)*(p.ph+g)-p.pw*p.ph});const open=Math.max(0,m.area-m.pieceArea-corners-gaps),tot=corners+gaps+open,k=tot?(m.area-m.pieceArea)/tot:0;m.parts={corners:corners*k,gaps:gaps*k,open:open*k,edge:side>.01?side*m.used/across:0}});
 /* Use the corners: the half-triangles at row ends and any open space big enough to be worth keeping are kept for bows and
    scrap packs instead of counted as waste. Only pieces at least the smallest useful size, inside fabric the mats already use. */
 const useSc=c.useScraps===true,minS=Math.max(.5,+c.minScrap||2),bowW=4,bowL=7;let keptCorners=0,keptOpen=0,keptEdge=0,bows=0;
 if(useSc){mats.forEach(m=>{m.voids=[];m.kept=0;m.bows=0;
   m.pieces.forEach(p=>{if(p.kind==='strap')return;const w=p.bw,l=p.bl,T=pts=>p.rot?pts.map(([u,v])=>[p.x+v,p.y+u]):pts.map(([u,v])=>[p.x+u,p.y+v]),F=pts=>p.fl?pts.map(([u,v])=>[u,l-v]):pts;
    if(Math.min(w/2,l)<minS)return;const x0=(p.cnt-1)*p.step,last=(p.cnt-1)%2?[[x0+w/2,0],[x0+w,0],[x0+w,l]]:[[x0+w,0],[x0+w,l],[x0+w/2,l]];
    [[[0,0],[w/2,l],[0,l]],last].forEach(v=>{m.voids.push(T(F(v)));m.kept+=w*l/4})});
   keptCorners+=m.kept;m.keptC=m.kept;
   if(!opt.fast){const used=m.used,free=freeOf(W,L,g,m.pieces).map(f=>({x:f.x,y:f.y,w:Math.min(f.w,W-f.x),h:Math.min(f.h,used-f.y)})).filter(f=>f.w>=minS-1e-9&&f.h>=minS-1e-9);
    m.bows=0;
    const R=.25,cols=Math.ceil(W/R),rows=Math.ceil(used/R),grid=new Uint8Array(cols*rows);let cnt=0;
    free.forEach(f=>{for(let y=Math.floor(f.y/R+1e-6);y<Math.min(rows,Math.ceil((f.y+f.h)/R-1e-6));y++)for(let x=Math.floor(f.x/R+1e-6);x<Math.min(cols,Math.ceil((f.x+f.w)/R-1e-6));x++){const k=y*cols+x;if(!grid[k]){grid[k]=1;cnt++}}});
    const open=Math.min(cnt*R*R,Math.max(0,m.area-m.pieceArea-m.kept));m.kept+=open;m.keptO=open;keptOpen+=open}
   if(side>=minS){const e=side*m.used/across;m.keptE=e;keptEdge+=e}})}
 const kept=keptCorners+keptOpen+keptEdge;
 const groups=[];mats.forEach(m=>{const f=m.fab==='body'?opt.body:(opt.strap||null),key=f?f.id:(m.fab==='body'?'_b':(sameFab?'_b':'_s'));let gr=groups.find(x=>x.key===key);if(!gr){gr={key,f,name:f?f.name:(key==='_b'?'Body fabric':'Strap fabric'),roles:new Set(),mats:0,area:0,pieces:0,parts:{corners:0,gaps:0,open:0,edge:0}};groups.push(gr)}
  gr.roles.add(m.fab==='body'?'bandanas':'straps');if(m.straps&&m.fab==='body')gr.roles.add('straps');gr.mats++;gr.area+=m.area+m.parts.edge;gr.pieces+=m.pieceArea;gr.kept=(gr.kept||0)+(m.kept||0)+(m.keptE||0);gr.kc=(gr.kc||0)+(m.keptC||0);gr.ko=(gr.ko||0)+(m.keptO||0);gr.ke=(gr.ke||0)+(m.keptE||0);Object.keys(gr.parts).forEach(k=>gr.parts[k]+=m.parts[k])});
 groups.forEach(gr=>{gr.waste=Math.max(0,gr.area-gr.pieces-(gr.kept||0));gr.pct=gr.area?gr.waste/gr.area:0;gr.yd=gr.waste/(36*c.bolt);gr.cost=gr.f?gr.yd*gr.f.cost:null;gr.role=[...gr.roles].join(' and ')});
 const parts={corners:0,gaps:0,open:0,edge:0};mats.forEach(m=>Object.keys(parts).forEach(k=>parts[k]+=m.parts[k]));
 const tooBigBodies=B.length-okB.length,tooBigStraps=SS.length-okS.length;
 return{W,L,gap:g,mats,bm,sm,across,exact:side<=.01,parts,byFab:groups,
  yards:lenOf('body')/36*(1+c.buffer/100),strapYards:lenOf('strap')/36*(1+c.buffer/100),
  per:bm.length?Math.max(...bm.map(m=>m.bandanas)):0,bandanas:bm.reduce((a,m)=>a+m.bandanas,0),
  cutArea,pieceArea,sideArea,inMat:cutArea-pieceArea,reuse,offStraps,offCut,sameFab,strapRef:ref,floor,kLong,
  waste:cutArea+sideArea?Math.max(0,1-(pieceArea+reuse+kept)/(cutArea+sideArea)):0,kept,keptCorners,keptOpen,keptEdge,bows,useSc,minS,bowW,bowL,rawWaste:cutArea+sideArea?1-pieceArea/(cutArea+sideArea):0,
  bodyWaste:(()=>{const a=bm.reduce((x,m)=>x+m.area,0);return a?1-bm.reduce((x,m)=>x+m.pieceArea,0)/a:0})(),
  strapWaste:(()=>{const a=sm.reduce((x,m)=>x+m.area,0);return a?1-sm.reduce((x,m)=>x+m.pieceArea,0)/a:0})(),
  tooBig:tooBigBodies+tooBigStraps,tooBigBodies,tooBigStraps,gb,gs};
}
function planNeeds(qty,bodyF,tiesF,bows){const n=planNeeds0(qty,bodyF,tiesF,bows);const k=fabFactor(bodyF).k;if(k===1)return n;const r=v=>Math.round(v*k*10)/10;return Object.assign({},n,{body:r(n.body),ties:n.ties?r(n.ties):n.ties,learned:k})}
function planNeeds0(qty,bodyF,tiesF,bows){const same=!!bodyF&&bodyF===tiesF;const cp=cutPlan(qty,{body:fab(bodyF),strap:fab(tiesF),prod:bows||{}});const r=n=>Math.round(n*10)/10,bwy=cp.bowYards||0;return same?{body:r(cp.yards+cp.strapYards+bwy),ties:0,same:true}:{body:r(cp.yards+bwy),ties:r(cp.strapYards),same:false}}
function pieceShapes(p){if(p.polys)return p.polys.map(pts=>({s:p.sub,pts}));const T=pts=>p.rot?pts.map(([u,v])=>[p.x+v,p.y+u]):pts.map(([u,v])=>[p.x+u,p.y+v]);
 if(p.kind==='strap')return[{s:'strap',pts:[[p.x,p.y],[p.x+p.pw,p.y],[p.x+p.pw,p.y+p.ph],[p.x,p.y+p.ph]]}];
 const w=p.bw,l=p.bl,out=[],F=pts=>p.fl?pts.map(([u,v])=>[u,l-v]):pts;for(let i=0;i<p.cnt;i++){const x0=i*p.step;out.push({s:'body',pts:T(F(i%2?[[x0,l],[x0+w,l],[x0+w/2,0]]:[[x0,0],[x0+w,0],[x0+w/2,l]]))})}return out}
const xmlEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function exportSvg(cp,r,only){const gap=1,f=n=>Math.round(n*1000)/1000,list=only!=null?[[cp.mats[only],only]]:cp.mats.map((m,i)=>[m,i]),tw=Math.max(1,list.length*(cp.W+gap)-gap);
 return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f(tw)}in" height="${f(cp.L)}in" viewBox="0 0 ${f(tw)} ${f(cp.L)}">\n<title>${xmlEsc(rnT(r))} cut layout, ${only!=null?'mat '+(only+1)+' of '+cp.mats.length:cp.mats.length+' mats'}, ${f(cp.W)} x ${f(cp.L)} in each</title>\n`+list.map(([m,i],n)=>{let j=0;return `<g id="mat-${i+1}-${m.fab==='strap'?'straps':m.fab==='bow'?'bows':'bodies'}" transform="translate(${f(n*(cp.W+gap))} 0)">\n`+m.pieces.flatMap(p=>pieceShapes(p).map(sh=>`  <path id="mat${i+1}-${p.k}-${sh.s}${p.off?'-from-scraps':''}-${++j}" d="M${sh.pts.map(([x,y])=>f(x)+' '+f(y)).join('L')}Z" fill="none" stroke="#000000" stroke-width="0.01"/>`)).join('\n')+'\n</g>'}).join('\n')+'\n</svg>\n'}
function fabRecords(){return memo('fabRecs',()=>{const R=[];S.runs.forEach(r=>{if(r.fabUse&&r.fabUse.length)r.fabUse.forEach(u=>{if(u.plan>0&&u.used>0)R.push({run:r.id,f:u.f,name:u.name,plan:u.plan,used:u.used,pcs:pieces(r)})});else if(r.review&&r.review.fabPlan>0&&r.review.fab>0)R.push({run:r.id,f:null,name:null,plan:r.review.fabPlan,used:r.review.fab,pcs:pieces(r)})});return R})}
const median=a=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2};
function fabFactor(fid){const R=fabRecords();if(S.cfg.learnFab===false)return{k:1,n:0,src:'off'};const own=fid?R.filter(x=>x.f===fid):[];if(own.length>=2)return{k:Math.max(.85,Math.min(1.5,median(own.map(x=>x.used/x.plan)))),n:own.length,src:'fabric'};if(R.length>=2)return{k:Math.max(.85,Math.min(1.5,median(R.map(x=>x.used/x.plan)))),n:R.length,src:'all'};return{k:1,n:R.length,src:'none'}}
const fabCostOf=r=>r.fabUse&&r.fabUse.length?r.fabUse.reduce((a,u)=>a+u.used*(u.cost||0),0):(r.fabrics||[]).reduce((a,x)=>{const f=fab(x.f);return a+x.need*(f?f.cost:0)},0);
const PV=()=>(S.products||[]).flatMap(p=>p.variants||[]);
const pv=id=>PV().find(v=>v.id===id);
const pvp=v=>v&&(S.products||[]).find(p=>p.id===v.pid);
const vArea=v=>{const f=v.file;return (f&&f.area?f.area:(+v.w||0)*(+v.l||0))*Math.max(1,v.pieces||1)};
const vFabYdOld=v=>vArea(v)*1.25/(36*Math.max(1,+S.cfg.cut.bolt||44))+(vPart(v)?partArea(vPart(v))*1.25/(36*Math.max(1,+S.cfg.cut.bolt||44)):0);
const vFabYd=v=>memo('vfyd:'+v.id+':'+v.w+'x'+v.l+':'+(v.pieces||1)+':'+(v.part||''),()=>{try{const fid=szFabric(),f=fab(fid);const cp=cutPlan({},{body:f,strap:f,prod:{[v.id]:12}});const y=(cp.bowYards||0)/12;return y>0?y*(fid?fabFactor(fid).k:1):vFabYdOld(v)}catch(e){return vFabYdOld(v)}});
const vFab=v=>vFabYd(v)*avgFabCost();
const vPart=v=>{const p=pvp(v);return p&&v.part?(p.parts||[]).find(x=>x.id===v.part)||null:null};
const partArea=x=>(x.file&&x.file.area?x.file.area:(+x.w||0)*(+x.l||0))*Math.max(1,x.pieces||1);
const vNotions=v=>(+v.notions||0)+(vPart(v)?(+vPart(v).notions||0):0);
const vMat=v=>vFab(v)+vNotions(v)+supEach('item')+mailerEach();
const prodSum=(map,fn)=>Object.entries(map||{}).reduce((a,[id,n])=>{const v=pv(id);return a+(v&&n?n*fn(v):0)},0);
const prodMat=map=>prodSum(map,vMat);
const prodNotions=map=>prodSum(map,vNotions);
const prodCount=(map,pid)=>Object.entries(map||{}).reduce((a,[id,n])=>{const v=pv(id);return a+(v&&(!pid||v.pid===pid)?(n||0):0)},0);
const strapCostOf=r=>Object.entries(r.qty||{}).reduce((a,[k,n])=>a+n*(+strapOf(k).mat||0),0);
function avgFabCost(){const fs=S.fabrics.filter(f=>!f.offcut&&f.cost>0);return fs.length?fs.reduce((a,f)=>a+f.cost,0)/fs.length:8.5}
const rnT=r=>{const n=String(r.name||''),i=n.indexOf(' — ');return i<0?n:n.slice(0,i)},rnP=r=>{const n=String(r.name||''),i=n.indexOf(' — '),t=i<0?'':n.slice(i+3);return t.charAt(0).toUpperCase()+t.slice(1)};
export {pieceShapes,exportSvg,cutPlan,cutPlan0,planNeeds,grainOf,topOf,strapOf,sizeYd,sizeFab,isLow,ventMat,VENTURE_MATS,TOPS,fabFactor};
