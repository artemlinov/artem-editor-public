// Video 13 progression graphic, FINAL pass (worker: prog). prog-graph-v2.js with Artem's last notes; pg1 and pg2 are
// unchanged (their v2 renders stay on the timeline), pg3 and pg5 are re-timed to the final cut and re-built:
//   - the "?" on the camera card is gone from pg3 on: the answer (Fable edited the intro) is out by then (rules/continuity.md)
//   - pg3 no longer grows the card back to full-screen A-roll: the next sentence opens on a full-screen graphic (the plans
//     page), so the board holds its final state to its last frame and the cut goes graphic to graphic
//   - pg5 no longer cuts in at the sentence start: "But, whichever model you pick, the real question is," plays on plain
//     full-screen A-roll, the camera shrinks into its card as "is," ends, and the story move is fitted to the joints of
//     "how do you turn Claude | from a show-off | into a pro editor | that actually understands your content?"
// The card plays his LIVE camera of that very moment and hands over to and from full-screen A-roll by shrinking / growing
// (house spring); a render that hands over starts or ends on the exact full-frame camera picture.
//
// Named states and the move each instance makes (rules/continuity.md):
//   intro   --pg1-->  teased    camera shrinks in on "But in the real world,"; Cost row, then Time row; the card grows back
//   teased  --pg2-->  timed     camera shrinks in; 84 min, 63 min, the tick, the tallies (a side visual); the card grows back
//   timed   --pg3-->  priced    hard cut in from the pricing page; $20.75, $11.64, "Included in Pro"; HOLDS, hard cut to the plans page
//   priced  --pg5-->  unlocked  camera shrinks in before "how do you"; both models light on "from a show-off", the wires draw
//                               down on "into a pro editor", "Your edit" unlocks on "that actually understands your content";
//                               the card grows back once "content?" is said and is full frame on E02's A-roll
// KEEP = every change that persists (instance + frame inside it): earlier ones draw as settled, later ones as not there yet.
// All numbers are frames (29.97) from the instance's first frame; pg3 and pg5 from `pipeline/timeline.py words` on the
// FINAL cut, each joint put on the frame the voice level resets before its word (cache aroll/env_db.npy).
window.PROG3=(()=>{
const C=EG.clamp,E=EG.E,L=EG.lerp,FPS=30000/1001;
const BLUE='#0075FD',NAVY='#10305E',LINE='#B9BDC6';
const GY=150,COLX=[190,1230],CW=500,FH=130,ROW={cost:GY+290,time:GY+450};
const CARD={x:736,y:GY,w:448,h:252,r:21};                       // where the camera lives inside the graphic
const FR='/Users/<you>/Library/Caches/everygen-editor/13 Fable 5.2 Editing/frames/';
const SPARK='m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z';
const ORDER=['pg1','pg2','pg3','pg5'];
const START={pg1:10466,pg2:11745,pg3:12731,pg5:14879};          // timeline frame of each instance's first frame
const N={pg1:173,pg2:407,pg3:314,pg5:184};                      // length in frames
const CAMDIR={pg1:'prog-pg1',pg2:'prog-pg2',pg3:'prog3-pg3',pg5:'prog3-pg5'};   // his camera, re-extracted for the final cut
const QMARK={pg1:1,pg2:1};                                      // the mystery marker on the card: only while it is a mystery
// hand-overs, in frames inside the instance: `in` = the camera starts shrinking into its card (null = hard cut in),
// `out` = it starts growing back; it is exactly full frame GROW frames later, on the instance's last frame (null = the
// board holds to the last frame and the next full-screen graphic cuts in).
const GROW=17,HAND={pg1:{in:0,out:155},pg2:{in:0,out:389},pg3:{in:null,out:null},pg5:{in:0,out:166}};
const HI_IN=20,HI_LEAD=3;                                       // full-resolution camera frames: the first 20, and from 3 before `out`
const KEEP={
  qCost:['pg1',35],       // "what matters just as much" (the row is active before "is what an edit")
  qTime:['pg1',140],      // reads on "time"
  vTimeL:['pg2',82],      // "84"
  vTimeR:['pg2',144],     // "63"
  win:['pg2',169],        // "That's a real improvement"
  vCostR:['pg3',65],      // "$20.75"                                     f12796, 4 frames before "twenty"
  tagApi:['pg3',126],     // "At API rates,": starts the frame "cents" is over (f12857), 3 frames before "At" (his final rule)
  vCostL:['pg3',198],     // "$11.64"                                     f12929, 4 frames before "eleven"
  tagPro:['pg3',250],     // "but on the Pro plan it's already included"  f12981, the silence before "but"
  both:['pg5',51],        // "from a show-off": Opus, then Fable, light   f14930, "Claude" is over
  draw:['pg5',79],        // "into a pro editor": the wires draw down     f14958, the silence before "into"
  unlock:['pg5',110]};    // "that actually understands your content": they reach "Your edit" and it unlocks   f14989
const ONCE={pg1:{},pg2:{render:225,review:274,fable:313},pg3:{},pg5:{}};   // pg2: "Opus ran two full renders" / "and extra review rounds" / "while Fable got there"

const h=(tag,cls,parent,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e};
const box=(parent,x,y,w,hh,cls)=>{const e=h('div','pgx-w '+(cls||''),parent);Object.assign(e.style,{left:x+'px',top:y+'px',width:w+'px',height:hh+'px'});return e};
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const mix=(a,b,k)=>{const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')})`};
const CHECK=(bg)=>`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${bg}"/><path d="M6.5 12.5l3.6 3.6 7.4-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const TICK=`<svg viewBox="0 0 24 24"><path d="M4.5 12.8l4.6 4.6 10.4-11" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const FILM=`<svg viewBox="0 0 48 48" width="100%" height="100%"><rect x="5" y="10" width="38" height="28" rx="7" fill="none" stroke="${NAVY}" stroke-width="3.5"/><path d="M20.5 18v12l10-6z" fill="${NAVY}"/></svg>`;

let CUR,IDX,HN,D={};
const at=k=>{const[i,f]=KEEP[k],j=ORDER.indexOf(i);return j<IDX?-99:j>IDX?1e9:f/FPS};
const once=k=>{const f=ONCE[CUR][k];return f==null?1e9:f/FPS};
// 0 = his camera fills the frame, 1 = it sits in its card (critically damped spring, w 7.5; the way out lands exactly on 0)
const g=x=>1-(1+7.5*x)*Math.exp(-7.5*x);
const camV=t=>{let v=HN.in==null?1:t<=HN.in/FPS?0:g(t-HN.in/FPS);
  if(HN.out!=null&&t>HN.out/FPS){const x=Math.min(t-HN.out/FPS,GROW/FPS);v*=1-g(x)/g(GROW/FPS)}return v};

function build(stage){
  const root=h('div','pgx',stage);h('div','pgx-dots',root);
  const NS='http://www.w3.org/2000/svg';
  const mkSvg=parent=>{const s=document.createElementNS(NS,'svg');s.setAttribute('class','pgx-wires');s.setAttribute('width',1920);s.setAttribute('height',1080);parent.appendChild(s);return s};
  const sv=(svg,tag,a)=>{const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e};
  const grp=()=>h('div','pgx-g',root);
  // groups, in drawing order (later ones sit on top); G lists them in the order they enter
  const gYou=grp(),gL=grp(),gR=grp(),gCost=grp(),gTime=grp();D.G=[gL,gR,gCost,gTime,gYou];
  // Your edit and the long wires from each column (grey dashed until they are drawn in blue)
  const sy=mkSvg(gYou),defs=sv(sy,'defs',{}),top=GY+594,ey=GY+700;
  D.cy=[[440,694],[1480,1226]].map(([x,tx],i)=>{const d=`M${x} ${top} L${x} ${ey-40} Q${x} ${ey} ${x+(i?-40:40)} ${ey} L${tx} ${ey}`;
    const base=sv(sy,'path',{d,fill:'none',stroke:LINE,'stroke-width':5,'stroke-linecap':'round','stroke-dasharray':'14 12'});
    const m=sv(defs,'mask',{id:'pgxm'+i,maskUnits:'userSpaceOnUse',x:0,y:0,width:1920,height:1080});
    const mp=sv(m,'path',{d,fill:'none',stroke:'#fff','stroke-width':18});
    const lit=sv(sy,'path',{d,fill:'none',stroke:BLUE,'stroke-width':5,'stroke-linecap':'round','stroke-dasharray':'14 12',mask:`url(#pgxm${i})`});
    const glow=sv(sy,'circle',{r:16,fill:'rgba(0,117,253,.26)'}),head=sv(sy,'circle',{r:6.5,fill:BLUE,stroke:'#fff','stroke-width':2});
    return {base,mp,lit,glow,head,len:base.getTotalLength()}});
  D.youW=box(gYou,710,GY+620,500,160);D.youRip=h('div','pgx-rip',D.youW);
  D.you=h('div','pgx-you',D.youW,`<div class="ic">${FILM}</div><span>Your edit</span>`);
  D.youCk=h('div','pgx-youck',D.youW,CHECK(BLUE));
  // model nodes, each with its short wire to the camera card
  const ty=GY+126;
  D.node=['Opus 5.5','Fable 5.2'].map((name,i)=>{const G=i?gR:gL,[a,b]=i?[1221,1193]:[699,727];
    const wire=sv(mkSvg(G),'path',{d:`M${a} ${ty} L${b} ${ty}`,fill:'none','stroke-width':5,'stroke-linecap':'round','stroke-dasharray':'7 9'});
    const w=box(G,COLX[i],GY+61,CW,130,'pgx-node'),rip=h('div','pgx-rip',w),ring=h('div','pgx-ring',w);ring.style.borderRadius='38px';
    h('div','pgx-card',w,`<div class="pgx-chip"><svg viewBox="0 0 24 24"><path fill="#D97757" d="${SPARK}"/></svg><span>${name}</span></div>`);
    return {w,ring,rip,wire}});
  // rows
  const mkRow=(G,key,label,ph,vals)=>{const y=ROW[key];
    const rip=h('div','pgx-labrip',G),lab=h('div','pgx-lab',G,label);
    Object.assign(lab.style,{left:'960px',top:(y+FH/2)+'px'});
    const f=COLX.map((x,i)=>{const w=box(G,x,y,CW,FH,'pgx-field'),rp=h('div','pgx-rip',w),ring=h('div','pgx-ring',w);ring.style.borderRadius='34px';
      h('div','pgx-card',w);const clip=h('div','pgx-clip',w);
      return {w,rip:rp,ring,q:h('div','pgx-val',clip,ph),v:h('div','pgx-val',clip,vals[i])}});
    return {lab,rip,f}};
  D.cost=mkRow(gCost,'cost','Cost','<span class="u">$</span><span class="q">?</span>',
    ['<span class="u">$</span><span class="n">11.64<b class="pgx-strike"></b></span>','<span class="u">$</span><span class="n">20.75</span>']);
  D.time=mkRow(gTime,'time','Time','<span class="q">?</span><span class="u m">min</span>',
    ['<span class="n">84</span><span class="u m">min</span>','<span class="n">63</span><span class="u m">min</span>']);
  D.strike=D.cost.f[0].v.querySelector('.pgx-strike');D.num=D.cost.f[0].v.querySelector('.n');
  D.win=h('div','pgx-win',D.time.f[1].w,CHECK('#30A46C'));
  D.tagApi=h('div','pgx-tag api',D.cost.f[0].w,'API rate');
  D.tagPro=h('div','pgx-tag pro',D.cost.f[0].w,TICK+'<span>Included in Pro</span>');
  // pg2 side visual: each Time card opens downward into a tally of what the model did
  if(CUR==='pg2'){const row=(i,k,word,n,left)=>{const el=h('div','pgx-tally',D.time.f[i].w.querySelector('.pgx-clip'),`<span class="w">${word}</span><span class="pips">${'<i></i>'.repeat(n)}</span>`);
      Object.assign(el.style,{left:left+'px',top:(122+52*k)+'px'});return el};
    D.steps={oA:row(0,0,'Render',2,80),oB:row(0,1,'Review',4,80),fA:row(1,0,'Render',1,134),fB:row(1,1,'Review',2,134)}}
  // his live camera (on top of everything: at v = 0 it IS the frame), and the "?" on its top edge
  D.cam=h('div','pgx-cam',root);D.camImg=h('img','',D.cam);
  if(QMARK[CUR]){D.q=h('div','pgx-q',root,'?');Object.assign(D.q.style,{left:'922px',top:(GY-38)+'px'})}
  EG.seq('ar',FR+CAMDIR[CUR],N[CUR]);
  if(HN.in!=null)EG.seq('arI',FR+CAMDIR[CUR]+'-in',HI_IN);
  if(HN.out!=null)EG.seq('arO',FR+CAMDIR[CUR]+'-out',N[CUR]-(HN.out-HI_LEAD));
}

async function draw(t){
  const q=(t0,d=.28)=>E.quart(C((t-t0)/d));
  const chain=(v,keys)=>{for(const[k,target,d]of keys){if(t<=k)break;v+=(target-v)*E.quart(C((t-k)/(d||.28)))}return v};
  const pulse=(t0,hold=.45,out=.5)=>t<=t0?0:Math.min(q(t0),1-E.inout(C((t-t0-.28-hold)/out)));
  const bump=(t0,amt=.12,d=.27)=>1+amt*Math.sin(Math.PI*C((t-t0)/d));
  const bounce=t0=>t<=t0?1:1+.16*Math.exp(-7*(t-t0))*Math.sin(17*(t-t0));
  const ripple=(el,t0,r,col)=>{const x=(t-t0)/.6;if(x<=0||x>=1){el.style.opacity=0;return}
    const gg=4+24*E.expo(x);el.style.inset=(-gg).toFixed(2)+'px';el.style.borderRadius=(r+gg).toFixed(2)+'px';el.style.borderColor=col||BLUE;el.style.opacity=(.55*Math.pow(1-x,1.6)).toFixed(3)};
  const flow=(-t*96).toFixed(2);
  const tIn=HN.in==null?-9:HN.in/FPS,tOut=HN.out==null?1e9:HN.out/FPS;

  // ---- the hand-over: his camera <-> its card, the board materializes around it and leaves under it
  const v=camV(t),k=Math.round(t*FPS);
  Object.assign(D.cam.style,{left:L(0,CARD.x,v).toFixed(3)+'px',top:L(0,CARD.y,v).toFixed(3)+'px',width:L(1920,CARD.w,v).toFixed(3)+'px',height:L(1080,CARD.h,v).toFixed(3)+'px',
    borderRadius:(CARD.r*v).toFixed(2)+'px',boxShadow:`0 34px 90px rgba(16,48,94,${(.28*v).toFixed(3)}),0 6px 18px rgba(16,48,94,${(.12*v).toFixed(3)})`});
  if(HN.in!=null&&k-HN.in<HI_IN)await EG.frame(D.camImg,'arI',Math.max(0,k-HN.in)/FPS);
  else if(HN.out!=null&&k>=HN.out-HI_LEAD)await EG.frame(D.camImg,'arO',(k-(HN.out-HI_LEAD))/FPS);
  else await EG.frame(D.camImg,'ar',k/FPS);
  D.G.forEach((el,i)=>EG.mat(el,t,tIn+.10+.08*i,{exit:tOut+.02*(D.G.length-1-i),exitDur:.34}));
  if(D.q)EG.mat(D.q,t,tIn+.62,{dy:24,s0:.6,exit:tOut-.04,exitDur:.2,base:`scale(${bounce(tIn+.62).toFixed(4)})`});

  // ---- model nodes: ring (pg5: Opus, then Fable, on "whichever model you pick")
  const rL=CUR==='pg5'?q(at('both')):0,rR=CUR==='pg5'?q(at('both')+.3):0;
  D.node.forEach((n,i)=>{const r=i?rR:rL;n.ring.style.opacity=r.toFixed(3);
    n.wire.setAttribute('stroke',mix(LINE,BLUE,r));n.wire.setAttribute('stroke-dashoffset',flow)});
  ripple(D.node[0].rip,CUR==='pg5'?at('both')+.05:1e9,30);ripple(D.node[1].rip,CUR==='pg5'?at('both')+.35:1e9,30);

  // ---- rows: in pg1 a row lights when he gets to it and stays active until the camera takes over again
  const rowLab=(row,t0)=>{const on=CUR==='pg1'?q(t0):0,b=CUR==='pg1'?bump(t0):1;
    row.lab.style.transform=`translate(-50%,-50%) scale(${b.toFixed(4)})`;row.lab.style.background=mix('#E8F3FF',BLUE,on);row.lab.style.color=mix('#1C1E22','#FFFFFF',on);
    const w=row.lab.offsetWidth,hh=row.lab.offsetHeight,x=(t-t0)/.6;
    if(CUR!=='pg1'||x<=0||x>=1){row.rip.style.opacity=0}else{const gg=2+20*E.expo(x);
      Object.assign(row.rip.style,{left:(960-w/2-gg)+'px',top:(parseFloat(row.lab.style.top)-hh/2-gg)+'px',width:(w+2*gg)+'px',height:(hh+2*gg)+'px',borderRadius:(36+gg)+'px',opacity:(.55*Math.pow(1-x,1.6)).toFixed(3)})}};
  rowLab(D.cost,at('qCost'));rowLab(D.time,at('qTime'));
  const field=(f,tq,tv,ring,ripT)=>{
    EG.mat(f.q,t,tq,{dy:34,exit:tv,exitDy:-34,exitDur:.26});EG.mat(f.v,t,tv,{dy:34});
    f.ring.style.opacity=(.92*ring).toFixed(3);ripple(f.rip,ripT,26)};
  const R={cL:0,cR:0,tL:0,tR:0};
  if(CUR==='pg1'){R.cL=pulse(at('qCost'),.7,.6);R.cR=pulse(at('qCost')+.1,.7,.6);R.tL=pulse(at('qTime'),.7,.6);R.tR=pulse(at('qTime')+.1,.7,.6)}
  if(CUR==='pg2'){R.tL=pulse(at('vTimeL'));R.tR=pulse(at('vTimeR'))}
  if(CUR==='pg3'){R.cR=chain(0,[[0,1],[at('vCostR')+.75,0,.5]]);R.cL=chain(0,[[at('tagApi'),1],[at('vCostL')+.75,0,.5]])}
  field(D.cost.f[0],at('qCost'),at('vCostL'),R.cL,at('vCostL')+.06);
  field(D.cost.f[1],at('qCost')+.1,at('vCostR'),R.cR,at('vCostR')+.06);
  field(D.time.f[0],at('qTime'),at('vTimeL'),R.tL,at('vTimeL')+.06);
  field(D.time.f[1],at('qTime')+.1,at('vTimeR'),R.tR,at('vTimeR')+.06);
  // the shorter time wins: a green tick on its corner
  EG.mat(D.win,t,at('win'),{dy:26,s0:.6,base:`scale(${bounce(at('win')).toFixed(4)})`});
  // Opus's cost: "API rate" first, then "Included in Pro" takes its place and the price is struck
  EG.mat(D.tagApi,t,at('tagApi'),{dy:30,exit:at('tagPro'),exitDy:-22,exitDur:.24});
  EG.mat(D.tagPro,t,at('tagPro')+.04,{dy:30,s0:.8,base:`scale(${bounce(at('tagPro')+.04).toFixed(4)})`});
  {const sx=E.expo(C((t-at('tagPro')-.36)/.55));D.strike.style.transform=`scaleX(${sx.toFixed(4)})`;D.num.style.color=mix(NAVY,'#8B93A6',sx)}

  // ---- Your edit: wires draw down (draw-line), then it lights up. The draw takes the time between its two joints:
  // the node unlocks when the first wire is 91% through its time, as in pass 2 (26 frames then gave .95 s)
  const drawD=(KEEP.unlock[1]-KEEP.draw[1])/FPS/.915;
  D.cy.forEach((c,i)=>{const x=(t-at('draw')-i*.1)/drawD,p=E.expo(C(x));
    c.base.setAttribute('stroke-dashoffset',flow);c.lit.setAttribute('stroke-dashoffset',flow);
    c.mp.setAttribute('stroke-dasharray',c.len.toFixed(2));c.mp.setAttribute('stroke-dashoffset',(c.len*(1-p)).toFixed(2));
    c.lit.style.visibility=p>0?'visible':'hidden';
    const pt=c.base.getPointAtLength(c.len*p),o=x>0&&x<1?Math.min(1,x/.04)*(1-C((x-.55)/.45)):0;
    [c.glow,c.head].forEach(e=>{e.setAttribute('cx',pt.x.toFixed(2));e.setAttribute('cy',pt.y.toFixed(2));e.style.opacity=o.toFixed(3)})});
  {const u=at('unlock'),kk=q(u),lit=t>=u,br=lit?.5+.5*Math.sin((t-u)*2.4-Math.PI/2):0;   // a slow breath while it holds
   D.you.style.border=`4px ${lit?'solid '+BLUE:'dashed '+LINE}`;
   D.you.style.boxShadow=lit?`0 0 0 ${(9*kk+3*br*kk).toFixed(2)}px rgba(0,117,253,.16),0 30px 70px rgba(0,117,253,${(.25*kk+.08*br*kk).toFixed(3)})`:'0 20px 50px rgba(16,48,94,.10)';
   D.youW.style.transform=`scale(${(bump(u,.05,.3)*EG.spring(t,u,1,1.04)).toFixed(4)})`;
   ripple(D.youRip,u+.04,34);
   EG.mat(D.youCk,t,u+.14,{dy:22,s0:.5,base:`scale(${bounce(u+.14).toFixed(4)})`})}

  // ---- pg2 side visual: the Time cards grow (house spring) only as far as the rows that have arrived
  if(D.steps){const S=D.steps,tR=once('render'),tV=once('review'),tF=once('fable');
    D.time.f[0].w.style.height=EG.spring(t,tV,EG.spring(t,tR,FH,186),238).toFixed(2)+'px';
    D.time.f[1].w.style.height=EG.spring(t,tF,FH,238).toFixed(2)+'px';
    const put=(el,t0)=>{EG.mat(el,t,t0,{dy:30});
      [...el.querySelectorAll('i')].forEach((p,j)=>{const xx=t-(t0+.14+j*.1);p.style.transform=`scale(${(xx<=0?0:E.expo(C(xx/.3))*(1+.3*Math.exp(-7*xx)*Math.sin(17*xx))).toFixed(4)})`})};
    put(S.oA,tR+.04);put(S.oB,tV+.04);put(S.fA,tF+.04);put(S.fB,tF+.14);
    // a fully opened card covers its wire's corner: the wire steps back instead of hugging the card's bottom edge
    D.cy[0].base.style.opacity=(1-q(tV,.3)).toFixed(3);D.cy[1].base.style.opacity=(1-q(tF,.3)).toFixed(3)}
}

function run(id){CUR=id;IDX=ORDER.indexOf(id);HN=HAND[id];build(document.getElementById('stage'));EG.run(N[id]/FPS,draw)}
return {run,ORDER,START,N,HAND,GROW,KEEP,ONCE,FPS,CAMDIR};
})();
