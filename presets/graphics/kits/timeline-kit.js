// timeline-kit.js (video 14, worker `timeline`): ONE editing-timeline component, used by tl-hook (H02-H03), tl-slop (A17-A20),
// tl-mono (B21) and tl-music (B23-B25; those two through timeline-strip.js). Everygen light look, not a copy of any one app.
// Everything is a pure function of t (no timers, no randomness: waveforms come from a seeded hash).
//
//   const T=TLK.timeline(stage,{tracks:[{id:'video',label:'Video',icon:'film',color:'#0075FD',tint:'#E8F3FF'},...],headW:170,hT:0,hR:26,span:100});
//   T.place(x,y,w,[h per track]);                 every frame: the card's rectangle; a track with height 0 is not there yet; T.H(hs) = its height
//   const c=T.clip('voice',{kind:'wave',wave:'voice',seed:3,color:'#0075FD',tint:'#E8F3FF'});   kinds: film | wave | block
//   c.set(u,w,{op,sx,sy,rl,rr,gap,flat,amp,red,dy,over,sub:[i,n],fullW,col,tint,c,gray,ov,ovOp});
//        u,w in timeline units (0..span); flat 0..1 evens a waveform out; amp > 1 with over:true lets it burst out of its lane;
//        sub stacks n clips in one lane; rl/rr 0 = still joined to its neighbour (no seam drawn); ov/ovOp = a colour label over a film clip
//   T.X(u), T.Y('voice',.5)                       stage coordinates of a unit / a lane (for cursors); T.playhead(u,op); T.tick(track,p)
//   T.layer()                                     a second set of clips in the same lanes (wipe between two arrangements with clip-path)
//   const cu=TLK.cursor(stage,{name:'Cutter',color:'#0075FD',icon:'scissors',big:1});   a role cursor: arrow + name tag (the tag slides to
//        the cursor's left near the right edge); const p=TLK.path(keys)(t); cu.set(p.x,p.y,p)   keys = [{t,x,y,click,d,ease,bend,up}]
//   const pv=TLK.preview(stage); pv.set({x,y,w,h},{rad,zoom,raw,wipe,sh}); await pv.frame('seqname',t)
//        his live camera (EG.seq frames), cover-cropped around his face for any aspect; pv.ov = overlay layer, 1em = 1% of its width
//   TLK.slop(pv.ov)                               the three landing-page style graphics of A18, returns [stat card, pipeline list, banner]
//        (worker `hook` uses the same call in hk-vs, so the two rhyme: keep it stable)
window.TLK=(()=>{
const C=EG.clamp,L=EG.lerp;
const mk=(cls,par,html,tag)=>{const d=document.createElement(tag||'div');if(cls)d.className=cls;if(html!=null)d.innerHTML=html;if(par)par.appendChild(d);return d};
const h01=(a,b)=>{let h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296};
const sp=(t,s,w=7.5)=>{if(t<=s)return 0;const x=t-s;return 1-(1+w*x)*Math.exp(-w*x)};          // house spring as progress 0..1
const pop=(t,s)=>{const x=t-s;return x<=0?0:1-Math.exp(-10*x)*Math.cos(12*x)};                  // springy arrival, about 7% overshoot
const IC={
 scissors:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
 search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
 layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
 music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 check:'<polyline points="20 6 9 17 4 12"/>',
 checkc:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
 film:'<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
 mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
 volume:'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
 zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
 folder:'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
 phone:'<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
 sun:'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
 moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
 play:'<polygon points="5 3 19 12 5 21 5 3"/>',
 heart:'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
 msg:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
 send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
 x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
 clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 type:'<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
 arrow:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
 activity:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
 users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
};
const ico=(n,s=24,col='currentColor',sw=2)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${IC[n]}</svg>`;
const YT=s=>`<svg width="${s*1.4}" height="${s}" viewBox="0 0 28 20"><path d="M27.4 3.1A3.5 3.5 0 0 0 24.9.6C22.7 0 14 0 14 0S5.3 0 3.1.6A3.5 3.5 0 0 0 .6 3.1C0 5.3 0 10 0 10s0 4.7.6 6.9a3.5 3.5 0 0 0 2.5 2.5C5.3 20 14 20 14 20s8.7 0 10.9-.6a3.5 3.5 0 0 0 2.5-2.5C28 14.7 28 10 28 10s0-4.7-.6-6.9z" fill="#FF0000"/><path d="M11.2 14.3 18.5 10l-7.3-4.3z" fill="#fff"/></svg>`;
const IG=s=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24"><defs><radialGradient id="tlkig" cx="30%" cy="107%" r="150%"><stop offset="0" stop-color="#fdf497"/><stop offset=".05" stop-color="#fdf497"/><stop offset=".45" stop-color="#fd5949"/><stop offset=".6" stop-color="#d6249f"/><stop offset=".9" stop-color="#285AEB"/></radialGradient></defs><rect width="24" height="24" rx="6.5" fill="url(#tlkig)"/><rect x="5.2" y="5.2" width="13.6" height="13.6" rx="4" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" stroke-width="1.7"/><circle cx="16.3" cy="7.7" r="1" fill="#fff"/></svg>`;

// ---- look
mk('',document.head,`
.tlk-card{position:absolute;background:#fff;border-radius:26px;box-shadow:0 30px 80px rgba(16,48,94,.15),0 3px 10px rgba(16,48,94,.07);overflow:hidden}
.tlk-top{position:absolute;left:0;right:0;top:0}
.tlk-h{position:absolute;left:0;display:flex;align-items:center;gap:12px;padding-left:20px;box-sizing:border-box;font-weight:500;color:#4A5160;white-space:nowrap;overflow:hidden}
.tlk-h .i{flex:none;border-radius:11px;display:flex;align-items:center;justify-content:center}
.tlk-h .i{position:relative}.tlk-h .tk{position:absolute;right:-9px;top:-9px;width:24px;height:24px;border-radius:50%;background:#30A46C;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;transform:scale(0)}
.tlk-lanes{position:absolute;overflow:hidden;background:#F5F6FA;border-radius:14px}
.tlk-rul{position:absolute;left:0;right:0;top:0;background:#fff;border-bottom:1.5px solid #E6E9F0;box-sizing:border-box}
.tlk-rul i{position:absolute;left:0;right:0;bottom:0;height:9px;background:repeating-linear-gradient(90deg,#C3C9D6 0 1.5px,transparent 1.5px 100%)}
.tlk-rul b{position:absolute;left:0;right:0;bottom:0;height:16px;background:repeating-linear-gradient(90deg,#9AA2B2 0 2px,transparent 2px 100%)}
.tlk-lane{position:absolute;left:0;right:0;box-sizing:border-box;border-bottom:1.5px solid #E9ECF2}
.tlk-ly{position:absolute;left:0;top:0;right:0;bottom:0}
.tlk-clip{position:absolute;box-sizing:border-box;overflow:hidden;transform-origin:50% 50%}
.tlk-clip.film{background-repeat:repeat-x;background-size:auto 100%;--edge:rgba(16,48,94,.28)}
.tlk-clip.film::before{content:"";position:absolute;left:0;right:0;top:0;height:var(--bar,6px);background:var(--c);z-index:2}
.tlk-clip .tn{position:absolute;inset:0;opacity:0}
.tlk-clip.wave,.tlk-clip.block{background:var(--tint)}
.tlk-clip svg.w{position:absolute;left:0;top:0;overflow:visible}
.tlk-clip .rd{position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(229,72,77,.42) 0 7px,rgba(229,72,77,.2) 7px 14px);opacity:0}
.tlk-clip .lb{position:absolute;left:10px;top:0;bottom:0;display:flex;align-items:center;gap:7px;font-weight:600;white-space:nowrap;color:var(--c)}
.tlk-ph{position:absolute;top:0;bottom:0;width:3px;margin-left:-1.5px;background:#0075FD;border-radius:2px;box-shadow:0 0 0 1px rgba(255,255,255,.7)}
.tlk-ph::before{content:"";position:absolute;left:-7px;top:0;width:17px;height:15px;background:#0075FD;border-radius:4px 4px 9px 9px}
.tlk-cur{position:absolute;left:0;top:0;z-index:60;pointer-events:none;will-change:transform}
.tlk-cur .ar{position:absolute;left:-4px;top:-3px;filter:drop-shadow(0 3px 5px rgba(16,48,94,.35))}
.tlk-cur .tg{position:absolute;left:17px;top:21px;display:flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:11px;color:#fff;font:600 21px/1 var(--eg-font);white-space:nowrap;box-shadow:0 6px 16px rgba(16,48,94,.28);letter-spacing:.005em}
.tlk-cur.big .tg{height:38px;font-size:24px;padding:0 14px 0 11px;border-radius:13px}
.tlk-cur .rg{position:absolute;left:-22px;top:-22px;width:44px;height:44px;border-radius:50%;border:3.5px solid;box-sizing:border-box;opacity:0}
.tlk-pv{position:absolute;overflow:hidden;background:#0b0c10}
.tlk-pv img{position:absolute;display:block;max-width:none}
.tlk-pv .ov{position:absolute;inset:0;overflow:hidden}
`,'style');

// ---- waveforms: bar i of a clip, 0..1
function wv(type,seed,i){const r=h01(seed,i);
 switch(type){
  case 'voice':{const word=h01(seed+3,Math.floor(i/5))>.2?1:.1,env=.5+.5*Math.abs(Math.sin(i*.19+seed));return C(word*env*(.4+.6*r),.07,1)}
  case 'beat':return C(.36+(i%8<2?.5:0)+.14*r,0,1);
  case 'swell':return C(.22+.62*Math.abs(Math.sin(i*.05+seed))*(.7+.3*r),0,1);
  case 'dense':return C(.6+.36*r,0,1);
  case 'pluck':return C((i%6===0?.92:i%6===1?.55:.18)+.1*r,0,1);
  case 'pad':return C(.42+.26*Math.sin(i*.09+seed)+.1*r,0,1);
  case 'sfx':return C(Math.exp(-i/4.5)*(.8+.2*r),.06,1);
  case 'pop':return C(Math.exp(-i/2.6)*(.85+.15*r)+(i<1?.2:0),.05,1);
  case 'tick':return C((i%7<1?1:i%7<2?.5:.07)*(.85+.15*r),.05,1);
  case 'whoosh':return C(Math.pow(Math.sin(Math.PI*Math.min(1,(i+1)/34)),1.4)*(.72+.28*r),.05,1);
  default:return .4}}

// ---- the timeline card
function timeline(host,o){
 const T={o,span:o.span||100,g:{top:[],hs:[],ux:1,x0:0,y0:0,lw:0},idx:{}};
 const card=T.card=mk('tlk-card',host);T.top=mk('tlk-top',card);
 const lanes=T.lanes=mk('tlk-lanes',card);const rul=mk('tlk-rul',lanes,'<i></i><b></b>');
 const hd=[],ln=[];
 o.tracks.forEach((tr,i)=>{T.idx[tr.id]=i;
  const h=mk('tlk-h',card,`<div class="i" style="background:${tr.tint||'#EEF1F6'}">${ico(tr.icon,22,tr.color,2.1)}<div class="tk">${ico('check',14,'#fff',3.6)}</div></div><span>${tr.label||''}</span>`);hd.push(h);
  ln.push(mk('tlk-lane',lanes))});
 const base=T.base=mk('tlk-ly',lanes);const ph=mk('tlk-ph',lanes);ph.style.zIndex=20;ph.style.opacity=0;
 const hT=o.hT||0,hR=o.hR??26,pb=o.padB??14,headW=o.headW??170,padR=o.padR??18,fs=o.fs||21,isz=o.isz||40;
 T.H=hs=>hT+hR+pb+hs.reduce((a,b)=>a+b,0);
 T.place=(x,y,w,hs)=>{const g=T.g;let acc=hR;g.hs=hs;g.lw=w-headW-padR;g.ux=g.lw/T.span;g.x0=x+headW;g.y0=y+hT;
  Object.assign(card.style,{left:x.toFixed(2)+'px',top:y.toFixed(2)+'px',width:w.toFixed(2)+'px',height:T.H(hs).toFixed(2)+'px'});
  T.top.style.height=hT+'px';
  Object.assign(lanes.style,{left:headW+'px',top:hT+'px',width:g.lw.toFixed(2)+'px',height:(hR+hs.reduce((a,b)=>a+b,0)).toFixed(2)+'px'});
  rul.style.height=hR+'px';rul.firstChild.style.backgroundSize=(g.ux*2).toFixed(3)+'px 100%';rul.lastChild.style.backgroundSize=(g.ux*10).toFixed(3)+'px 100%';
  hs.forEach((h,i)=>{g.top[i]=acc;const v=C((h-12)/26);
   Object.assign(ln[i].style,{top:acc.toFixed(2)+'px',height:h.toFixed(2)+'px',opacity:h>1?1:0});
   Object.assign(hd[i].style,{top:(hT+acc).toFixed(2)+'px',height:h.toFixed(2)+'px',width:headW+'px',opacity:v.toFixed(3),fontSize:fs+'px'});
   const ic=hd[i].firstChild;ic.style.width=ic.style.height=Math.min(isz,Math.max(0,h-10))+'px';acc+=h})};
 T.X=u=>T.g.x0+T.g.ux*u;T.Y=(tr,f=.5)=>{const i=T.idx[tr];return T.g.y0+T.g.top[i]+T.g.hs[i]*f};
 T.tick=(tr,p)=>{hd[T.idx[tr]].firstChild.lastChild.style.transform=`scale(${p.toFixed(3)})`};
 T.head=tr=>hd[T.idx[tr]];
 T.playhead=(u,op=1)=>{ph.style.left=(T.g.ux*u).toFixed(2)+'px';ph.style.opacity=op.toFixed(3)};
 T.layer=()=>mk('tlk-ly',lanes);
 // a clip: film (thumbnail strip) | wave (tinted, bars) | block (tinted, optional icon/label)
 T.clip=(tr,c={},ly)=>{const d=mk('tlk-clip '+(c.kind||'block'),ly||base);const col=c.color||'#0075FD';
  d.style.setProperty('--c',col);d.style.setProperty('--tint',c.tint||'#E8F3FF');if(c.kind!=='film')d.style.setProperty('--edge',c.edge||col+'55');
  if(c.kind==='film')d.style.backgroundImage=`url(${c.img})`;
  let svg,pathEl,key='';if(c.kind==='wave'){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','w');
   pathEl=document.createElementNS('http://www.w3.org/2000/svg','path');pathEl.setAttribute('fill','none');pathEl.setAttribute('stroke-linecap','round');svg.appendChild(pathEl);d.appendChild(svg)}
  const tn=c.kind==='film'?mk('tn',d):null;const rd=mk('rd',d);if(c.html)mk('lb',d,c.html);
  const pitch=c.pitch||5,sw=c.sw||3;
  return {el:d,c,set(u,w,p={}){const g=T.g,i=T.idx[tr],gap=p.gap??2,W=g.ux*w-gap,op=p.op??1,pad=p.pad??5,sub=p.sub,H=sub?(g.hs[i]-2*pad-2*(sub[1]-1))/sub[1]:g.hs[i]-2*pad;
    if(W<.6||op<=.002||H<4){d.style.display='none';return}d.style.display='block';const x=g.ux*u+gap/2,rl=p.rl??9,rr=p.rr??9;
    Object.assign(d.style,{left:x.toFixed(2)+'px',top:(g.top[i]+pad+(sub?sub[0]*(H+2):0)).toFixed(2)+'px',width:W.toFixed(2)+'px',height:H.toFixed(2)+'px',opacity:op.toFixed(3),
     borderRadius:`${rl}px ${rr}px ${rr}px ${rl}px`,transform:`translateY(${(p.dy||0).toFixed(2)}px) scale(${(p.sx??1).toFixed(4)},${(p.sy??1).toFixed(4)})`,overflow:p.over?'visible':'hidden',zIndex:p.z||''});
    d.style.boxShadow=`inset 0 1.5px 0 var(--edge),inset 0 -1.5px 0 var(--edge),inset ${Math.min(1.5,rl/4).toFixed(2)}px 0 0 var(--edge),inset ${(-Math.min(1.5,rr/4)).toFixed(2)}px 0 0 var(--edge)`;
    if(c.kind==='film'){d.style.backgroundPosition=`${(-(p.bx??x)).toFixed(1)}px 0`;tn.style.background=p.ov||'none';tn.style.opacity=(p.ovOp||0).toFixed(3);d.style.filter=p.gray?`grayscale(${p.gray.toFixed(3)}) brightness(${(1+.1*p.gray).toFixed(3)})`:'none';if(p.bar)d.style.setProperty('--bar',p.bar+'px')}
    rd.style.opacity=(p.red||0).toFixed(3);
    if(pathEl){const flat=p.flat||0,amp=p.amp??1,full=p.fullW?g.ux*p.fullW-gap:W,k=[full.toFixed(0),H.toFixed(0),flat.toFixed(3),amp.toFixed(3),p.wave||c.wave].join('|');
     if(k!==key){key=k;const n=Math.max(1,Math.floor((full-8)/pitch)),mid=H/2,type=p.wave||c.wave;let s='';
      for(let j=0;j<n;j++){let h=wv(type,c.seed||1,j+(c.off||0));h=L(h,.34,flat)*amp;const hh=Math.max(1.5,h*(H/2-5));const bx=5+j*pitch;s+=`M${bx} ${(mid-hh).toFixed(1)}V${(mid+hh).toFixed(1)}`}
      pathEl.setAttribute('d',s);pathEl.setAttribute('stroke-width',sw);svg.setAttribute('width',full);svg.setAttribute('height',H)}
     pathEl.setAttribute('stroke',p.col||(p.red>.5?'#E5484D':col))}
    if(p.tint){d.style.setProperty('--tint',p.tint);d.style.setProperty('--edge',p.edge||p.tint)}
    if(p.c)d.style.setProperty('--c',p.c);
   }}};
 return T}

// ---- role cursors (multiplayer style): coloured arrow + name tag, a ring on every click
function cursor(host,o){const d=mk('tlk-cur'+(o.big?' big':''),host);
 d.innerHTML=`<div class="rg" style="border-color:${o.color}"></div><svg class="ar" width="30" height="32" viewBox="0 0 30 32"><path d="M5 3.5 5 24.5 10.6 19.6 14.4 28 18.3 26.3 14.6 18 22 18Z" fill="${o.color}" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`+
  (o.name?`<div class="tg" style="background:${o.color}">${o.icon?ico(o.icon,o.big?19:16,'#fff',2.4):''}${o.img?`<img src="${o.img}" style="width:20px;height:20px">`:''}<span>${o.name}</span></div>`:'');
 const rg=d.firstChild,ar=d.children[1],tg=d.children[2];let tw=0;const maxX=o.maxX??1800;
 return {el:d,o,set(x,y,p={}){const op=p.op??1;
   if(tg){if(!tw)tw=tg.offsetWidth;const f=C((x+17+tw-maxX)/90),e=f*f*(3-2*f);tg.style.left=L(17,-tw-6,e).toFixed(1)+'px'}   // near the right edge the tag slides to the cursor's left
   d.style.opacity=op.toFixed(3);d.style.visibility=op<=.002?'hidden':'visible';
   d.style.transform=`translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${(p.sc??1).toFixed(3)})`;
   ar.style.transform=`scale(${(1-.16*(p.press||0)).toFixed(3)})`;ar.style.transformOrigin='5px 4px';
   if(p.ring>=0&&p.ring<1){const e=EG.E.expo(p.ring);rg.style.opacity=(.85*(1-p.ring)).toFixed(3);rg.style.transform=`scale(${(.35+1.15*e).toFixed(3)})`}else rg.style.opacity=0}}}
// keys [{t,x,y,click,d,ease,bend}] sorted by t: the cursor arrives at each key at its time (leaving the last one d seconds before)
const CEZ=EG.bez(.5,0,.12,1);
function path(K){return t=>{let i=0;while(i<K.length&&K[i].t<t)i++;let x,y;
  if(i===0){x=K[0].x;y=K[0].y}else if(i>=K.length){x=K[K.length-1].x;y=K[K.length-1].y}
  else{const a=K[i-1],b=K[i],d=b.d??Math.min(.4,b.t-a.t),u=C((t-(b.t-d))/d),e=(b.ease||CEZ)(u);x=L(a.x,b.x,e);y=L(a.y,b.y,e);
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,bd=(b.up?-Math.sign(dx||1)*.06:(b.bend??((i%2?1:-1)*.07)))*len*Math.sin(Math.PI*e);x+=-dy/len*bd;y+=dx/len*bd}
  let ring=-1,press=0;for(let j=Math.min(i,K.length-1);j>=0;j--){const k=K[j];if(k.click&&k.t<=t){const q=(t-k.t)/.42;if(q<1){ring=q;press=Math.max(0,1-(t-k.t)/.13)}break}}
  return {x,y,ring,press}}}

// ---- the preview window: his live camera (frames), cover-cropped around his face for any aspect
function preview(host,o={}){const d=mk('tlk-pv',host),a=mk('',d,null,'img'),b=mk('',d,null,'img'),ov=mk('ov',d);const cx=o.cx??942,cy=o.cy??430;
 b.style.filter='saturate(.25) contrast(.8) brightness(1.1)';
 return {el:d,a,b,ov,
  async frame(name,t){await EG.frame(a,name,t);if(b.style.display!=='none')await EG.frame(b,name,t)},
  set(r,p={}){const s=Math.max(r.w/1920,r.h/1080)*(p.zoom||1),iw=1920*s,ih=1080*s,ix=C(r.w/2-cx*s,r.w-iw,0),iy=C(r.h/2-cy*s,r.h-ih,0),sh=p.sh??1;
   Object.assign(d.style,{left:r.x.toFixed(2)+'px',top:r.y.toFixed(2)+'px',width:r.w.toFixed(2)+'px',height:r.h.toFixed(2)+'px',borderRadius:(p.rad??20).toFixed(2)+'px',
    boxShadow:`0 30px 80px rgba(16,48,94,${(.22*sh).toFixed(3)}),0 3px 10px rgba(16,48,94,${(.09*sh).toFixed(3)})`});
   for(const im of [a,b])Object.assign(im.style,{left:ix.toFixed(2)+'px',top:iy.toFixed(2)+'px',width:iw.toFixed(2)+'px',height:ih.toFixed(2)+'px'});
   const raw=p.raw||0;b.style.display=raw>.002?'block':'none';b.style.opacity=raw.toFixed(3);
   b.style.clipPath=p.wipe!=null?`inset(0 0 0 ${(p.wipe*100).toFixed(2)}%)`:'none';   // left of the wipe is graded, right of it still raw
   ov.style.fontSize=(r.w/100).toFixed(3)+'px'}}}
const rectL=(a,b,v)=>({x:L(a.x,b.x,v),y:L(a.y,b.y,v),w:L(a.w,b.w,v),h:L(a.h,b.h,v)});

// ---- the slop: three graphics that belong on a landing page (A18; H07-H08 can reuse). Sizes in em = 1% of the preview width.
function slop(ov){mk('',document.head,`
.sl{position:absolute;font-family:Inter,"Helvetica Neue",Arial,sans-serif;color:#0E1B4D}
.sl.glass{background:linear-gradient(160deg,rgba(255,255,255,.88),rgba(236,240,255,.74));border:.12em solid rgba(255,255,255,.9);border-radius:2em;box-shadow:0 1.6em 4em rgba(20,30,90,.35)}
.sl .eye{font-weight:800;letter-spacing:.14em;color:#2545E0;font-size:1.25em}
.sl .big{font-weight:900;font-size:6.4em;line-height:1;letter-spacing:-.03em}
.sl .sub{color:#5B6478;font-size:1.5em}
.sl .bars{position:absolute;left:1.6em;right:1.6em;bottom:1.5em;height:9.5em;display:flex;align-items:flex-end;gap:1em}
.sl .bars i{flex:1;border-radius:.7em .7em .3em .3em;background:linear-gradient(180deg,#A9B6FF,#3B55F5)}
.sl .row{position:relative;display:flex;align-items:center;gap:1em;height:4em;margin-top:.75em;padding:0 1em;border-radius:1.1em;background:linear-gradient(180deg,#fff,#F1F4FF);box-shadow:0 .5em 1.2em rgba(20,30,90,.16);border-left:.35em solid var(--k)}
.sl .row b{width:2.3em;height:2.3em;border-radius:.6em;background:var(--k);color:#fff;font-size:1.15em;font-weight:800;display:flex;align-items:center;justify-content:center}
.sl .row u{text-decoration:none;font-weight:900;font-size:1.75em;letter-spacing:-.01em}.sl .row s{text-decoration:none;color:#5B6478;font-size:1.15em}
.sl .cta{display:inline-flex;align-items:center;height:2.3em;padding:0 1.1em;border-radius:1.2em;background:#3B55F5;color:#fff;font-weight:700;font-size:1.3em;box-shadow:0 .5em 1.2em rgba(59,85,245,.45)}
.sl .tagp{display:inline-flex;align-items:center;gap:.6em;height:2em;padding:0 1.1em;border-radius:1.1em;border:.1em solid #E0946E;color:#D97757;font-weight:700;letter-spacing:.12em;font-size:1.05em}
.sl .tagp i{width:.5em;height:.5em;border-radius:50%;background:#D97757}
.sl .hl{display:inline-block;background:#D97757;color:#fff;border-radius:.35em;padding:0 .3em;transform:rotate(-2deg)}
`,'style');
 // 1: the glass stat card (top right)  2: the numbered "pipeline" list (left)  3: the "100% edited" banner (bottom)
 const a=mk('sl glass',ov,`<div style="position:absolute;right:1.6em;top:1.5em;text-align:right"><div class="eye">MOTION GRAPHICS</div><div class="big">94%</div><div class="sub">auto-built – on beat</div></div><div class="bars"><i style="height:44%"></i><i style="height:70%"></i><i style="height:33%"></i><i style="height:84%"></i><i style="height:58%"></i><i style="height:80%"></i></div>`);
 Object.assign(a.style,{right:'3em',top:'3.2em',width:'31em',height:'25em'});
 const rows=[['1','#4FB3E8','INTAKE','copy raw in'],['2','#2B48F0','ROUGH CUT','kill filler'],['3','#7A5CF5','GRAPHICS','liquid-glass'],['4','#D9825B','CAPTIONS','burn-in'],['5','#D957A3','MUSIC','flat bed']];
 const b=mk('sl',ov,`<div class="eye" style="font-size:1.15em">THE PIPELINE · RAW → FINISHED</div>`+rows.map(r=>`<div class="row" style="--k:${r[1]}"><b>${r[0]}</b><u>${r[2]}</u><s>${r[3]}</s></div>`).join('')+`<div style="margin-top:1em"><span class="cta">Get started →</span></div>`);
 Object.assign(b.style,{left:'3em',top:'3.2em',width:'33em'});
 const c=mk('sl glass',ov,`<div style="position:absolute;left:2em;top:1.2em"><span class="tagp"><i></i>100% EDITED BY CLAUDE · ZERO HUMAN EDITS</span></div><div style="position:absolute;left:.55em;bottom:.22em;font-weight:900;font-size:3.6em;letter-spacing:-.03em">edited <span class="hl">end-to-end</span></div>`);
 Object.assign(c.style,{left:'27em',bottom:'3em',width:'46em',height:'10.4em'});
 return [a,b,c]}

return {mk,h01,sp,pop,ico,IC,YT,IG,wv,timeline,cursor,path,preview,rectL,slop};
})();
