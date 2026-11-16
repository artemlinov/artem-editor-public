// lay worker kit (video 13): the "camera + edit" layout, Artem's option A (graphics/layout-options/index.html?o=A).
// ONE big player (1250 wide at x=118), the segmented switch "Opus 5.5 | Fable 5.2" above it, the scrub bar with the
// edit's own timecode under it, his camera as the card on the right (LAY.CARD). Shared by lay1 and lay2.
// It can open from the full-screen side by side (sbs-kit.js geometry and chips): Fable's player grows into the big
// player, the two name chips become the switch, the pair's scrub bar becomes the player's.
// Needs eg.js, layout.js, sbs-kit.js. Everything is a pure function of t. All times in a spec are TIMELINE FRAMES.
//
// LAYA.run({
//   f0, nf            first timeline frame of the render, number of frames
//   FR                frames cache dir (with trailing slash)
//   seqs              {key: [dir name, file count, first SOURCE frame of that edit]}
//   ar                [[dir name, file count, first timeline frame, (use from this timeline frame)]]  his camera
//   sbs               {o:[seq key, source frame], crown: frame, morph: frame}  or null (layout A from the start)
//   tin               frame the camera starts shrinking into its card (null: the card materializes at the morph)
//   tout, outN        frame the hand-back starts, its length in frames (ends exactly on full-frame camera)
//   clips             what the big player shows, in order: {f: frame, m:'o'|'f', q: seq key, src: source frame,
//                      max: last source frame (holds there), pause:[from, to) frames, cam:[[frame, zoom, fx, fy]],
//                      drift:[from, to, dz, dfx, dfy, linear?], ring:{f, x, y, d},
//                      lens:{f, sx, sy, x, y, r, mag}  a magnifying glass centred at (x, y) of the player that shows the
//                      point (sx, sy) of the picture enlarged; the whole picture stays visible (pair it with a small ring on the detail)}
// })
// The switch flips wherever two neighbouring clips have a different model; its thumb starts 4 frames early so the
// speed peak of the house spring lands on the frame given (the speech joint). Zoom moves do the same.
window.LAYA=(()=>{
const C=EG.clamp,L=EG.lerp,E=EG.E,F=30000/1001,W=7.5;
const A={x:118,w:1250,h:1250*9/16};A.top=(1080-(68+26+A.h+18+44))/2;A.py=A.top+94;A.by=A.py+A.h+18;A.cx=A.x+A.w/2;
const G=SBS.G,GT=G.CY-G.H/2,TOT={f:2410,o:2395},INK=[28,30,34],MUT=[139,143,154];
document.head.insertAdjacentHTML('beforeend',`<style>
#arb{position:absolute;overflow:hidden;z-index:5}#arb img{position:absolute;display:block}
.la-pl{position:absolute;border-radius:16px;overflow:hidden;background:#0b0c10;box-shadow:0 30px 80px rgba(16,48,94,.22),0 3px 10px rgba(16,48,94,.08)}
.la-pl::after{content:"";position:absolute;inset:0;border-radius:16px;box-shadow:inset 0 0 0 2px rgba(16,48,94,.16)}
.la-pl img{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.la-pl .z{position:absolute;left:0;top:0;width:100%;height:100%}
.la-ring{position:absolute;border-radius:50%;box-sizing:border-box;border:5px solid var(--eg-blue);box-shadow:0 0 0 2px rgba(255,255,255,.9),inset 0 0 0 2px rgba(255,255,255,.9),0 8px 22px rgba(0,117,253,.4);visibility:hidden}
.la-lens{position:absolute;border-radius:50%;overflow:hidden;background:#fff;z-index:4;visibility:hidden;box-shadow:0 0 0 5px #fff,0 0 0 8px var(--eg-blue),0 18px 50px rgba(16,48,94,.35),0 3px 10px rgba(16,48,94,.2)}
.la-lens img{position:absolute;display:block;max-width:none}
.la-g,.la-in{position:absolute;left:0;top:0;width:1920px;height:1080px}
.la-tray{position:absolute;border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(16,48,94,.12),0 1px 3px rgba(16,48,94,.08)}
.la-thumb{position:absolute;border-radius:13px;background:var(--eg-blue-soft);box-shadow:inset 0 0 0 3px var(--eg-blue)}
.la-rip{position:absolute;box-shadow:0 0 0 3px var(--eg-blue);opacity:0}
.la-cbg{position:absolute;background:#fff;box-shadow:0 10px 30px rgba(16,48,94,.12),0 1px 3px rgba(16,48,94,.08)}
.la-wring{position:absolute;box-shadow:0 0 0 4px var(--eg-blue),0 12px 34px rgba(0,117,253,.32);opacity:0}
.la-lab{position:absolute;display:flex;align-items:center;gap:12px;font:500 27px var(--eg-font);white-space:nowrap}
.la-lab .sp{position:relative;width:28px;height:28px;flex:none}.la-lab .sp i{position:absolute;left:0;top:0}
#laCr{position:absolute;transform-origin:50% 90%;visibility:hidden}
.la-bar{position:absolute;display:flex;align-items:center;gap:18px;font-family:var(--eg-font);font-weight:500;color:var(--eg-ink);font-variant-numeric:tabular-nums}
.la-bar .trk{flex:1;border-radius:99px;background:rgba(16,48,94,.14);position:relative}
.la-bar .trk i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--eg-blue)}
.la-bar .trk u{position:absolute;top:50%;border-radius:50%;background:#fff;box-shadow:0 0 0 3px var(--eg-blue),0 4px 10px rgba(0,117,253,.35)}
.la-bar .end{color:var(--eg-muted)}
</style>`);
const px=v=>v.toFixed(2)+'px';
const put=(el,r,rad)=>{Object.assign(el.style,{left:px(r.x),top:px(r.y),width:px(r.w),height:px(r.h)});if(rad!=null)el.style.borderRadius=px(rad)};
const mix=(a,b,m)=>({x:L(a.x,b.x,m),y:L(a.y,b.y,m),w:L(a.w,b.w,m),h:L(a.h,b.h,m)});
function run(P){
 const st=document.querySelector('.stage'),T=f=>(f-P.f0)/F,S=P.sbs,q=s=>st.querySelector(s);
 const lab=n=>`<div class="la-lab"><span class="sp"><i>${SBS.spark(28)}</i><i>${SBS.spark(28,'#A9ACB5')}</i></span><span>${n}</span></div>`;
 st.insertAdjacentHTML('beforeend',`${S?'<div class="la-pl" id="laO"><img></div>':''}
<div class="la-pl" id="laP"><div class="z"><img><div class="la-ring"></div></div></div>
<div class="la-bar" id="laB"><span class="cur">0:00</span><div class="trk"><i></i><u></u></div><span class="end">1:20</span></div>
<div class="la-g" id="laT"><div class="la-tray"></div><div class="la-thumb"></div><div class="la-rip"></div></div>
<div class="la-g" id="laGO"><div class="la-in"><div class="la-cbg"></div>${lab('Opus 5.5')}</div></div>
<div class="la-g" id="laGF"><div class="la-in"><div class="la-cbg"></div><div class="la-wring"></div>${lab('Fable 5.2')}<div id="laCr">${SBS.crown(54)}</div></div></div>
<div class="la-lens" id="laL"><img></div><div id="arb"><img id="ari"></div>`);
 const po=q('#laO'),pl=q('#laP'),zel=q('#laP .z'),pimg=q('#laP img'),ring=q('.la-ring'),bar=q('#laB'),cur=q('#laB .cur'),trk=q('#laB .trk'),fill=q('#laB i'),knob=q('#laB u'),
  gT=q('#laT'),tray=q('.la-tray'),thumb=q('.la-thumb'),rip=q('.la-rip'),gO=q('#laGO'),gF=q('#laGF'),inO=q('#laGO .la-in'),inF=q('#laGF .la-in'),
  cbO=q('#laGO .la-cbg'),cbF=q('#laGF .la-cbg'),wr=q('.la-wring'),lO=q('#laGO .la-lab'),lF=q('#laGF .la-lab'),cr=q('#laCr'),arb=q('#arb'),ari=q('#ari'),lens=q('#laL'),limg=q('#laL img');
 for(const k in P.seqs)EG.seq(k,P.FR+P.seqs[k][0],P.seqs[k][1]);P.ar.forEach(a=>EG.seq(a[0],P.FR+a[0],a[1]));
 // source frame a clip shows on timeline frame k (pause and max hold the picture)
 const srcOf=(c,k)=>{let d=k-c.f;if(c.pause){const[a,b]=c.pause;if(k>=b)d-=b-a;else if(k>=a)d=a-c.f}
  let s=c.src+Math.max(0,d);if(c.max!=null)s=Math.min(s,c.max);const sq=P.seqs[c.q];return Math.min(s,sq[2]+sq[1]-1)};
 const show=(img,c,k)=>EG.frame(img,c.q,(srcOf(c,k)-P.seqs[c.q][2]+.5)/F);
 const flips=[];P.clips.forEach((c,i)=>{if(i&&c.m!==P.clips[i-1].m)flips.push([T(c.f),c.m==='f'?1:0])});
 const tm=S?T(S.morph):-9,ts=tm-.1,tc=S?T(S.crown):-9,tin=P.tin==null?-9:T(P.tin),tout=T(P.tout),X=tout-.05,TT=P.outN/F;
 let M=null;
 const paint=(l,on,b)=>{const c=INK.map((v,i)=>Math.round(L(MUT[i],v,on)));l.style.color=`rgb(${c})`;const s=l.firstChild.children;s[0].style.opacity=on.toFixed(3);s[1].style.opacity=((1-on)*.8).toFixed(3);
  l.style.transform=`scale(${b.toFixed(4)})`};
 EG.run(P.nf/F,async t=>{
  if(!M){const wo=lO.offsetWidth+40,wf=lF.offsetWidth+40,tw=wo+wf+24,tl=A.cx-tw/2;
   M={tw,tl,sO:{x:tl+8,y:A.top+8,w:wo,h:52},sF:{x:tl+16+wo,y:A.top+8,w:wf,h:52},cO:{x:G.XO+G.W/2-wo/2,y:GT-78,w:wo,h:58},cF:{x:G.XF+G.W/2-wf/2,y:GT-78,w:wf,h:58}}}
  const fr=P.f0+t*F,k=Math.floor(fr+1e-4),m=S?(t<=ts?0:1-(1+W*(t-ts))*Math.exp(-W*(t-ts))):1,won=S?E.quart(C((t-tc)/.28)):0,lift=S?EG.spring(t,tc,0,1)*(1-m):0;
  // his camera: the card (materializes at the morph, or shrinks from full frame), grows back to full frame at the hand-back
  LAY.aroll(arb,ari,LAY.u(t,tin,tout,TT));let a=P.ar[0];P.ar.forEach(x=>{if(k>=(x[3]??x[2]))a=x});
  await EG.frame(ari,a[0],(Math.max(0,k-a[2])+.5)/F);if(S)EG.mat(arb,t,tm+.20);
  // the big player: which clip, its picture, the push-in
  let ci=0;while(ci+1<P.clips.length&&k>=P.clips[ci+1].f)ci++;const c=P.clips[ci];await show(pimg,c,k);
  let z=1,fx=.5,fy=.5;(c.cam||[]).forEach(([f,kz,kx,ky])=>{const s=T(f)-4/F;z=EG.spring(t,s,z,kz);fx=EG.spring(t,s,fx,kx);fy=EG.spring(t,s,fy,ky)});
  if(c.drift){const[fa,fb,dz,dx,dy,lin]=c.drift;let u=C((fr-fa)/(fb-fa));if(!lin)u=u*u*(3-2*u);z+=dz*u;fx+=dx*u;fy+=dy*u}
  Object.assign(zel.style,{width:(z*100).toFixed(4)+'%',height:(z*100).toFixed(4)+'%',left:(C(.5-fx*z,1-z,0)*100).toFixed(4)+'%',top:(C(.5-fy*z,1-z,0)*100).toFixed(4)+'%'});
  if(c.ring&&fr>=c.ring.f){const x=t-T(c.ring.f),d=c.ring.d,p=E.expo(C(x/.35))*(1+.14*Math.exp(-7*x)*Math.sin(17*x));
   Object.assign(ring.style,{visibility:'visible',left:c.ring.x*100+'%',top:c.ring.y*100+'%',width:d+'px',height:d+'px',margin:`${-d/2}px 0 0 ${-d/2}px`,transform:`scale(${p.toFixed(4)})`,opacity:C(x/.12).toFixed(3)})}
  else ring.style.visibility='hidden';
  const pr=S?{x:L(G.XF,A.x,m),y:L(GT,A.py,m),w:L(G.W,A.w,m),h:L(G.H,A.h,m)}:{x:A.x,y:A.py,w:A.w,h:A.h};put(pl,pr);EG.mat(pl,t,S?.13:tin+.20,{exit:X});
  if(c.lens&&fr>=c.lens.f&&t<X){const n=c.lens,x=t-T(n.f),p=E.expo(C(x/.35))*(1+.14*Math.exp(-7*x)*Math.sin(17*x)),r=n.r;
   if(limg.dataset.src!==pimg.dataset.src){limg.dataset.src=pimg.dataset.src;limg.src=pimg.src;try{await limg.decode()}catch(e){}}
   Object.assign(lens.style,{visibility:'visible',left:px(pr.x+n.x*pr.w-r),top:px(pr.y+n.y*pr.h-r),width:px(2*r),height:px(2*r),transform:`scale(${p.toFixed(4)})`,opacity:C(x/.12).toFixed(3)});
   Object.assign(limg.style,{width:px(pr.w*n.mag),height:px(pr.h*n.mag),left:px(r-n.sx*pr.w*n.mag),top:px(r-n.sy*pr.h*n.mag)})}
  else lens.style.visibility='hidden';
  if(S){put(po,{x:G.XO,y:GT,w:G.W,h:G.H});if(t<ts+.6)await show(po.firstChild,{f:P.f0,q:S.o[0],src:S.o[1]},k);
   const op=EG.mat(po,t,.03,{exit:ts});po.style.opacity=(op*(1-.32*won)).toFixed(4);if(won>0)po.style.filter=(po.style.filter==='none'?'':po.style.filter+' ')+`saturate(${(1-.45*won).toFixed(3)})`}
  // the switch: which side is active, the labels' colour, the thumb
  let act=P.clips[0].m==='f'?1:0,onO=S?1-won:1-act,onF=S?1:act,bO=1,bF=1+(S&&t>tc?.10*Math.sin(Math.PI*C((t-tc)/.27)):0),rp=S?[tc,1]:null;
  flips.forEach(([tj,g])=>{act=EG.spring(t,tj-4/F,act,g);const u=E.quart(C((t-tj)/.28));onO=L(onO,1-g,u);onF=L(onF,g,u);
   if(t>tj){const b=.12*Math.sin(Math.PI*C((t-tj)/.27));if(g)bF+=b;else bO+=b;rp=[tj,g]}});
  const rO=mix(M.cO,M.sO,m),rF=mix(M.cF,M.sF,m),rad=L(14,13,m),sw=S?C((m-.25)/.5):1;
  put(cbO,rO,rad);put(cbF,rF,rad);cbO.style.opacity=((1-sw)*(1-.25*won)).toFixed(3);cbF.style.opacity=(1-sw).toFixed(3);
  put(wr,rF,rad);wr.style.opacity=(won*(1-C(m/.6))).toFixed(3);
  put(tray,{x:rO.x-8,y:rO.y+rO.h/2-34,w:rF.x+rF.w-rO.x+16,h:68});tray.style.opacity=sw.toFixed(3);put(thumb,mix(rO,rF,act),rad);thumb.style.opacity=sw.toFixed(3);
  [[lO,rO,onO,bO],[lF,rF,onF,bF]].forEach(([l,r,on,b])=>{Object.assign(l.style,{left:px(r.x+18),top:px(r.y),height:px(r.h)});paint(l,on,b)});
  inO.style.transformOrigin=`${px(rO.x+rO.w/2)} ${px(rO.y+rO.h/2)}`;inF.style.transformOrigin=`${px(rF.x+rF.w/2)} ${px(rF.y+rF.h/2)}`;
  inO.style.transform=`translateY(${(5*lift).toFixed(2)}px) scale(${(1-.04*lift).toFixed(4)})`;inF.style.transform=`translateY(${(-6*lift).toFixed(2)}px) scale(${(1+.05*lift).toFixed(4)})`;
  if(rp&&t>rp[0]&&t<rp[0]+.6){const x=C((t-rp[0])/.6),e=E.expo(x),r=rp[1]?rF:rO;put(rip,r,rad);rip.style.opacity=(.55*(1-e)).toFixed(3);rip.style.transform=`scale(${(1+.16*e).toFixed(4)},${(1+.55*e).toFixed(4)})`}else rip.style.opacity=0;
  if(S){const x=t-tc,by=x>0?7*Math.exp(-6*x)*Math.sin(15*x):0,rot=-17-14*(1-E.expo(C(x/.5)));Object.assign(cr.style,{left:px(M.cF.x+2),top:px(M.cF.y-37)});
   EG.mat(cr,t,tc,{dy:30,s0:.7,exit:ts,exitDur:.3,exitDy:24,base:`translateY(${(-by-6*lift).toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`})}
  const oc=`${px(A.cx)} ${px(A.top+34)}`;gT.style.transformOrigin=oc;gO.style.transformOrigin=S?inO.style.transformOrigin:oc;gF.style.transformOrigin=S?inF.style.transformOrigin:oc;
  EG.mat(gT,t,S?-9:tin+.10,{exit:X});EG.mat(gO,t,S?.09:tin+.10,{exit:X});EG.mat(gF,t,S?.19:tin+.10,{exit:X});
  // the scrub bar: the edit's own time; the knob springs to the new place on a seek
  put(bar,{x:L(960-G.BW/2,A.x+6,m),y:L(GT+G.H+22,A.by,m),w:L(G.BW,A.w-12,m),h:L(40,44,m)});bar.style.fontSize=px(L(23,24,m));trk.style.height=px(L(6,8,m));
  const kn=L(16,20,m);Object.assign(knob.style,{width:px(kn),height:px(kn),margin:`${px(-kn/2)} 0 0 ${px(-kn/2)}`});EG.mat(bar,t,S?.25:tin+.30,{dy:30,exit:X});
  const sc=srcOf(c,k),sec=sc/F;let p=sc/TOT[c.m];
  if(ci>0){const pc=P.clips[ci-1],x=t-T(c.f);p+=(srcOf(pc,c.f-1)/TOT[pc.m]-c.src/TOT[c.m])*(1+W*x)*Math.exp(-W*x)}
  cur.textContent=Math.floor(sec/60)+':'+String(Math.floor(sec%60)).padStart(2,'0');fill.style.width=(p*100).toFixed(3)+'%';knob.style.left=(p*100).toFixed(3)+'%';
 })}
return {run,A};
})();
