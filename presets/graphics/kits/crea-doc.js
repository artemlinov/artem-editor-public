// crea-doc.js (worker "crea"): the Claude doc with a comment rail, shared by doc1 and doc2.
// One component driven by a spec; every frame is a pure function of t (no timers, seeded typing rhythm).
//   const draw = CDOC.build(stage, P);  EG.run(dur, t => draw(t))
// P = { title, sub, size:{...}, rail:{open:t|null}, scrollTo:[[t, rowIndex, w?]]  (that row springs to the top of the page),
//       rows:[{parts:['plain words', {a:'anchored words', c:{note, tag, time, in, pre, sel:[t0,t1], type:[t0,t1], post, tagAt}}, ...]}] }
//   a    = the anchored words (highlighted), c = the comment on them (pre:1 = already there when the page opens)
//   c.in = the comment card lands; c.sel = a drag-select with the cursor; c.type = the note is typed between these times;
//   c.post = the comment is posted (focus ring off); c.tagAt = the kind tag lights up (default: with the card)
//   rail.open = when the page slides left to make room for the rail (null: open from the first frame)
window.CDOC=(()=>{
const C=EG.clamp,L=EG.lerp;
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^s>>>15,1|s);t=(t+Math.imul(t^t>>>7,61|t))^t;return((t^t>>>14)>>>0)/4294967296}}
const CSS=`
.cd-pg{position:absolute;background:#fff;border-radius:28px;box-shadow:0 34px 90px rgba(16,48,94,.16),0 3px 10px rgba(16,48,94,.07);overflow:hidden}
.cd-hd{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:14px;background:#fff;border-bottom:1.5px solid #E7E9EF;z-index:3;font-weight:600;color:var(--eg-ink);white-space:nowrap}
.cd-hd .sub{margin-left:auto;font-weight:500;color:var(--eg-muted)}
.cd-vp{position:absolute;left:0;right:0;bottom:0;overflow:hidden}
.cd-rows{position:absolute;top:0}
.cd-row{position:absolute;left:0;right:0}
.cd-row p{margin:0;position:relative;font-weight:400;letter-spacing:-.006em;color:#2A2D33}
.cd-hl{position:absolute;border-radius:7px;background:var(--eg-blue);opacity:0}
.cd-fade{position:absolute;left:0;right:0;bottom:0;height:64px;background:linear-gradient(rgba(255,255,255,0),#fff 88%);z-index:2}
.cd-rl{position:absolute;overflow:hidden;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 8px,#000 calc(100% - 46px),transparent 100%)}
.cd-rli{position:absolute;left:44px;right:44px;top:-4px}
.cd-cc{position:absolute;left:0;right:0;box-sizing:border-box;background:#fff;border-radius:22px;box-shadow:0 18px 48px rgba(16,48,94,.14),0 2px 8px rgba(16,48,94,.07)}
.cd-ch{display:flex;align-items:center;gap:12px}
.cd-av{border-radius:50%;background:#407BD9;color:#fff;font-weight:500;display:flex;align-items:center;justify-content:center;flex:none;letter-spacing:.02em}
.cd-nm{font-weight:600;color:var(--eg-ink);white-space:nowrap}
.cd-tm{color:#919191;font-weight:400;white-space:nowrap}
.cd-tg{margin-left:auto;font-weight:600;color:var(--eg-blue);background:var(--eg-blue-soft);border-radius:999px;white-space:nowrap;transform-origin:100% 50%}
.cd-nt{position:relative;color:#2A2D33;font-weight:400;letter-spacing:-.004em}
.cd-re{visibility:hidden}
.cd-car{position:absolute;width:3px;border-radius:2px;background:var(--eg-blue);margin-left:2px}
.cd-ring{position:absolute;inset:0;border-radius:22px;box-shadow:0 0 0 3.5px var(--eg-blue),0 0 0 9px rgba(0,117,253,.16);opacity:0;pointer-events:none}
.cd-cur{position:absolute;left:0;top:0;z-index:9;filter:drop-shadow(0 2px 3px rgba(0,0,0,.28))}
`;
const IBEAM=`<svg width="24" height="44" viewBox="0 0 24 44" style="display:block"><g fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M5 4h4.6a2.4 2.4 0 0 1 2.4 2.4A2.4 2.4 0 0 1 14.4 4H19M5 40h4.6a2.4 2.4 0 0 0 2.4-2.4 2.4 2.4 0 0 0 2.4 2.4H19M12 6.4v31.2" stroke="#fff" stroke-width="6"/>
<path d="M5 4h4.6a2.4 2.4 0 0 1 2.4 2.4A2.4 2.4 0 0 1 14.4 4H19M5 40h4.6a2.4 2.4 0 0 0 2.4-2.4 2.4 2.4 0 0 0 2.4 2.4H19M12 6.4v31.2" stroke="#15171B" stroke-width="2.6"/></g></svg>`;
function el(tag,cls,parent){const d=document.createElement(tag);if(cls)d.className=cls;if(parent)parent.appendChild(d);return d}
function build(stage,P){
 if(!document.getElementById('cd-css')){const s=el('style','',document.head);s.id='cd-css';s.textContent=CSS}
 const Z=Object.assign({fs:38,lh:54,nfs:32,nlh:44,tfs:24,hfs:27,pw:1010,cw:644,gap:36,pad:56,cpx:26,cpy:20,rowGap:34,cardGap:14,hh:76,top:26,py:65,ph:950,av:44,nmfs:26,name:'Artem Linov',initials:'AL'},P.size||{});
 const pg=el('div','cd-pg',stage);Object.assign(pg.style,{top:Z.py+'px',width:Z.pw+'px',height:Z.ph+'px'});
 const hd=el('div','cd-hd',pg);Object.assign(hd.style,{height:Z.hh+'px',padding:`0 ${Z.pad}px`,fontSize:Z.hfs+'px',boxSizing:'border-box'});
 hd.innerHTML=`<img src="../_lib/claude.png" style="width:${Z.hfs+9}px;height:${Z.hfs+9}px"><span></span><span class="sub"></span>`;hd.children[1].textContent=P.title;hd.children[2].textContent=P.sub||'';
 const vp=el('div','cd-vp',pg);vp.style.top=Z.hh+'px';
 const rowsEl=el('div','cd-rows',vp);Object.assign(rowsEl.style,{left:Z.pad+'px',right:Z.pad+'px'});
 el('div','cd-fade',pg);
 const rl=el('div','cd-rl',stage);Object.assign(rl.style,{top:(Z.py+Z.hh+4)+'px',height:(Z.ph-Z.hh+56)+'px',width:(Z.cw+88)+'px'});
 const rli=el('div','cd-rli',rl);
 const cur=el('div','cd-cur',stage);cur.innerHTML=IBEAM;cur.style.opacity=0;
 // a row = one paragraph; its parts are plain strings and anchors {a:'words', c:{comment}} (several anchors per row are fine)
 const anchors=[];
 const rows=P.rows.map((r,i)=>{const R={i,el:el('div','cd-row',rowsEl),as:[]};
  R.hls=el('div','',R.el);R.p=el('p','',R.el);Object.assign(R.p.style,{fontSize:Z.fs+'px',lineHeight:Z.lh+'px'});
  (r.parts||[r.pre||'',{a:r.a||'',c:r.c},r.post||'']).forEach(q=>{
   if(typeof q==='string'){if(q)R.p.appendChild(document.createTextNode(q));return}
   if(!q.a)return;const A={R,c:q.c,k:anchors.length};A.an=el('span','',R.p);A.an.textContent=q.a;R.as.push(A);anchors.push(A);
   const c=q.c;if(!c)return;const cc=A.cc=el('div','cd-cc',rli);cc.style.padding=`${Z.cpy}px ${Z.cpx}px`;
   // Claude's default comment header (pass 2): a blue circle with white initials, the name, a grey time
   const ch=el('div','cd-ch',cc);ch.style.gap=Math.round(Z.av*.26)+'px';const av=el('span','cd-av',ch);av.textContent=Z.initials;Object.assign(av.style,{width:Z.av+'px',height:Z.av+'px',fontSize:Math.round(Z.av*.37)+'px'});
   const nm=el('span','cd-nm',ch);nm.textContent=Z.name;nm.style.fontSize=Z.nmfs+'px';
   A.tm=el('span','cd-tm',ch);A.tm.textContent=c.time||'Just now';A.tm.style.fontSize=(Z.nmfs-1)+'px';
   if(c.tag){A.tg=el('span','cd-tg',ch);A.tg.textContent=c.tag;Object.assign(A.tg.style,{fontSize:Z.tfs+'px',padding:`${Math.round(Z.tfs*.26)}px ${Math.round(Z.tfs*.62)}px`})}
   const nt=el('div','cd-nt',cc);Object.assign(nt.style,{fontSize:Z.nfs+'px',lineHeight:Z.nlh+'px',marginTop:'8px'});
   A.ty=el('span','',nt);A.car=el('i','cd-car',nt);Object.assign(A.car.style,{height:Math.round(Z.nfs*1.08)+'px',marginTop:Math.round((Z.nlh-Z.nfs*1.08)/2)+'px'});A.re=el('span','cd-re',nt);A.re.textContent=c.note;
   A.ring=el('div','cd-ring',cc);A.n=-1;
   if(c.type){const rnd=rng(977*(A.k+1)+13);let acc=0;const T=[];for(const chx of c.note){acc+=(.55+.9*rnd())*(chx===' '?1.5:chx===','||chx==='.'?2.2:1);T.push(acc)}
    A.times=T.map(x=>c.type[0]+x/acc*(c.type[1]-c.type[0]))}});
  return R});
 let M=null;
 // rows flow down the page; each card sits beside its anchor's line and is pushed down by the card above it.
 // Z.couple (doc2): a row also waits for its card, so every line and its comment stay on one level.
 function measure(){M={};let y=Z.top,cb=-1e9;
  rows.forEach(R=>{R.top=y;R.el.style.top=y+'px';const rh=R.el.offsetHeight,b=R.el.getBoundingClientRect();
   R.as.forEach(A=>{A.rects=[...A.an.getClientRects()].filter(q=>q.width>1).map(q=>({x:q.left-b.left-5,y:q.top-b.top+(q.height-Z.lh*.84)/2,w:q.width+10,h:Z.lh*.84}));
    A.len=A.rects.reduce((a,q)=>a+q.w,0)||1;A.hl=A.rects.map(q=>{const d=el('div','cd-hl',R.hls);Object.assign(d.style,{left:q.x+'px',top:q.y+'px',height:q.h+'px',width:'0px'});return d});
    if(A.cc){A.ctop=Math.max(y+A.rects[0].y-(Z.lh*.08+8),cb+Z.cardGap);A.cc.style.top=A.ctop+'px';A.h=A.cc.offsetHeight;cb=A.ctop+A.h}});
   y+=rh+Z.rowGap;if(Z.couple)y=Math.max(y,cb+Z.cardGap+8)});M.h=y}
 function head(A,p){let d=p*A.len;for(const q of A.rects){if(d<=q.w)return{x:q.x+d,y:q.y+q.h/2};d-=q.w}const q=A.rects[A.rects.length-1];return{x:q.x+q.w,y:q.y+q.h/2}}
 const sm=u=>u<.5?2*u*u:1-2*(1-u)*(1-u);
 const evs=anchors.filter(A=>A.c&&A.c.sel).sort((a,b)=>a.c.sel[0]-b.c.sel[0]);
 return function draw(t){
  if(!M)measure();
  const u=P.rail&&P.rail.open!=null?EG.spring(t,P.rail.open,0,1):1;
  const W=Z.pw+Z.gap+Z.cw,PX=L((1920-Z.pw)/2,(1920-W)/2,u);
  pg.style.left=PX.toFixed(2)+'px';rl.style.left=(PX+Z.pw+Z.gap-44).toFixed(2)+'px';
  EG.mat(pg,t,.02);
  let sy=0;(P.scrollTo||[]).forEach(([s,i,w])=>{sy=EG.spring(t,s,sy,rows[i].top-Z.top,w||7.5)});
  rowsEl.style.transform=`translateY(${(-sy).toFixed(2)}px)`;rli.style.transform=`translateY(${(-sy).toFixed(2)}px)`;
  rows.forEach(R=>EG.mat(R.el,t,.08+.05*R.i,{dy:26,blur:8,s0:.985}));
  anchors.forEach(A=>{const c=A.c;if(!c)return;
   const foc=c.type?C((t-c.in)/.2)*(1-EG.E.quart(C((t-(c.post??1e9))/.28))):0;
   const p=c.pre?1:c.sel?sm(C((t-c.sel[0])/(c.sel[1]-c.sel[0]))):EG.E.expo(C((t-(c.in-.05))/.34));
   const a=c.sel&&t<c.in?.26:.14+.12*foc;
   let d=p*A.len;A.hl.forEach((h,k)=>{const q=A.rects[k],w=C(d,0,q.w);d-=q.w;h.style.width=w.toFixed(2)+'px';h.style.opacity=w>0?a.toFixed(3):0});
   EG.mat(A.cc,t,c.pre?.16+.05*A.k:c.in,{dy:44});
   const gone=C((A.ctop+A.h-sy-6)/36);if(gone<1)A.cc.style.opacity=(A.cc.style.opacity*gone).toFixed(4);   // a card scrolled above the page leaves with its shadow
   if(A.tg){const ta=c.tagAt??(c.pre?-9:c.in+.07),x=t-ta,bp=1+.14*Math.sin(Math.PI*C(x/.3))*(x>0?1:0);EG.mat(A.tg,t,ta,{dy:12,blur:6,dur:.4,base:`scale(${bp.toFixed(4)})`})}
   let n=c.note.length;if(A.times){n=0;while(n<A.times.length&&A.times[n]<=t)n++}
   if(n!==A.n){A.n=n;A.ty.textContent=c.note.slice(0,n);A.re.textContent=c.note.slice(n)}
   const typing=A.times&&t>=c.type[0]-.25&&t<(c.post??1e9);
   A.car.style.opacity=typing?((n<c.note.length&&t>=c.type[0])||Math.floor(Math.abs(t-c.type[1])*2.4)%2===0?1:0):0;
   if(c.type)A.tm.style.opacity=c.post!=null?C((t-c.post)/.2).toFixed(3):0;   // a comment still being typed has no time yet
   A.ring.style.opacity=foc.toFixed(3)});
  // cursor: glides to the anchor, drags across it, hides while he types
  let cx=0,cy=0,co=0;evs.forEach((A,k)=>{const c=A.c,a0=head(A,0),t0=c.sel[0]-.6,ox=PX+Z.pad,oy=Z.py+Z.hh+A.R.top-sy;
   if(k===0){cx=ox+a0.x+250;cy=oy+a0.y+190}
   if(t<=t0)return;const g=1-(1+9*(t-t0))*Math.exp(-9*(t-t0));let x=L(cx,ox+a0.x,g),y=L(cy,oy+a0.y,g);
   if(t>=c.sel[0]){const h=head(A,sm(C((t-c.sel[0])/(c.sel[1]-c.sel[0])))),m=C((t-c.sel[0])/.07);x=L(x,ox+h.x,m);y=L(y,oy+h.y,m)}
   cx=x;cy=y;co=C((t-t0)/.16)*(1-C((t-((c.type?c.type[0]:c.in)+.05))/.16))});
  cur.style.opacity=co.toFixed(3);cur.style.transform=`translate(${(cx-12).toFixed(2)}px,${(cy-22).toFixed(2)}px) scale(${(Z.lh/44).toFixed(3)})`;
 }}
return {build,rng};
})();
