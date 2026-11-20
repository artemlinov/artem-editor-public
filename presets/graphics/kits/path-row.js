// p2-path-row.js (video 14 PASS 2, worker `path`): a copy of path-row.js (pass 1, still played by the old renders) with
// two fixes from Artem's pass-1 notes, everything else identical:
//   - 1:14 "any chance you can not make my camera freeze frame? When you start the transition": his card left on a
//     frozen picture (aroll-frames repeats the last frame past a V1 clip's end). Its frames are now `p2-path-cb1`: the
//     road's own 976 frames, then the take's continuation past the clip's out point (source 642.475 s on), so the card
//     plays LIVE until it is gone.
//   - 3:18 Step 2 lands on a music beat: break 2 is 80 frames (was 105); the cut is in the slow hold at its end.
//   - rules/continuity.md (a mystery marker is gone from the instance where the answer is out): Step 1 asked "is Claude
//     the right hire?" and A24 answers it ("Claude is the right hire for the whole edit"), yet the "?" stayed on card 1
//     through breaks 2 and 3. Now at break 2, as step 1 gets its tick, the "?" leaves (house exit) and the hire option
//     lights up green 3 frames later (light-up); settled from break 3 on (card 1 is still in view at its start).
// Renders: path-cb1-v2 (break 1, 105 f), path-cb2-v2 (break 2, 80 f), path-cb3-v2 (break 3, 105 f: card 1's answer).
// Breaks 4-5 are unchanged (no camera in them, card 1 is off the frame).
//
// path-row.js (video 14, worker `path`): the course path. ONE component with named states, used by six renders:
//   path-road  H12 + R01-R05: the row of five step cards arrives beside his live camera card, the camera pushes in to
//              card 1 on "First," and travels card to card, one per sentence; each card's illustration plays while he
//              talks about it. On the frame "…less of you." is over the camera pulls back to the whole row.
//   path-cb1   the first chapter silence, the SAME timeline as path-road carried on (one script, cut in two files): his
//              card leaves, the row is seen whole for a beat, the camera pushes in to card 1 and lands.
//   path-cb2 … path-cb5   the other chapter silences: open on the row exactly as the last break left it, the finished
//              card gets its tick, the camera slides to the next card, the mini-map moves on, the card lights and holds.
// Look: Artem's pick, graphics/looks/chapters-A.html (big cards 860x520, 80 apart, neighbours at 50%, mini-map pill).
// Titles are his chapter headings on two lines at 58 px (the mock-up's 68 px does not fit "Give them their" beside the
// illustration); the one-line subtitles come from his roadmap sentences.
// Continuity (rules/continuity.md) holds by construction: every break starts from SETTLED(n-1) and ends on SETTLED(n),
// the same definition on both sides; the camera's slow push-in ends on the last frame and the next break starts from it.
// (Break 1 ends with the row leaving, a hand-over to the table that rises in after it: see OUT. Its state is the same.)
// Timeline frames (pass 2 cut): road 1250-2225, cb1 2226-2330, cb2 5873-5952 (80 f), cb3 9942-10046, cb4 13855-13959,
// cb5 20336-20440. road + cb1 carry cue frames from `pipeline/timeline.py words`; if the cut under them moves, move them.
//
// Usage: <div class="stage" id="stage"></div><script>PATHROW.run('road'|'cb1'|'cb2'|'cb3'|'cb4'|'cb5')</script>
// World: card i is centred at (i*940, 0). Camera = {z, tx, ty}: screen = (tx + wx*z, ty + wy*z); every move interpolates
// all three with ONE eased progress, so each card travels in a straight line on screen (no swing in a zoom).
// Semantic zoom: seen as a whole row (z under .68) a card folds its illustration away and is a narrow tile, 470 wide and
// 530 apart: the big number alone before the roadmap has visited it, its number + title after. Over z .86 it is the full
// card (860 wide, 940 apart). The fold follows the zoom, so the tiles open while the camera is still flying in.
// Motion (presets/motion/README.md): materialize for everything that enters, 0.10 s apart; camera moves on the 40-90
// ease, first key on the frame the previous sentence's last word is over; light-up (0.28 s quart-out, +12% bump, one
// ripple) for a card that becomes the step, a tick, a mini-map dot; draw-line (0.55 s, glowing head) for the connector.
window.PATHROW=(()=>{
const C=EG.clamp,L=EG.lerp,E=EG.E,FPS=30000/1001;
const BLUE='#0075FD',LIB='../_lib/';
const PITCH=940,CW=860,CH=520,NC=5,PC=530,WC=470;      // full pitch and card; the folded tile's pitch and width
const FRAMES='/Users/<you>/Library/Caches/everygen-editor/14 Your First Claude Edit/frames/';
const STEPS=[
 {t:'Is Claude the<br>right hire?',s:'Before you set anything up'},
 {t:'Equip your<br>editing team',s:'The tools a pro editor uses'},
 {t:'Give your team<br>a memory',s:'Never explain twice'},
 {t:'Give them their<br>first project',s:'With the right model leading'},
 {t:'Review<br>their work',s:'Each video needs less of you'}];

// ---------- camera targets
const AXR=692.5;                                   // centre of the free area left of his card (115..1270)
const ZW=1155/(4*PC+WC),ZF=1690/(4*PC+WC),ZD=1.035; // the whole row beside his card; on the full frame; end of the slow push-in
const T={
 wideR:{z:ZW,tx:AXR-2*PC*ZW,ty:540},
 road:i=>({z:.9,tx:AXR-i*PITCH*.9,ty:470}),
 wideF:{z:ZF,tx:960-2*PC*ZF,ty:490},
 cb:(i,z=1)=>({z,tx:960-i*PITCH*z,ty:490})};
const HIS={x:1350,y:217,w:455,h:645,r:14,ix:-335}; // his camera card (contract: .cam of looks/table-3.html)
const drift=u=>Math.pow(u,1.35);                    // the slow push-in while a card holds: starts from rest, still moving at the cut

// ---------- the scripts. Times are seconds from the instance's first frame; -99 = settled long ago, 1e9 = never.
const F0=1250,fr=f=>(f-F0)/FPS;                    // road: timeline frame 1250 = 41.708 s, the frame "…get going with." is over
const NROAD=976,NCB=105,NCB2=80;                   // road = frames 1250..2225, a break = 105 frames; break 2 = 80 (pass 2)
const never=()=>Array(NC).fill(1e9),settled=()=>Array(NC).fill(-99);
function roadSpec(){
 // joints (timeline frames): "steps." over 1320 | "up." over 1515 | "slop." over 1716 | "twice." over 1836 |
 // "tokens" over 2084 | "you." over 2224; break 1 = 2226..2330
 const mv=[1320,1515,1716,1836,2084],land=mv.map((f,i)=>fr(f)+(i?.30:.34));
 const P=2256;                                     // break 1: the push-in to card 1 starts (0.47 s of the whole row at rest before it)
 return {
  cam:[{to:T.wideR,foc:null},
   {t:fr(1320),d:.65,to:T.road(0),foc:0},{t:fr(1515),d:.62,to:T.road(1),foc:1},{t:fr(1716),d:.62,to:T.road(2),foc:2},
   {t:fr(1836),d:.62,to:T.road(3),foc:3},{t:fr(2084),d:.62,to:T.road(4),foc:4},
   {t:fr(2224),d:.60,to:T.wideF,foc:null},{t:fr(P),d:.65,to:T.cb(0),foc:0},
   {t:fr(P+14),d:(2330-(P+14))/FPS,to:T.cb(0,ZD),foc:0,ease:drift}],
  lay:t=>1-E.k4090(C((t-fr(2224))/.6)),            // 1 = beside his card, 0 = the full frame
  mask:t=>1-smooth((t-fr(2224)-.26)/.3),           // the row stays out from under his card until the card has all but left (no tiles ghosting through his face)
  out:fr(2320),                                    // break 1 hands over to the Step 1 table, which rises in on the same background
  his:{out:fr(2224)},
  tiles:[0,1,2,3,4].map(i=>.30+i*.10),             // the five tiles, behind his camera as it moves aside (0.30 s in: the hook's
                                                   // overlay beside him, hk-setups, takes its first 11 frames to leave that corner)
  count:fr(1292),                                  // "five simple steps": the badges count off
  visit:land.slice(),
  mapIn:fr(1320)+.20,
  cur:[...land.map((t,i)=>[t-.06,i]),[fr(2224),null],[fr(P)+.36,0]],
  done:never(),seg:never(),tick:never(),conn:never(),
  rip:[[fr(P)+.36,0]],wake:[1e9,1e9,1e9,1e9,1e9].map((v,i)=>i?v:fr(P)+.46),
  ill:[
   // 1 "First, | we'll figure out if Claude is even the right hire | for the kind of videos you make | before you spend a minute…"
   {a:fr(1331),b:fr(1340),r0:fr(1349),r1:fr(1385),r2:fr(1409),r3:fr(1432),c:fr(1454)},
   // 2 "Second, | we'll equip your editing team with the same tools | a pro editor uses, | so your videos don't come out looking like AI slop."
   {a:fr(1531),p:fr(1593),c:fr(1636)},
   // 3 "Third, | we'll give your team a memory | so you never have to explain | the same thing twice."
   {a:fr(1727),l:fr(1733),b:fr(1765),f:fr(1786),c:fr(1808)},
   // 4 "Fourth, we'll give them their first project | and I'll show you which Claude model | is best to lead the team | so you get great results | without burning through your tokens"
   {a:fr(1846),b:fr(1902),r0:fr(1914),r1:fr(1936),r2:fr(1954),r3:fr(1964),k:fr(1980),c:fr(1997),d:fr(2041)},
   // 5 "And finally, | I'll show you how to review the edits, | so every next video needs less of you."
   {a:fr(2095),b:fr(2112),c:fr(2163),v:fr(2181)}]};
}
// How a break hands over to the chapter's first shot (1 = the row leaves with the house exit over the last 11 frames,
// 0 = the card holds to the last frame and the cut is hard). Break 1 leaves: the Step 1 table and his card RISE IN on the
// same house background (3 frames into their entrance on their first frame), so one leaves while the other arrives and
// no frame is empty. The others hold: Step 2's team board cuts in with his card and Claude's tile already in place, Step 3
// opens on his full-frame camera, Steps 4 and 5 on screen chapters. To change one: flip it here, re-render that break.
const OUT={1:1,2:0,3:0,4:0,5:0};
// break n (2..5): from card n-1 (index i) to card n (index j)
function cbSpec(n,nf=NCB){
 const i=n-2,j=n-1,S=14/FPS,LAND=S+.36;
 const upto=(k,t)=>[0,1,2,3,4].map(x=>x<k?-99:x===k?t:1e9);
 return {
  cam:[{to:T.cb(i,ZD),foc:i},{t:S,d:.75,to:T.cb(j),foc:j},{t:S+.50,d:(nf-1)/FPS-(S+.50),to:T.cb(j,ZD),foc:j,ease:drift}],
  lay:()=>0,mask:()=>0,his:null,tiles:null,count:1e9,visit:settled(),mapIn:-99,
  out:OUT[n]?94/FPS:null,
  cur:[[-99,i],[LAND,j]],
  done:upto(i,4/FPS),tick:upto(i,4/FPS),           // the finished step: its tick, its green dot
  seg:upto(i,S),conn:upto(i,S),                    // the line reaches the next step as the camera travels
  rip:[[LAND,j]],wake:[0,1,2,3,4].map(x=>x===j?LAND+.10:1e9),
  ans:n===2?7/FPS:-99,                             // card 1's answer: 3 frames after step 1's tick at break 2, settled after
  ill:[0,1,2,3,4].map(()=>null)};
}
const INST={road:{sp:roadSpec,off:0,n:NROAD},cb1:{sp:roadSpec,off:NROAD/FPS,n:NCB},
 cb2:{sp:()=>cbSpec(2,NCB2),off:0,n:NCB2},cb3:{sp:()=>cbSpec(3),off:0,n:NCB},cb4:{sp:()=>cbSpec(4),off:0,n:NCB},cb5:{sp:()=>cbSpec(5),off:0,n:NCB}};

// ---------- helpers
const h=(tag,cls,parent,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e};
const px=(e,o)=>{for(const k in o)e.style[k]=typeof o[k]==='number'?o[k].toFixed(2)+'px':o[k]};
const svg=(d,size,col,sw=2,fill='none')=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const IC={
 cut:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
 search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
 anim:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
 sound:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 finish:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
 tick:'<polyline points="20 6 9 17 4 12"/>',
 x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
 pin:'<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
 crown:'<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>',
 bolt:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
 play:'<polygon points="7 4 20 12 7 20 7 4"/>',
 spark:'<path d="M12 1.5C12.9 7.6 16.4 11.1 22.5 12 16.4 12.9 12.9 16.4 12 22.5 11.1 16.4 7.6 12.9 1.5 12 7.6 11.1 11.1 7.6 12 1.5Z"/>'};
const bump=u=>u<0?1:1+.12*Math.sin(Math.PI*C(u/.27));                 // light-up's badge bump
const lvl=(ev,t)=>{let v=0;for(const[te,on]of ev){if(t<=te)break;v+=(on-v)*E.quart(C((t-te)/.28))}return v};
const smooth=u=>{u=C(u);return u*u*(3-2*u)};
const mixv=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u),rgb=a=>'rgb('+a.map(v=>Math.round(v)).join(',')+')',mixc=(a,b,u)=>rgb(mixv(a,b,u));
const GREY=[205,210,220],BLU=[0,117,253],GRN=[48,164,108],WHITE=[255,255,255],INK=[28,30,34];
const M=(el,since,o)=>EG.mat(el,since,0,o);                           // materialize, as "seconds since its beat"
const show=(el,on)=>{el.style.visibility=on?'visible':'hidden'};

const CSS=`
#pw{position:absolute;inset:0}#pr{position:absolute;left:0;top:0;transform-origin:0 0}
.pc{position:absolute;height:${CH}px;border-radius:44px;background:#fff}.pc-in{position:absolute;inset:0;border-radius:44px;overflow:hidden}
.pc-pan{position:absolute;left:480px;top:50px;width:330px;height:420px;border-radius:30px;background:linear-gradient(160deg,#EEF4FD,#E3ECFA);overflow:hidden}
.pc-step{position:absolute;left:60px;top:188px;font-size:24px;font-weight:600;letter-spacing:.14em;color:${BLUE};white-space:nowrap}
.pc-title{position:absolute;left:56px;top:226px;font-size:58px;white-space:nowrap;font-weight:600;letter-spacing:-.03em;line-height:1.04;color:#1C1E22}
.pc-sub{position:absolute;left:60px;top:394px;font-size:28px;color:#7C8290;font-weight:500;white-space:nowrap}
.pc-badge{position:absolute}
.pc-rip{position:absolute;border:4px solid ${BLUE};pointer-events:none}
.pc-tk{position:absolute;right:-20px;top:-20px;width:64px;height:64px;border-radius:50%;background:#30A46C;border:4px solid #F4F6FB;display:flex;align-items:center;justify-content:center}
.pc-tkr{position:absolute;right:-16px;top:-16px;width:64px;height:64px;border-radius:50%;border:3px solid #30A46C;pointer-events:none}
.pcn{position:absolute;top:-4px;height:8px;border-radius:4px;background:repeating-linear-gradient(90deg,#C4CAD6 0 12px,transparent 12px 20px)}
.pcn i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:${BLUE}}
.pcn b{position:absolute;top:-4px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(0,117,253,.9),0 0 18px 6px rgba(0,117,253,.55)}
#pm{position:absolute;width:520px;height:68px;border-radius:34px;background:#fff;box-shadow:0 24px 60px rgba(16,48,94,.13),0 2px 8px rgba(16,48,94,.06)}
#pm .sg{position:absolute;top:32px;height:4px;width:68px;background:repeating-linear-gradient(90deg,#C4CAD6 0 9px,transparent 9px 15px)}
#pm .sg i{position:absolute;left:0;top:-.5px;height:5px;border-radius:3px;background:${BLUE}}
#pm .sg b{position:absolute;top:-4px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(0,117,253,.9),0 0 12px 4px rgba(0,117,253,.55)}
#pm .dt{position:absolute;top:34px;border-radius:50%;display:flex;align-items:center;justify-content:center}
#pm .dt svg{display:block}
#pcam{position:absolute;overflow:hidden;background:#0b0c10;z-index:5}#pcam img{position:absolute;top:0;display:block}
/* ---- illustration kit (inside a card's panel, 342x420) */
.it{position:absolute;background:#fff;border-radius:22px;box-shadow:0 12px 28px rgba(16,48,94,.14),0 1px 3px rgba(16,48,94,.06)}
.sk{position:absolute;height:12px;border-radius:6px;background:#D9DEE8}
.ic{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%}
.ic svg,.it svg{display:block}
.isheen{position:absolute;left:0;top:-20%;width:100%;height:140%;background:linear-gradient(105deg,rgba(255,255,255,0) 36%,rgba(255,255,255,.85) 50%,rgba(255,255,255,0) 64%);pointer-events:none}
.iring{position:absolute;box-sizing:border-box;border:4px solid ${BLUE};box-shadow:0 0 0 6px rgba(0,117,253,.14),0 6px 18px rgba(0,98,224,.25);pointer-events:none}
.itag{position:absolute;display:flex;align-items:center;justify-content:center;font-weight:600;white-space:nowrap}
`;

// ---------- the five illustrations. Each returns draw(b, wk): b(name) = seconds since that beat (99 when settled),
// wk = seconds since the card was landed on at a chapter break (a small accent on its key element), else -1.
const root=(p,s)=>{const r=h('div','',p);px(r,{position:'absolute',left:-6,top:0,width:342,height:420});r.style.transform=`scale(${s})`;return r};   // drawn on 342x420, sized to fill the panel
function sheen(p){const s=h('div','isheen',p);return u=>{const on=u>0&&u<.75;show(s,on);if(on)s.style.transform=`translateX(${(-110+220*E.inout(C(u/.75))).toFixed(2)}%)`}}

// 1: Claude as the candidate; "hire or pass" is weighed; the verdict stays open (the step answers it)
function ill1(P){const p=root(P,1.1);
 const card=h('div','it',p,`<img src="${LIB}claude.png" style="position:absolute;left:22px;top:24px;width:64px;height:64px"><i class="sk" style="left:106px;top:36px;width:112px;height:13px;background:#B9C1CF"></i><i class="sk" style="left:106px;top:63px;width:76px;height:11px"></i>`);
 px(card,{left:46,width:250,height:112});
 const no=h('div','ic',p,svg(IC.x,34,'#D5373D',2.8)),yes=h('div','ic',p,svg(IC.tick,34,'#1B8050',2.8));
 px(no,{left:81,top:236,width:76,height:76,background:'#FDE5E6'});px(yes,{left:185,top:236,width:76,height:76,background:'#D9F2E3'});
 const ring=h('div','iring',p);px(ring,{top:227,width:94,height:94,borderRadius:'50%'});
 const q=h('div','ic',p,'?');px(q,{left:262,width:46,height:46,background:'#FFB224',color:'#1C1E22',fontSize:30,fontWeight:'600',boxShadow:'0 8px 18px rgba(255,178,36,.45)'});
 const yr=h('div','',p);px(yr,{position:'absolute',left:185,top:236,width:76,height:76,borderRadius:'50%',boxSizing:'border-box',border:'3px solid #30A46C'});   // the answer's ripple
 const sh=sheen(P);
 // an = seconds since the answer (pass 2): the "?" leaves 3 frames before it, the hire option lights up green
 return (b,wk,an=-1e9)=>{
  const y=EG.spring(b('b'),0,154,92);card.style.top=y.toFixed(2)+'px';M(card,b('a'));
  M(no,b('b'),{dy:30});M(yes,b('b')-.10,{dy:30,base:`scale(${bump(an).toFixed(4)})`});
  {const g=E.quart(C(an/.28));yes.style.background=mixc([217,242,227],GRN,g);yes.firstChild.style.stroke=mixc([27,128,80],WHITE,g);
   const on=an>0&&an<.6;show(yr,on);if(on){const u=E.expo(C(an/.6));yr.style.transform=`scale(${(1+.7*u).toFixed(4)})`;yr.style.opacity=(.55*(1-u)).toFixed(3)}}
  let x=119;[['r1',223],['r2',119],['r3',223]].forEach(([k,to])=>{x=EG.spring(b(k),0,x,to,9)});
  const cs=b('c'),ro=C(b('r0')/.18)*(1-E.quart(C(cs/.28)));               // the ring leaves as the "?" lands: still undecided
  ring.style.left=(x-47).toFixed(2)+'px';ring.style.opacity=ro.toFixed(3);show(ring,ro>.002);
  ring.style.transform=`scale(${(1.25-.25*E.expo(C(b('r0')/.35))).toFixed(4)})`;
  q.style.top=(y-18).toFixed(2)+'px';M(q,cs,{dy:22,base:`scale(${(bump(cs)*bump(wk)).toFixed(4)})`,exit:cs-an-3/FPS,exitDy:14,exitDur:.3});
  sh(wk)}}

// 2: the team's five tools dock one by one; they are a PRO kit; the polish pass (not slop)
function ill2(P){const p=root(P,1);
 const X=[25,127,229,76,178],R=[0,0,0,1,1],K=['cut','search','anim','sound','finish'];
 const tl=K.map((k,i)=>{const t=h('div','it',p,svg(IC[k],42,BLUE,1.9));px(t,{left:X[i],width:88,height:88,borderRadius:'24px',display:'flex',alignItems:'center',justifyContent:'center'});return t});
 const pro=h('div','itag',p,'PRO');px(pro,{left:125,top:66,width:92,height:42,borderRadius:'21px',background:BLUE,color:'#fff',fontSize:22,letterSpacing:'.1em',boxShadow:'0 8px 18px rgba(0,98,224,.3)'});
 const sp=h('div','',p,svg(IC.spark,44,'none',0,BLUE));px(sp,{position:'absolute',left:262,top:62,width:44,height:44});
 const sh=sheen(P);
 return (b,wk)=>{
  const dy=EG.spring(b('p'),0,0,26),c=b('c');
  tl.forEach((t,i)=>{t.style.top=(118+102*R[i]+dy).toFixed(2)+'px';
   const w=Math.max(c-i*.06,wk-i*.06),s=1+.08*Math.sin(Math.PI*C(w/.3))*(w>0?1:0);
   M(t,b('a')-i*.13,{dy:34,base:`scale(${s.toFixed(4)})`})});
  M(pro,b('p'),{dy:22,base:`scale(${bump(b('p')).toFixed(4)})`});
  M(sp,c-.12,{dy:18,base:`rotate(${(40*(1-E.expo(C((c-.12)/.6)))).toFixed(2)}deg) scale(${(bump(c-.12)*bump(wk-.1)).toFixed(4)})`});
  sh(Math.max(c,wk))}}

// 3: the memory file fills with what the team learned; a note he says once goes in; it is pinned
function ill3(P){const p=root(P,1.16);
 const doc=h('div','it',p);px(doc,{left:73,top:92,width:196,height:236});
 doc.innerHTML=`<i style="position:absolute;left:22px;top:22px;width:30px;height:30px;border-radius:9px;background:${BLUE}"></i><i class="sk" style="left:64px;top:31px;width:84px;background:#B9C1CF"></i><i style="position:absolute;left:22px;right:22px;top:68px;height:1.5px;background:#E9EBF0"></i>`;
 const W=[116,92,104],ln=W.map((w,i)=>{const r=h('div','',doc);px(r,{position:'absolute',left:22,top:88+i*38,height:22,width:152});
  r.innerHTML=`<i class="ic" style="left:0;top:0;width:22px;height:22px;background:#E8F3FF">${svg(IC.tick,13,BLUE,3.4)}</i><i class="sk" style="left:34px;top:5px;width:${w}px"></i>`;return r});
 const rip=h('div','',p);px(rip,{position:'absolute',border:`3px solid ${BLUE}`});
 const bub=h('div','',p,`<i class="sk" style="left:16px;top:11px;width:74px;height:9px;background:#fff"></i><i class="sk" style="left:16px;top:27px;width:50px;height:9px;background:rgba(255,255,255,.6)"></i><i style="position:absolute;left:18px;bottom:-7px;width:16px;height:16px;background:${BLUE};transform:rotate(45deg);border-radius:3px"></i>`);
 px(bub,{position:'absolute',width:112,height:47,borderRadius:'16px',background:BLUE,boxShadow:'0 10px 22px rgba(0,98,224,.32)'});
 const pin=h('div','badge',p,svg(IC.pin,26,'#fff',2.1));px(pin,{position:'absolute',left:145,top:64,width:52,height:52});
 const sh=sheen(P);
 return (b,wk)=>{
  M(doc,b('a'));
  const f=b('f'),T=[b('l'),b('l')-.13,f-.26];
  ln.forEach((r,i)=>{const u=T[i];show(r,u>0);if(u<=0)return;r.firstChild.style.transform=`scale(${(E.expo(C(u/.3))*bump(u)).toFixed(4)})`;
   r.lastChild.style.transform=`scaleX(${E.expo(C(u/.5)).toFixed(4)})`;r.lastChild.style.transformOrigin='0 50%'});
  // his note: said once (the bubble), then it travels into the file and becomes a line
  const g=E.inout(C(f/.42));px(bub,{left:L(30,95,g),top:L(40,170,g)});
  const bo=M(bub,b('b'),{dy:26,base:`scale(${L(1,.45,g).toFixed(4)})`});bub.style.opacity=(bo*(1-C((f-.24)/.16))).toFixed(3);if(f>.42)show(bub,false);
  const c=b('c');M(pin,c,{dy:24,base:`scale(${(bump(c)*bump(wk)).toFixed(4)})`});
  const u=C(c/.6),on=c>0&&c<.6;show(rip,on);if(on){const d=2+16*E.expo(u);px(rip,{left:73-d,top:92-d,width:196+2*d-6,height:236+2*d-6,borderRadius:(22+d)+'px'});rip.style.opacity=(.55*(1-E.expo(u))).toFixed(3)}
  sh(wk)}}

// 4: the first video; which model leads the team; the usage meter stays low
function ill4(P){const p=root(P,1.1);
 const vid=h('div','it',p);px(vid,{left:59,width:224,height:146,borderRadius:'20px'});
 vid.innerHTML=`<div style="position:absolute;left:12px;top:12px;width:200px;height:98px;border-radius:12px;background:linear-gradient(135deg,#0B3F91,#0075FD 62%,#63B0FF);display:flex;align-items:center;justify-content:center"><i class="ic" style="position:relative;width:42px;height:42px;background:rgba(255,255,255,.22)">${svg(IC.play,20,'none',0,'#fff')}</i></div><span style="position:absolute;left:14px;top:116px;font-size:20px;font-weight:600;color:#1C1E22;white-space:nowrap">Video 1</span><i class="sk" style="right:14px;top:123px;width:44px;height:9px"></i>`;
 const W=[104,128,84],rows=W.map(w=>{const r=h('div','it',p,`<img src="${LIB}claude.png" style="position:absolute;left:9px;top:8px;width:24px;height:24px"><i class="sk" style="left:44px;top:14px;width:${w}px;background:#C9CFDB"></i>`);px(r,{left:59,width:224,height:40,borderRadius:'14px',boxShadow:'0 6px 16px rgba(16,48,94,.10),0 1px 2px rgba(16,48,94,.05)'});return r});
 const ring=h('div','',p);px(ring,{position:'absolute',left:59,width:224,height:40,borderRadius:'14px',boxSizing:'border-box',border:`3px solid ${BLUE}`,background:'rgba(0,117,253,.07)',boxShadow:'0 0 0 5px rgba(0,117,253,.13)'});
 const crown=h('div','ic',p,svg(IC.crown,16,'#fff',2.2,'#fff'));px(crown,{left:247,width:26,height:26,background:'#FFB224',boxShadow:'0 5px 12px rgba(255,178,36,.5)'});
 const met=h('div','it',p,`<i style="position:absolute;left:11px;top:8px">${svg(IC.bolt,16,BLUE,2.2,BLUE)}</i><i style="position:absolute;left:38px;top:12px;width:146px;height:8px;border-radius:4px;background:#E8ECF3;overflow:hidden"><b style="position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:${BLUE}"></b></i>`);
 px(met,{left:59,width:224,height:32,borderRadius:'16px',boxShadow:'0 6px 16px rgba(16,48,94,.10),0 1px 2px rgba(16,48,94,.05)'});
 const ok=h('div','ic',p,svg(IC.tick,12,'#fff',3.6));px(ok,{left:254,width:20,height:20,background:'#30A46C'});
 const sh=sheen(P);
 return (b,wk)=>{
  const bb=b('b'),c=b('c'),up=EG.spring(c,0,0,12);
  vid.style.top=(EG.spring(bb,0,137,52)-up).toFixed(2)+'px';M(vid,b('a'));
  const ry=i=>212+48*i-up;rows.forEach((r,i)=>{r.style.top=ry(i).toFixed(2)+'px';M(r,bb-i*.10,{dy:30})});
  let k=0;[['r1',1],['r2',2],['r3',1]].forEach(([n,to])=>{k=EG.spring(b(n),0,k,to,9)});
  const ro=C(b('r0')/.18);ring.style.top=ry(k).toFixed(2)+'px';ring.style.opacity=ro.toFixed(3);show(ring,ro>.002);
  const ks=b('k');crown.style.top=(ry(1)+7).toFixed(2)+'px';M(crown,ks,{dy:16,base:`scale(${(bump(ks)*bump(wk)).toFixed(4)})`});
  met.style.top=(352).toFixed(2)+'px';M(met,c,{dy:28});met.lastChild.firstChild.style.width=(30*E.expo(C((c-.2)/.9))).toFixed(2)+'%';
  const d=b('d');ok.style.top='358px';M(ok,d,{dy:12,base:`scale(${bump(d).toFixed(4)})`});
  sh(wk)}}

// 5: the first draft; notes pinned on its timeline; the notes turn into ticks and it becomes version two
function ill5(P){const p=root(P,1.12);
 const card=h('div','it',p);px(card,{left:40,top:112,width:262,height:196,borderRadius:'20px'});
 card.innerHTML=`<div style="position:absolute;left:12px;top:12px;width:238px;height:124px;border-radius:12px;background:linear-gradient(135deg,#10305E,#0B58C4 70%,#3D97FF);display:flex;align-items:center;justify-content:center"><i class="ic" style="position:relative;width:46px;height:46px;background:rgba(255,255,255,.2)">${svg(IC.play,22,'none',0,'#fff')}</i></div>
 <i style="position:absolute;left:12px;top:160px;width:238px;height:8px;border-radius:4px;background:#E8ECF3"></i><i class="pf" style="position:absolute;left:12px;top:160px;height:8px;border-radius:4px;background:${BLUE}"></i>`;
 const fill=card.querySelector('.pf');
 const tag=h('div','itag',card,'<span>v1</span><span>v2</span>');px(tag,{left:22,top:22,width:46,height:28,borderRadius:'14px',fontSize:16,overflow:'hidden'});
 [...tag.children].forEach(s=>px(s,{position:'absolute',left:0,right:0,textAlign:'center',lineHeight:'28px'}));
 const PX=[52,119,190],pins=PX.map(x=>{const d=h('div','ic',card,svg(IC.tick,11,'#fff',3.8));px(d,{left:12+x-9,top:155,width:18,height:18,boxShadow:'0 0 0 3px #fff'});return d});
 const notes=PX.map((x,i)=>{const n=h('div','it',card,`<i class="ic" style="left:9px;top:10px;width:10px;height:10px;background:#FFB224"></i><i class="sk" style="left:25px;top:11px;width:${[28,22,26][i]}px;height:8px;background:#C9CFDB"></i>`);
  px(n,{left:12+x-32,top:112,width:64,height:30,borderRadius:'10px',boxShadow:'0 6px 14px rgba(16,48,94,.22)'});return n});
 const knob=h('div','',card);px(knob,{position:'absolute',top:154,width:20,height:20,marginLeft:-10,borderRadius:'50%',background:'#fff',boxSizing:'border-box',border:`4px solid ${BLUE}`,boxShadow:'0 2px 6px rgba(16,48,94,.25)'});
 const sh=sheen(P);
 return (b,wk)=>{
  M(card,b('a'));const bb=b('b'),c=b('c'),v=b('v');
  let ph=14;PX.forEach((x,i)=>{ph=EG.spring(bb-i*.13,0,ph,x+(i<2?18:34),9)});fill.style.width=ph.toFixed(2)+'px';knob.style.left=(12+ph).toFixed(2)+'px';
  pins.forEach((d,i)=>{const u=bb-i*.13,g=E.quart(C((c-i*.13)/.28));show(d,u>0);if(u<=0)return;
   d.style.background=mixc([255,178,36],GRN,g);d.firstChild.style.opacity=g.toFixed(3);
   d.style.transform=`scale(${(E.expo(C(u/.3))*bump(u)*bump(c-i*.13)).toFixed(4)})`});
  notes.forEach((n,i)=>M(n,bb-i*.13-.04,{dy:22,exit:bb-c-.04,exitDy:16,exitDur:.3}));   // each note drops into its pin as the pin turns into a tick
  const g=E.quart(C(v/.3));tag.style.background=mixc(WHITE,BLU,g);tag.style.color=mixc(INK,WHITE,g);
  tag.style.transform=`scale(${(bump(v)*bump(wk)).toFixed(4)})`;
  tag.children[0].style.top=(-28*g).toFixed(2)+'px';tag.children[1].style.top=(28*(1-g)).toFixed(2)+'px';
  sh(wk)}}
const ILLS=[ill1,ill2,ill3,ill4,ill5];

// ---------- build
let D;
function build(stage,withCam){
 const st=h('style','',document.head);st.textContent=CSS;
 h('div','fsbg',stage);
 const pw=h('div','',stage);pw.id='pw';const pr=h('div','',pw);pr.id='pr';
 const conn=[0,1,2,3].map(()=>h('div','pcn',pr,'<i></i><b></b>'));
 const cards=STEPS.map((s,i)=>{const el=h('div','pc',pr);px(el,{top:-CH/2});
  const rip=h('div','pc-rip',el),inn=h('div','pc-in',el),pan=h('div','pc-pan',inn),step=h('div','pc-step',inn,'STEP '+(i+1)),title=h('div','pc-title',inn,s.t),sub=h('div','pc-sub',inn,s.s);
  const badge=h('div','badge pc-badge',inn,String(i+1)),tkr=h('div','pc-tkr',el),tk=h('div','pc-tk',el,svg(IC.tick,36,'#fff',3.4));
  return {el,rip,pan,step,title,sub,badge,tk,tkr,ill:ILLS[i](pan)}});
 const pm=h('div','',stage);pm.id='pm';
 const segs=[0,1,2,3].map(k=>{const s=h('div','sg',pm,'<i></i><b></b>');s.style.left=(60+100*k+16)+'px';return s});
 const dots=[0,1,2,3,4].map(()=>h('div','dt',pm,svg(IC.tick,16,'#fff',4)));
 let cam=null;
 if(withCam){cam=h('div','',stage);cam.id='pcam';cam.img=h('img','',cam);EG.seq('ar',FRAMES+'p2-path-cb1',1007);EG.seq('arI',FRAMES+'path-road-in',27)}
 D={pw,pr,conn,cards,pm,segs,dots,cam};
}

// ---------- one frame
const g75=x=>x<=0?0:1-(1+7.5*x)*Math.exp(-7.5*x);
function camAt(K,t){let r=K[0].to,F=Array(NC).fill(0).map((_,i)=>K[0].foc===i?1:0);
 for(let n=1;n<K.length;n++){const k=K[n];if(t<=k.t)break;const u=(k.ease||E.k4090)(C((t-k.t)/k.d));
  r={z:L(r.z,k.to.z,u),tx:L(r.tx,k.to.tx,u),ty:L(r.ty,k.to.ty,u)};F=F.map((v,i)=>L(v,k.foc===i?1:0,u))}
 return {c:r,F}}
async function draw(sp,t){
 const {c,F}=camAt(sp.cam,t),k=smooth((c.z-.68)/.18),m=sp.lay(t),mk=sp.mask(t),W=L(WC,CW,k),P=L(PC,PITCH,k);
 D.pr.style.transform=`translate(${c.tx.toFixed(3)}px,${c.ty.toFixed(3)}px) scale(${c.z.toFixed(5)})`;
 // beside his card (mk 1) the row fades out before it reaches him; on the full frame (mk 0) the neighbours fade out over the
 // last 110 px to each frame edge, so a title that runs off the frame dissolves instead of being cut mid-letter
 {const xl=L(110,0,mk),x1=L(1810,1256,mk),x2=L(1920,1346,mk);
  D.pw.style.webkitMaskImage=`linear-gradient(90deg,transparent 0,#000 ${xl.toFixed(1)}px,#000 ${x1.toFixed(1)}px,transparent ${x2.toFixed(1)}px)`}
 D.cards.forEach((cd,i)=>{
  const vis=t>=sp.visit[i],f=F[i],tin=sp.tiles?sp.tiles[i]:-99;
  px(cd.el,{left:i*P-W/2,width:W});
  const mo=EG.mat(cd.el,t,tin,{dy:56/c.z,blur:12/c.z});
  if(mo<=.001)return;
  cd.el.style.opacity=(mo*L(1,L(.5,1,f),k)).toFixed(4);
  cd.el.style.boxShadow=`0 ${L(24,40,f).toFixed(1)}px ${L(60,100,f).toFixed(1)}px rgba(16,48,94,${L(.13,.20,f).toFixed(3)}),0 ${L(2,3,f).toFixed(1)}px ${L(8,10,f).toFixed(1)}px rgba(16,48,94,${L(.06,.08,f).toFixed(3)})`;
  // the badge and the title: compact tile <-> full card
  const g0=vis?{x:56,y:56,s:92}:{x:(WC-220)/2,y:(CH-220)/2,s:220};
  let rs=-1;for(const[tr,ci]of sp.rip)if(ci===i&&t>tr)rs=t-tr;
  const bs=L(g0.s,92,k),bb=bump(t-(sp.count+i*2/FPS))*bump(rs)*(sp.visit[i]>-50?bump(t-sp.visit[i]+.04):1);   // counted off; landed on
  px(cd.badge,{left:L(g0.x,56,k),top:L(g0.y,56,k),width:bs,height:bs,fontSize:bs*.52});cd.badge.style.transform=`scale(${bb.toFixed(4)})`;
  const to=vis?1:smooth((k-.65)/.35);                       // the text waits until the big number has moved up to its corner
  [cd.title,cd.step,cd.sub].forEach(e=>{e.style.opacity=to.toFixed(3);show(e,to>.002)});
  cd.pan.style.opacity=k.toFixed(3);show(cd.pan,k>.002);
  // landed on as the step that starts now: one ripple off the card's frame
  const ron=rs>0&&rs<.6;show(cd.rip,ron);
  if(ron){const u=E.expo(C(rs/.6)),d=4+30*u;px(cd.rip,{left:-d,top:-d,width:W+2*d-8,height:CH+2*d-8,borderRadius:(44+d)+'px'});cd.rip.style.opacity=(.55*(1-u)).toFixed(3)}
  // the tick of a finished step
  const ts=t-sp.tick[i],tv=E.quart(C(ts/.28));show(cd.tk,tv>.002);
  if(tv>.002){cd.tk.style.opacity=tv.toFixed(3);cd.tk.style.transform=`scale(${((.6+.4*tv)*bump(ts)).toFixed(4)})`}
  const tr=ts>0&&ts<.6;show(cd.tkr,tr);if(tr){const u=E.expo(C(ts/.6));cd.tkr.style.transform=`scale(${(1+.7*u).toFixed(4)})`;cd.tkr.style.opacity=(.55*(1-u)).toFixed(3)}
  // its illustration
  if(k>.002){const B=sp.ill[i];cd.ill(B?n=>t-B[n]:()=>99,t>sp.wake[i]?t-sp.wake[i]:-1,i===0&&sp.ans!=null?t-sp.ans:-1e9)}
 });
 D.conn.forEach((el,n)=>{px(el,{left:n*P+W/2+14,width:P-W-28});el.style.opacity=sp.tiles?C((t-sp.tiles[n+1])/.15).toFixed(3):'1';   // a link arrives with the tile it leads to
  const s=t-sp.conn[n],p=E.expo(C(s/.55));el.firstChild.style.width=(p*100).toFixed(2)+'%';
  const on=s>0&&s<.55;show(el.lastChild,on);if(on)el.lastChild.style.left=(p*100).toFixed(2)+'%'});
 // the hand-over out of a break: the whole row, then the mini-map, leave with the house exit
 const xo=sp.out==null?-1:t-sp.out;
 if(xo>0){const q=C(xo/.42),e=E.expoIn(q);D.pw.style.transform=`translateY(${(56*e).toFixed(2)}px) scale(${(1-.06*e).toFixed(4)})`;
  D.pw.style.filter=`blur(${(12*e).toFixed(2)}px)`;D.pw.style.opacity=(1-C(q*1.15)).toFixed(3)}
 else{D.pw.style.transform='none';D.pw.style.filter='none';D.pw.style.opacity='1'}
 // mini-map
 px(D.pm,{left:L(700,AXR-260,m),top:L(866,808,m)});EG.mat(D.pm,t,sp.mapIn,{dy:40,exit:sp.out==null?null:sp.out+.06});
 D.dots.forEach((d,i)=>{const cur=lvl(sp.cur.map(([te,ci])=>[te,ci===i?1:0]),t),ds=t-sp.done[i],dn=E.quart(C(ds/.28)),a=Math.max(cur,dn),s=L(18,26,a)*bump(ds);
  px(d,{left:60+100*i-s/2,width:s,height:s,marginTop:-s/2});d.style.background=rgb(mixv(mixv(GREY,BLU,cur),GRN,dn));
  d.style.boxShadow=`0 0 0 ${(7*cur*(1-dn)).toFixed(2)}px rgba(0,117,253,.18)`;d.firstChild.style.opacity=dn.toFixed(3);d.firstChild.style.transform=`scale(${(.6+.4*dn).toFixed(3)})`});
 D.segs.forEach((el,n)=>{const s=t-sp.seg[n],p=E.expo(C(s/.55));el.firstChild.style.width=(p*100).toFixed(2)+'%';
  const on=s>0&&s<.55;show(el.lastChild,on);if(on)el.lastChild.style.left=(p*100).toFixed(2)+'%'});
 // his live camera: full frame -> its card (house spring); it leaves with the house exit when the voice stops
 if(D.cam){const o=sp.his.out,gone=t>o+.45;show(D.cam,!gone);
  if(!gone){const v=g75(t),H=HIS,kf=Math.round(t*FPS);
   px(D.cam,{left:H.x*v,top:H.y*v,width:L(1920,H.w,v),height:L(1080,H.h,v),borderRadius:H.r*v});
   D.cam.style.boxShadow=`0 34px 80px rgba(16,48,94,${(.28*v).toFixed(3)}),0 3px 10px rgba(16,48,94,${(.10*v).toFixed(3)})`;
   const ih=L(1080,H.h,v);px(D.cam.img,{left:H.ix*v,height:ih,width:ih*16/9});
   if(t>o){const q=C((t-o)/.42),e=E.expoIn(q);D.cam.style.transform=`translateY(${(56*e).toFixed(2)}px) scale(${(1-.06*e).toFixed(4)})`;D.cam.style.filter=`blur(${(12*e).toFixed(2)}px)`;D.cam.style.opacity=(1-C(q*1.15)).toFixed(3)}
   else{D.cam.style.transform='none';D.cam.style.filter='none';D.cam.style.opacity='1'}
   if(kf<27)await EG.frame(D.cam.img,'arI',kf/FPS);else await EG.frame(D.cam.img,'ar',Math.min(kf,1006)/FPS)}}
}
function run(id){const I=INST[id],sp=I.sp();build(document.getElementById('stage'),!!sp.his);
 EG.run(I.n/FPS,async t=>{await draw(sp,t+I.off)})}
return {run,INST,roadSpec,cbSpec,F0,FPS};
})();
