// p2-table-kit.js (video 14 PASS 2, worker `table`): a copy of table-kit.js (pass 1, untouched) with Artem's pass-2 notes:
//   - the invoice is an iOS notification banner (his note 1:51 "Let's model after iOS notifications"), not the Gmail web card;
//   - P17 shows Claude at $109/mo, not $29 (his note 14:58): the $29 the viewer last saw rolls to $109 as the table returns;
//   - E12 "With a human editor that would cost you days and probably another invoice.": the same banner as an alpha overlay
//     on his full-screen camera (a callback to Step 1), a "+3 days" chip, then another invoice stacks on top; it leaves before E13.
// Renders: a07b2 (= pass-1 a07b, 3289..3695), p17b (P17 on the REBUILT cut: 26879..27076, every P key is the pass-1 key - 153
// frames, checked against the voice), e12 (21648..21757, alpha). Pages: table-a07-diy-claude-v2, table-p17-v2, table-e12.
// ---- pass-1 header follows -----------------------------------------------------------------------------------------------
// table-kit.js (video 14, worker `table`): Step 1's table, ONE component with two modes and named states, drawn as a pure
// function of TIMELINE time, so every render is a window on the same animation and continuity holds by construction
// (rules/continuity.md). Look: Artem's approved pages graphics/looks/table-1-v2 … table-4-overlay (scripts/looks.py).
//
// Usage: <link rel=stylesheet href="../_lib/eg.css"><link rel=stylesheet href="../_lib/table-kit.css">
//        <script src="../_lib/eg.js"></script><script src="../_lib/table-kit.js"></script>
//        <div class="stage" id="stage"></div><script>TABLE.run('a01')</script>
//
// The renders (timeline frames at 29.97; first frame .. first frame after the last):
//   a01   2331..2954   A01-A05   CARD: the three ways teased, way 1 and its cells, the Entry-level row, $150; on the frame
//                                "…headaches start." is over the card grows to full frame and the table slides to its overlay
//                                place (OVERLAY); "3 days" on "wait days"
//   fio1  2954..3081   A06a      full screen, no camera: the first draft in Frame.io, three notes are left, then the wait (+24 h, +48 h)
//   a06b  3081..3185   A06b      OVERLAY as a01 left it: "because they sleep, | take breaks, | and edit for…" 3 -> 4 -> 5 -> 7+ days, red
//   fio2  3185..3289   A07a      full screen: the next video in Frame.io, the same three notes again
//   a07b  3289..3695   A07b-A10  OVERLAY without the table: the Gmail notification (a new invoice); on the frame "invoice." is
//                                over his camera shrinks into the card and the table returns (CARD): the ring travels to way 2,
//                                $0, 10+ hours, the cell turns red, way 2 is crossed out, way 3 lights
//   a10c  3695..3772   A10 end   the same shot carried on: "Claude" clears on "is to hand the video over to Claude", the ring
//                                ripples on the word; on the frame "…to Claude." is over the card grows back: the LAST frame is
//                                his plain full-frame camera (frame 3771), so A11 plays on the A-roll under it
//   a15   4120..4278   A15       CARD from the first frame (table as a07b left it): the cost turns green with its number
//                                withheld, 2-3 hours; "entry-level" pulses $150 against it; the card grows back, last frame = plain camera
//   p15   26620..26762 P15       CARD (between office-price and office-max): the withheld number resolves to $29, "/mo" on "a month"
//   p17   27032..27229 P17       CARD (after office-max): $150 against $29, then 7+ days against 2-3 hours; the card grows
//                                back, last frame = plain camera (frame 27228)
// Hand-offs for neighbours: a15 / p15 / p17 open on the house background + his card at the contract rectangle with the table
// rising in (its entrance is 3 frames in at the first frame); p15 ends on the table at rest + the card.
// His picture in the card: face column cx = 941 in Step 1 (the looks), 985 in the payoff (he sits further right there, and
// it is what office-price / office-max use, so the cuts between us do not move him). One number per render: INST[id].cx.
//
// Every cue below is a timeline FRAME, put on the frame the voice level resets before its word (cache aroll/env_db.npy),
// or on the frame the previous sentence's last word is over when the change falls between two sentences (rules/pacing.md).
window.TABLE2=(()=>{
const C=EG.clamp,E=EG.E,L=EG.lerp,FPS=30000/1001,F=f=>f/FPS;
const FR='/Users/<you>/Library/Caches/everygen-editor/14 Your First Claude Edit/frames/';   // his camera: <seq> at 3840 wide, <seq>-lo at 2296 (pipeline/graphics/aroll-frames.py)
const BLUE='#0075FD';
const INST={
 a07b2:{f0:3289,n:406,kind:'tbl',seq:'table-a07b',cx:941},                                   // camera frames checked identical on the rebuilt cut
 p17b:{f0:26879,n:197,kind:'tbl',seq:'table-p17-v2',cx:985,prev:'../table-p17-v2/prev.png'},
 e12:{f0:21648,n:109,kind:'ios',seq:'table-e12'},
 a01:{f0:2331,n:623,kind:'tbl',seq:'table-a01',cx:941},
 fio1:{f0:2954,n:127,kind:'fio',v:1},
 a06b:{f0:3081,n:104,kind:'tbl',seq:'table-a06b',cx:941},
 fio2:{f0:3185,n:104,kind:'fio',v:2},
 a07b:{f0:3289,n:406,kind:'tbl',seq:'table-a07b',cx:941},
 a10c:{f0:3695,n:77,kind:'tbl',seq:'table-a07b',off:406,cx:941},   // the end of A10, a second window on a07b's camera frames
 a15:{f0:4120,n:158,kind:'tbl',seq:'table-a15',cx:941,prev:'../table-a15/prev.png'},
 p15:{f0:26620,n:142,kind:'tbl',seq:'table-p15',cx:985,prev:'../table-p15/prev.png'},
 p17:{f0:27032,n:197,kind:'tbl',seq:'table-p17',cx:985,prev:'../table-p17/prev.png'}};
// `prev` = a still of the neighbour's LAST frame (his card cut out of it: the live card is on top), which leaves while the table rises in, so the swap between
// two graphics that share the card is a hand-over and not an empty frame. Re-shoot it when that neighbour changes:
// graphics/table-a15/shoot-prev.sh (dream -> a15, office-price -> p15, office-max -> p17). Without the file the table just rises in.
const K={
 way1:2387,    // "…videos edited." is over: the first way clears, its ring lights                        (A02 note: show the first way)
 c500:2447,    // "$500"                                                                                 (fill out the cell)
 c1000:2468,   // "to $1,000": the cell extends to $500–1,000
 t1:2486,      // "for a 10-minute YouTube video": 2–3 days, the unspoken cell
 row2:2550,    // "So, | most creators end up with entry-level talent": the Entry-level row joins way 1     (add another row)
 c150:2687,    // "$150"                                                                                 (fill out the cell)
 head:2748,    // "| and that's where the headaches start": the row's empty Time cell asks for attention
 ov:2796,      // "…headaches start." is over: the card grows to full frame, the table goes to its overlay place
 d3:2812,      // "You wait | days": 3 days                                                              (add 3 days to the cell)
 // fio1: 2954 cut in ("…instructions." is over)
 n1:2964,n2:2970,n3:2976,   // "So you leave your notes": three notes, one after the other
 clock:2994,   // "| and have to wait another": the wait
 h24a:2997,h24:3034,h48a:3046,h48:3064,   // the count reaches 24 on "24" and 48 on "48"
 // a06b: 3081 cut in ("hours" is over, before "because")
 d4:3093,      // "they sleep,"   4 days
 d5:3111,      // "| take breaks," 5 days
 d7:3133,      // "| and edit for three other clients." 7+ days, red                                     (3 -> 7 days, the cell becomes red, a-roll visible)
 // fio2: 3185 cut in ("…clients." is over)
 m1:3218,m2:3221,m3:3224,   // "to have to | explain the same things": the same three notes, at once
 v2:3259,      // "on the next video": the breadcrumb's "Video 2" lights
 // a07b: 3289 cut in ("video" is over, before "and get hit with a new invoice")
 gmail:3289,   // the Gmail notification                                                                 (gmail notification, can be over my a-roll)
 card:3340,    // "…invoice." is over: his camera shrinks into the card, the table returns
 diy:3367,     // "| editing yourself": the ring travels to way 2, its name clears                          (going to the DIY route, show it visually)
 c0:3404,      // "zero dollars": $0                                                                      (fill out the cell)
 h10:3458,     // "| tens of hours": 10+ hours                                                            (fill out the cell)
 red:3516,     // "…instead." is over: the cell turns red                                                 (the DIY time cell becomes red…)
 x:3603,       // "| this isn't an option": way 2 is crossed out                                          (…and we cross out this option)
 way3:3631,    // "…option." is over: the third way lights                                                (introduce the fourth row)
 claude:3701,  // "| is to hand the video over to Claude": the name and logo clear (on the word itself they had 10 frames before the table left)
 rip3:3743,    // "Claude": the ring ripples and the logo bumps on the word
 out:3754,     // "…Claude." is over: the card grows back to full frame (17 frames), the table leaves
 // a15: 4120 ("…waiting for you." is over)
 hid:4168,     // "would | cost": green, the number withheld                                              (both Claude cells become green, don't reveal the number)
 h23:4178,     // "less": 2–3 hours, the unspoken cell
 cmpA:4229,    // "an | entry-level editor": $150 pulses against it
 a15out:4260,  // "…editor." is over: the card grows back
 // p15: 26620 ("…of music." is over)
 antic:26535,  // "| editing them costs you": the withheld number gets restless        (pass 2: all P keys -153 frames)
 d29:26569,    // "$29": it resolves
 mo:26585,     // "a month": /mo
 // p17: 27032 ("…Max plan" is over)
 up:26890,     // pass 2, "Either way,": $29 rolls to $109 (Max $100 + Everygen $9) as the Claude row settles
 cmpC:26900,   // "| that's less than a single video from an entry-level editor": $150 against $109
 cmpT:26995,   // "| without the time you'd spend managing them": 7+ days against 2–3 hours
 p17out:27058, // "…managing them." is over: the card grows back
 // pass 2, e12 (E12 on his full-screen camera; the A-roll cut into E12 is 21648, into E13 21757)
 e0:21648,     // the cut into "With a human editor": the vignette, the invoice banner drops in
 eDays:21673,  // "| that would cost you days": +3 days
 eAnd:21704,   // "| and probably another invoice": another banner lands on top, the first goes behind it
 eOut:21746};  // "invoice" is said (its -s tail runs to 21755): everything leaves, gone by 21756
// his camera: the box and the picture inside it, in stage px. card = contract .cam; ov = looks/table-4-overlay (he is
// reframed to the right, a soft dark vignette on the left); full = the plain camera frame.
const CAMS=cx=>({
 card:{bx:1350,by:217,bw:455,bh:645,br:14,ix:1350+227.5-cx*645/1080,iy:217,iw:645*16/9,sh:1,vg:0},
 ov:{bx:0,by:0,bw:1920,bh:1080,br:0,ix:0,iy:-70,iw:2611,sh:0,vg:1},
 full:{bx:0,by:0,bw:1920,bh:1080,br:0,ix:0,iy:0,iw:1920,sh:0,vg:0}});
// per render: where the camera starts, its moves [frame, to, frames in which the house spring lands exactly],
// `enter` = it materializes (after a full-screen graphic with no camera); `top` = the camera is drawn over the table,
// so a hand-over to or from the full frame uncovers / covers the table instead of the table ghosting over his face
const CAMTRK={
 a01:{s:'card',enter:2328,keys:[[K.ov,'ov',18]]},
 a06b:{s:'ov',keys:[]},
 a07b:{s:'ov',top:1,keys:[[K.card,'card',18],[K.out,'full',17]]},
 a07b2:{s:'ov',top:1,keys:[[K.card,'card',18],[K.out,'full',17]]},
 p17b:{s:'card',top:1,keys:[[K.p17out,'full',17]]},
 a10c:{s:'card',top:1,keys:[[K.out,'full',17]]},
 a15:{s:'card',top:1,keys:[[K.a15out,'full',17]]},
 p15:{s:'card',keys:[]},
 p17:{s:'card',top:1,keys:[[K.p17out,'full',17]]}};
// per render: the table's entrance / exit frames (none = it is simply there) and its mode (0 card, 1 overlay)
const TBL={
 a01:{in:2328,m:t=>Math.min(1,g(t-F(K.ov))/g(18/FPS))},
 fio1:{out:2954,m:()=>1,ghost:1},          // the overlay table leaves over the first frames of the Frame.io scene (an overlay never vanishes at a cut)
 a06b:{in:3081-8,stag:.05,m:()=>1},        // …and is 8 frames into its entrance when the cut comes back to him
 fio2:{out:3185,m:()=>1,ghost:1},
 a07b:{in:K.card+4,out:K.out,m:()=>0},
 a07b2:{in:K.card+4,out:K.out,m:()=>0},
 p17b:{in:26876,out:K.p17out,m:()=>0},
 a10c:{out:K.out,m:()=>0},
 a15:{in:4117,out:K.a15out,m:()=>0},
 p15:{in:26617,m:()=>0},
 p17:{in:27029,out:K.p17out,m:()=>0}};
const COL={neu:['#F0F2F7','#1C1E22'],red:['#FDE5E6','#D5373D'],amb:['#FFEFC2','#9A6200'],grn:['#D9F2E3','#1B8050']};
const RIPC={neu:'#9AA3B5',red:'#E5484D',amb:'#E0A100',grn:'#30A46C'};
const Q='<span class="q">?</span>';

function g(x,w=7.5){return x<=0?0:1-(1+w*x)*Math.exp(-w*x)}
const q=(t,f,d=.28)=>E.quart(C((t-F(f))/d));
const bump=(t,f,a=.10,d=.3)=>{const x=(t-F(f))/d;return x<=0||x>=1?1:1+a*Math.sin(Math.PI*x)};
const bounce=(t,f,a=.14)=>{const x=t-F(f);return x<=0?1:1+a*Math.exp(-7*x)*Math.sin(17*x)};
const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const mix=(a,b,k)=>{const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')})`};
const h=(tag,cls,parent,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e};
function ripple(el,t,f,r,col,grow=22){const x=(t-F(f))/.6;if(x<=0||x>=1){el.style.opacity=0;return}
 const gg=3+grow*E.expo(x);el.style.inset=(-gg).toFixed(2)+'px';el.style.borderRadius=(r+gg).toFixed(2)+'px';el.style.borderColor=col;el.style.opacity=(.55*Math.pow(1-x,1.6)).toFixed(3)}
let _n=0;
// the person avatar (approved): head and shoulders, the shoulders running out of the circle's bottom edge
function sil(bg='#E6E9F0',fg='#99A0AD'){const c='tkav'+(++_n);
 return `<svg viewBox="0 0 60 60"><defs><clipPath id="${c}"><circle cx="30" cy="30" r="30"/></clipPath></defs><g clip-path="url(#${c})"><rect width="60" height="60" fill="${bg}"/><circle cx="30" cy="23.5" r="10.5" fill="${fg}"/><ellipse cx="30" cy="59" rx="21" ry="20.5" fill="${fg}"/></g></svg>`}
const YOU=()=>sil('#D9E9FF',BLUE);

let ID,I,D={},W=null;

// =====================================================================================================================
// the table
// =====================================================================================================================
// a cell's script: col = [[frame, colour]], faces = [[frame | null (there from the start), html]]
const CELLS={
 expC:{col:[[K.c500,'red']],faces:[[null,Q],[K.c500,'<span>$500</span><span class="ext">–1,000</span>']]},
 expT:{col:[[K.t1,'grn']],faces:[[null,Q],[K.t1,'2–3 days']]},
 entC:{col:[[K.c150,'amb']],faces:[[null,Q],[K.c150,'$150']]},
 entT:{col:[[K.d7,'red']],faces:[[null,Q],[K.d3,'<span class="box nb"></span><span>&nbsp;days</span>']]},
 diyC:{col:[[K.c0,'grn']],faces:[[null,Q],[K.c0,'$0']]},
 diyT:{col:[[K.red,'red']],faces:[[null,Q],[K.h10,'10+ hours']]},
 claC:{col:[[K.hid,'grn']],faces:[[null,Q],[K.hid,'<span>$</span><span class="box h9"><span>1</span></span><span class="box h0"><i class="hid"></i><span>2</span><span>0</span></span><span class="box h1"><i class="hid"></i><span>9</span></span><span class="mo">/mo</span>']]},
 claT:{col:[[K.h23,'grn']],faces:[[null,Q],[K.h23,'2–3 hours']]}};
const DAYS=[[K.d3,'3'],[K.d4,'4'],[K.d5,'5'],[K.d7,'7+']];

function buildTable(root){
 const tbl=h('div','tk-tbl',root),inn=h('div','tk-in',tbl);D.tbl=tbl;
 D.hdr=h('div','tk-hdr',inn,'<div class="n"></div><div class="c">Cost</div><div class="c">Time</div>');
 const grp=i=>{const el=h('div','tk-grp',inn),num=h('div','tk-num',el,`<div class="badge">${i}</div>`),card=h('div','tk-gcard',el);return {el,badge:num.firstChild,card}};
 const cell=(ri,key)=>{const c=h('div','tk-cell',ri),pw=h('div','tk-pw',c),rip=h('div','tk-rip',pw),hl=h('div','tk-hl',pw),pill=h('div','tk-pill',pw);
  const S=CELLS[key],ev=S.col.map(([f,k])=>[f,RIPC[k]]);S.faces.forEach(([f],i)=>{if(i&&!S.col.some(([cf])=>cf===f))ev.push([f,RIPC.neu])});ev.sort((a,b)=>a[0]-b[0]);
  return {pw,rip,hl,pill,S,ev,faces:S.faces.map(([f,html])=>h('div','tk-face',pill,html))}};
 const row=(G,key,av,name)=>{const r=h('div','tk-row',G.card),ri=h('div','ri',r),n=h('div','n',ri,av+`<span>${name}</span>`);
  return {r,ri,n,cost:cell(ri,key+'C'),time:cell(ri,key+'T')}};
 const G=[grp(1),grp(2),grp(3)];D.G=G;
 D.exp=row(G[0],'exp',`<div class="tk-av">${sil()}<div class="tk-star">★</div></div>`,'Experienced');
 D.ent=row(G[0],'ent',`<div class="tk-av">${sil()}</div>`,'Entry-level');
 D.diy=row(G[1],'diy',`<div class="tk-av">${YOU()}</div>`,'Do it yourself');
 D.cla=row(G[2],'cla','<div class="tk-av cl"></div>','Claude');
 D.strike=h('div','tk-strike',G[1].card);
 D.ring=h('div','tk-ring',inn);D.rring=h('div','tk-rring',inn);
 // the rolling day count and the withheld digits
 D.nb=D.ent.time.faces[1].querySelector('.nb');D.days=DAYS.map(([f,s])=>h('span','',D.nb,s));
 const cf=D.cla.cost.faces[1];D.hb=[cf.querySelector('.h0'),cf.querySelector('.h1')];D.mo=cf.querySelector('.mo');D.h9=cf.querySelector('.h9');
 D.ext=D.exp.cost.faces[1].querySelector('.ext');
}
// text widths in em of the pill's font (EverygenNeue 600, -.01em), measured once the fonts are in
function measure(){const m=h('div','',document.body);Object.assign(m.style,{position:'absolute',left:'-9999px',top:'0',font:'600 400px EverygenNeue',letterSpacing:'-.01em',whiteSpace:'nowrap'});
 const w=s=>{m.textContent=s;return m.getBoundingClientRect().width/400};
 W={d:{'3':w('3'),'4':w('4'),'5':w('5'),'7+':w('7+')},n2:w('2'),n9:w('9'),n0:w('0'),n1:w('1'),ext:w('–1,000')};
 m.style.fontWeight='500';W.mo=w('/mo');m.remove()}

function drawCell(c,t,m){
 const S=c.S;let bg=COL.neu[0],fg=COL.neu[1],sc=1,last=null;
 for(const [f,k] of S.col){const p=q(t,f);if(p>0){bg=mix(bg,COL[k][0],p);fg=mix(fg,COL[k][1],p)}}
 for(const [f,col] of c.ev){sc*=bump(t,f);if(t>=F(f))last=[f,col]}
 c.pill.style.background=bg;c.pill.style.color=fg;c.hl.style.color=fg;
 c.faces.forEach((el,i)=>{const s=S.faces[i][0],nx=S.faces[i+1]?.[0];
  EG.mat(el,t,s==null?-9:F(s),{dy:30,blur:8,dur:.42,exit:nx==null?null:F(nx),exitDy:-26,exitDur:.2})});
 if(last)ripple(c.rip,t,last[0],18-3*m,last[1]);else c.rip.style.opacity=0;
 return sc}

function drawTable(t){
 const cfg=TBL[ID],m=cfg.m(t),k=g(t-F(K.row2));
 D.tbl.style.setProperty('--m',m.toFixed(5));D.ent.r.style.setProperty('--k',k.toFixed(5));
 D.hdr.style.color=m<.001?'#7C8290':`rgba(${Math.round(L(124,255,m))},${Math.round(L(130,255,m))},${Math.round(L(144,255,m))},${L(1,.85,m).toFixed(3)})`;
 // entrance / exit: header, then the three ways, 0.10 s apart in reading order
 const tin=cfg.in==null?-9:F(cfg.in),tout=cfg.out==null?null:F(cfg.out);
 [D.hdr,D.G[0].el,D.G[1].el,D.G[2].el].forEach((el,i)=>EG.mat(el,t,tin+(cfg.stag??.10)*i,{exit:tout==null?null:tout+.025*(3-i),exitDur:cfg.ghost?.26:.34}));
 if(cfg.ghost)D.hdr.style.visibility='hidden';
 EG.mat(D.ent.ri,t,F(K.row2)+.07,{dy:40});
 // names: a way is teased (sharp table, the name lightly blurred) until he gets to it
 const clr=(r,f)=>{const p=f==null?1:E.expo(C((t-F(f))/.65)),b=9*(1-p),fl=f==null?1:1+.10*Math.sin(Math.PI*C((t-F(f))/.65));
  const fs=b<.05?'none':`blur(${b.toFixed(2)}px) brightness(${fl.toFixed(3)})`;[...r.n.children].forEach(e=>e.style.filter=fs);r.n.style.color=mix('#3A3F4A','#1C1E22',p)};
 clr(D.exp,K.way1);clr(D.ent,null);clr(D.diy,K.diy);clr(D.cla,K.claude);
 // cells
 const sc={};for(const r of ['exp','ent','diy','cla'])for(const c of ['cost','time'])sc[r+c]=drawCell(D[r][c],t,m);
 // "$500" then "–1,000"
 {const p=E.expo(C((t-F(K.c1000))/.36));D.ext.style.width=(W.ext*p).toFixed(4)+'em';D.ext.style.opacity=C((t-F(K.c1000))/.10).toFixed(3)}
 // the day count rolls: 3 -> 4 -> 5 -> 7+
 {const w7=g(t-F(K.d7),12);D.nb.style.width=L(W.d['4'],W.d['7+'],w7).toFixed(4)+'em';
  D.days.forEach((el,i)=>{const s=DAYS[i][0],nx=DAYS[i+1]?.[0];EG.mat(el,t,i?F(s):-9,{dy:22,blur:5,dur:.32,s0:.8,exit:nx==null?null:F(nx),exitDy:-22,exitDur:.16})})}
 // the withheld number: two blocks that breathe; on "$29" each clears into its digit; "/mo" on "a month"
 D.hb.forEach((b,i)=>{const f=K.d29+3*i,p=E.expo(C((t-F(f))/.5)),rest=t>=F(K.antic)?1:0;
  const br=rest?.5+.5*Math.sin((t-F(K.antic))*15-i*1.4):.5+.5*Math.sin(t*3.2-i*1.1);
  const wu=i?0:g(t-F(K.up),11);   // pass 2: the tens roll 2 -> 0 on "Either way"
  b.style.width=L(L(.706,i?W.n9:W.n2,p),W.n0,wu).toFixed(4)+'em';b.style.marginLeft=L(.235,0,p).toFixed(4)+'em';
  b.firstChild.style.opacity=((.26+.16*br)*(1-C((t-F(f))/.18))).toFixed(3);
  b.firstChild.style.transform=`scale(${(1+(rest?.06:0)*br).toFixed(4)})`;
  EG.mat(b.children[1],t,F(f),{dy:24,blur:10,dur:.5,s0:.7,...(i?{}:{exit:F(K.up),exitDy:-24,exitDur:.2})});
  if(!i)EG.mat(b.children[2],t,F(K.up)+.03,{dy:24,blur:8,dur:.42,s0:.8})});
 // pass 2: the hundreds digit "1" grows in on the left of it ($29 -> $109)
 {const p=g(t-F(K.up),11);D.h9.style.width=(W.n1*p).toFixed(4)+'em';EG.mat(D.h9.firstChild,t,F(K.up),{dy:24,blur:8,dur:.42,s0:.8})}
 {const p=g(t-F(K.mo),11);D.mo.style.width=(W.mo*p).toFixed(4)+'em';D.mo.style.marginLeft=(.05*p).toFixed(3)+'em';D.mo.style.opacity=(.8*C((t-F(K.mo))/.15)).toFixed(3)}
 // beats on a cell: the headaches start; the comparisons with the entry-level row
 sc.enttime*=bump(t,K.head,.12,.34)*bump(t,K.d4,.06,.24)*bump(t,K.d5,.06,.24);if(t<F(K.d3)){ripple(D.ent.time.rip,t,K.head,18-3*m,RIPC.red);const x=(t-F(K.head))/.7,pk=x<=0||x>=1?0:Math.sin(Math.PI*x);D.ent.time.faces[0].firstChild.style.color=mix('#A2A8B4','#D5373D',pk)}
 const pulse=(f,hold)=>t<=F(f)?0:Math.min(q(t,f),1-E.inout(C((t-F(f)-.28-hold)/.45)));
 const hlC=Math.max(pulse(K.cmpA,.75),pulse(K.cmpC,(K.cmpT-K.cmpC)/FPS-.45)),hlT=q(t,K.cmpT);
 D.ent.cost.hl.style.opacity=D.cla.cost.hl.style.opacity=hlC.toFixed(3);D.ent.time.hl.style.opacity=D.cla.time.hl.style.opacity=hlT.toFixed(3);
 sc.entcost*=bump(t,K.cmpA,.08)*bump(t,K.cmpC,.08);sc.clacost*=bump(t,K.cmpA+3,.08)*bump(t,K.cmpC+3,.10)*bump(t,K.d29,.12,.34);
 sc.enttime*=bump(t,K.cmpT,.08);sc.clatime*=bump(t,K.cmpT+3,.10);
 if(t>=F(K.cmpC)&&t<F(K.cmpT))ripple(D.cla.cost.rip,t,K.cmpC+3,18,RIPC.grn);
 if(t>=F(K.cmpT))ripple(D.cla.time.rip,t,K.cmpT+3,18,RIPC.grn);
 if(t>=F(K.d29)&&t<F(K.up))ripple(D.cla.cost.rip,t,K.d29,18,RIPC.grn,30);
 if(t>=F(K.up)&&t<F(K.cmpC))ripple(D.cla.cost.rip,t,K.up,18,RIPC.grn,26);sc.clacost*=bump(t,K.up,.10,.34);
 D.exp.ri.style.opacity=L(1,.38,q(t,K.cmpC,.35)).toFixed(3);
 for(const r of ['exp','ent','diy','cla'])for(const c of ['cost','time'])D[r][c].pw.style.transform=`scale(${sc[r+c].toFixed(4)})`;
 // way 2 is crossed out
 D.strike.style.transform=`rotate(-1.2deg) scaleX(${E.expo(C((t-F(K.x))/.5)).toFixed(4)})`;D.strike.style.opacity=t>=F(K.x)?1:0;
 D.G[1].card.style.opacity=L(1,.6,q(t,K.x,.4)).toFixed(3);
 // the ring: the way he is on. Lights on way 1, travels to way 2, goes when way 2 is crossed out, lights on way 3.
 const H=118-20*m,nw=92*(1-m),cw=(1155-455*m)-nw,h1=H+k*(H+1.5),y1=60,y2=y1+h1+22,y3=y2+H+22;
 const R=[[y1,h1],[y2,H],[y3,H]];let ry,rh,ro,gi;
 if(t<F(K.way3)){const p=g(t-F(K.diy));ry=L(R[0][0],R[1][0],p);rh=L(R[0][1],R[1][1],p);ro=q(t,K.way1)*(1-q(t,K.x,.3));gi=p<.5?0:1}
 else{ry=R[2][0];rh=R[2][1];ro=q(t,K.way3);gi=2}
 Object.assign(D.ring.style,{left:nw.toFixed(2)+'px',top:ry.toFixed(2)+'px',width:cw.toFixed(2)+'px',height:rh.toFixed(2)+'px'});
 // the ring enters and leaves with the way it is on
 const gm=D.G[gi].el.style;D.ring.style.opacity=(ro*(+gm.opacity)).toFixed(3);D.ring.style.transform=gm.transform;D.ring.style.filter=gm.filter;
 const rf=t>=F(K.rip3)?K.rip3:t>=F(K.way3)?K.way3:t>=F(K.diy)+.2?K.diy+6:K.way1;
 {const x=(t-F(rf))/.6;if(x<=0||x>=1||ro<.5)D.rring.style.opacity=0;else{const gg=4+24*E.expo(x);
   Object.assign(D.rring.style,{left:(nw-gg).toFixed(2)+'px',top:(ry-gg).toFixed(2)+'px',width:(cw+2*gg).toFixed(2)+'px',height:(rh+2*gg).toFixed(2)+'px',borderRadius:(26+gg).toFixed(2)+'px',opacity:(.5*Math.pow(1-x,1.6)).toFixed(3)})}}
 D.cla.n.firstChild.style.transform=`scale(${bump(t,K.rip3,.16,.34).toFixed(4)})`;
 D.G[0].badge.style.transform=`scale(${bump(t,K.way1,.14).toFixed(4)})`;D.G[1].badge.style.transform=`scale(${bump(t,K.diy,.14).toFixed(4)})`;D.G[2].badge.style.transform=`scale(${bump(t,K.way3,.14).toFixed(4)})`;
}

// =====================================================================================================================
// his camera
// =====================================================================================================================
function drawCam(t){
 const trk=CAMTRK[ID],S=CAMS(I.cx),st={...S[trk.s]};
 for(const [f,to,land] of trk.keys){const x=t-F(f);if(x<=0)break;const p=land?Math.min(1,g(x)/g(land/FPS)):g(x),B=S[to];for(const key in st)st[key]=L(st[key],B[key],p)}
 Object.assign(D.cam.style,{left:st.bx.toFixed(3)+'px',top:st.by.toFixed(3)+'px',width:st.bw.toFixed(3)+'px',height:st.bh.toFixed(3)+'px',borderRadius:st.br.toFixed(2)+'px',
  boxShadow:`0 34px 80px rgba(16,48,94,${(.28*st.sh*(1-(D.prevOp||0))).toFixed(3)}),0 3px 10px rgba(16,48,94,${(.10*st.sh*(1-(D.prevOp||0))).toFixed(3)})`});
 Object.assign(D.camImg.style,{left:(st.ix-st.bx).toFixed(3)+'px',top:(st.iy-st.by).toFixed(3)+'px',width:st.iw.toFixed(3)+'px',height:(st.iw*9/16).toFixed(3)+'px'});
 D.vig.style.opacity=st.vg.toFixed(4);D.cam.style.zIndex=trk.top?6:2;
 if(trk.enter!=null)EG.mat(D.cam,t,F(trk.enter));
 return st.bw<455.5;     // at rest in the card: the card-sized copy of his frames is enough (and renders several times faster)
}

// =====================================================================================================================
// the Gmail notification (Google's own Gmail mark; the sender is the editor: the table's grey figure)
// =====================================================================================================================
const GMAIL='<svg viewBox="52 42 88 66"><path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/><path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/><path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/><path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/><path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/></svg>';
// pass 2: the iOS notification banner (light mode, iOS 17/18): a frosted platter, the Gmail app icon, the sender as the title
// with "now" on its right, one body line. It drops in from above on a spring like a real banner and is dismissed upwards.
// In a07b2 the platter frosts his live camera under it (backdrop-filter); in the e12 alpha overlay there is nothing under it
// in the page, so it carries its own blurred copy of his frame (aroll-frames 'table-e12'), cut to its shape.
const BODY1='Invoice for Video 2 · $150',BODY2='Invoice for Video 2 · revisions';
const CLOCK='<svg viewBox="0 0 32 32" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="12.5"/><path d="M16 9v7.5l4.8 3"/></svg>';
function banner(root,body,baked){const b=h('div','ios'+(baked?' baked':''),root);
 b.innerHTML=(baked?'<div class="bg"><img></div>':'')+`<div class="tint"></div><div class="ct"><div class="ic">${GMAIL}</div><div class="tx"><div class="l1"><span class="ti">Your editor</span><span class="now">now</span></div><div class="bd">${body}</div></div></div>`;
 return {el:b,img:baked?b.querySelector('.bg img'):null,ct:b.querySelector('.ct'),tint:b.querySelector('.tint')}}
// the drop: materialize's blur / scale / opacity, the rise mirrored (from above) on an underdamped spring (about 8% overshoot);
// the exit: slides up and out (iOS dismissal), the materialize mirror
function drop(el,t,s,o={}){const dy=o.dy??74,x=t-s;
 const sp=x<=0?0:1-Math.exp(-9*x)*(Math.cos(13*x)+9/13*Math.sin(13*x)),e=E.expo(C(x/.5));
 let y=-(1-sp)*dy,sc=.94+.06*e,b=(1-e)*12,op=C(x/.15);
 if(o.exit!=null&&t>o.exit){const q=C((t-o.exit)/(o.exitDur??.3)),f=E.expoIn(q);y-=f*(o.exitDy??46);sc*=1-.04*f;b+=f*10;op*=1-C(q*1.15)}
 el.style.opacity=op.toFixed(4);el.style.transform=(o.base||'')+` translateY(${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;el.style.filter=b>.05?`blur(${b.toFixed(2)}px)`:'none';
 el.style.visibility=op<=.001?'hidden':'visible';return op}
function buildGmail(root){D.b1=banner(root,BODY1,false);D.b1.el.classList.add('a07')}
function drawGmail(t){if(ID!=='a07b2'){D.b1.el.style.visibility='hidden';return}
 drop(D.b1.el,t,F(K.gmail-4),{exit:F(K.card),exitDy:46,exitDur:.3})}

// ---- e12: the overlay on his full-screen camera (alpha): soft dark vignette on the left, the banner beside his face
// (he sits in the centre: hair from x 800, shoulder from x 660 below y 450), "+3 days" in Everygen blue, then another
// invoice lands on top and the first goes behind it like an iOS stack. Centred as a group at every moment (house spring).
const EG12={x:115,yc:400,gap:20,peek:18};
function buildE12(root){D.vg=h('div','tk-vig e12v',root);
 D.e1=banner(root,BODY1,true);D.e2=banner(root,BODY2,true);D.e2.el.style.zIndex=9;D.e1.el.style.zIndex=8;
 D.chip=h('div','dchip',root,`${CLOCK}<span>+3 days</span>`)}
async function drawE12(t,lt){const H=D.e1.el.offsetHeight,CH=D.chip.offsetHeight;
 // his frame, blurred, under each platter (both sit at the same left; the img is offset so it lines up with the stage)
 for(const B of [D.e1,D.e2]){await EG.frame(B.img,'ar',lt)}
 const k1=g(t-F(K.eDays)),k2=g(t-F(K.eAnd)),tot=H+k1*(EG12.gap+CH)+k2*EG12.peek,top=EG12.yc-tot/2;
 for(const B of [D.e1,D.e2]){B.el.style.left=EG12.x+'px';B.el.style.top=top.toFixed(2)+'px';B.img.style.left=(-EG12.x)+'px';B.img.style.top=(-top).toFixed(2)+'px'}
 D.chip.style.left=EG12.x+'px';D.chip.style.top=(top+H+k2*EG12.peek+EG12.gap).toFixed(2)+'px';
 const out=F(K.eOut);
 D.vg.style.opacity=(E.quart(C((t-F(K.e0))/.4))*(1-E.inout(C((t-out)/.32)))).toFixed(4);
 // the first banner: drops in at the cut; when the second lands it goes behind (narrower, its bottom edge peeking out)
 const s2=E.expo(C((t-F(K.eAnd)-.06)/.45));
 drop(D.e1.el,t,F(K.e0)-2/FPS,{exit:out,exitDur:.3,base:`translateY(${(EG12.peek*s2).toFixed(2)}px) scale(${(1-.075*s2).toFixed(4)})`});
 D.e1.ct.style.opacity=(1-C(s2*1.6)).toFixed(3);D.e1.tint.style.background=`rgba(${Math.round(L(244,226,s2))},${Math.round(L(244,226,s2))},${Math.round(L(247,230,s2))},${L(.84,.88,s2).toFixed(3)})`;
 drop(D.e2.el,t,F(K.eAnd),{exit:out,exitDur:.3});
 EG.mat(D.chip,t,F(K.eDays),{dy:40,exit:out+.05,exitDy:-46,exitDur:.28,base:`scale(${bounce(t,K.eDays,.06).toFixed(4)})`});
}

// =====================================================================================================================
// the Frame.io review window (full screen, no camera): the draft, the notes, the wait
// =====================================================================================================================
const IC={
 back:'<svg width="14" height="22" viewBox="0 0 14 22" fill="none" stroke="#C9CBD6" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3L3 11l8 8"/></svg>',
 down:'<svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="#C9CBD6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l6 6 6-6"/></svg>',
 pause:'<svg width="22" height="26" viewBox="0 0 22 26" fill="#fff"><rect x="2" y="2" width="6" height="22" rx="2"/><rect x="14" y="2" width="6" height="22" rx="2"/></svg>',
 loop:'<svg width="30" height="26" viewBox="0 0 30 26" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3l4 4-4 4"/><path d="M5 12V10a3 3 0 0 1 3-3h17"/><path d="M9 23l-4-4 4-4"/><path d="M25 14v2a3 3 0 0 1-3 3H5"/></svg>',
 vol:'<svg width="30" height="26" viewBox="0 0 30 26" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h4.5L15 4v18l-6.5-5.5H4z"/><path d="M20 8.5a6 6 0 0 1 0 9"/><path d="M23.5 5a11 11 0 0 1 0 16"/></svg>',
 pin:'<svg width="24" height="28" viewBox="0 0 24 28" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"><path d="M12 26s9-8.3 9-15a9 9 0 0 0-18 0c0 6.700 9 15 9 15z"/><circle cx="12" cy="11" r="2.4" fill="#fff" stroke="none"/></svg>',
 gear:'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.830l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.510V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.820.33l-.06.06a2 2 0 1 1-2.830-2.830l.06-.06a1.65 1.65 0 0 0 .33-1.820 1.650 1.650 0 0 0-1.510-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.600 9a1.650 1.650 0 0 0-.33-1.820l-.06-.06a2 2 0 1 1 2.830-2.830l.06.06a1.650 1.650 0 0 0 1.820.33H9a1.650 1.650 0 0 0 1-1.510V3a2 2 0 1 1 4 0v.09a1.650 1.650 0 0 0 1 1.510 1.650 1.650 0 0 0 1.820-.33l.06-.06a2 2 0 1 1 2.830 2.830l-.06.06a1.650 1.650 0 0 0-.33 1.820V9a1.650 1.650 0 0 0 1.510 1H21a2 2 0 1 1 0 4h-.09a1.650 1.650 0 0 0-1.510 1z"/></svg>',
 full:'<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h8v8"/><path d="M23 3l-8.500 8.500"/><path d="M11 23H3v-8"/><path d="M3 23l8.500-8.500"/></svg>',
 dot:(c='#8C8FA0')=>`<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="${c}" stroke-width="2.200"><circle cx="13" cy="13" r="10"/></svg>`,
 lines:'<svg width="24" height="22" viewBox="0 0 24 22" fill="none" stroke="#A5A8B6" stroke-width="2.400" stroke-linecap="round"><path d="M3 4h18M3 11h13M3 18h8"/></svg>',
 search:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A5A8B6" stroke-width="2.400" stroke-linecap="round"><circle cx="10.500" cy="10.500" r="7"/><path d="M21 21l-5.200-5.200"/></svg>',
 more:'<svg width="26" height="8" viewBox="0 0 26 8" fill="#A5A8B6"><circle cx="4" cy="4" r="2.600"/><circle cx="13" cy="4" r="2.600"/><circle cx="22" cy="4" r="2.600"/></svg>',
 globe:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A5A8B6" stroke-width="2.200"><circle cx="12" cy="12" r="9.500"/><path d="M2.500 12h19M12 2.500c3 3.400 3 15.600 0 19M12 2.500c-3 3.400-3 15.600 0 19"/></svg>',
 send:'<svg width="24" height="22" viewBox="0 0 24 22" fill="#fff"><path d="M22.500 1.200L1.500 9.300c-.7.300-.7 1.200 0 1.500l6 2.300 2.300 6.700c.2.700 1.100.8 1.500.2l3-4.300 4.600 3.300c.5.400 1.200.1 1.300-.5L23.500 2c.1-.6-.5-1-1-.8zM9.800 12.400l8.800-6.700-6.900 8.200-.6 3.300z"/></svg>'};
const VIDS={
 1:{crumb:'Video 1',g:['#DCE9FF','#A9C6F6'],lx:770,total:'10:04',notes:[['00:48',.080],['03:12',.318],['06:40',.662]]},
 2:{crumb:'Video 2',g:['#EADFFD','#C4B1F2'],lx:230,total:'08:31',notes:[['00:31',.061],['02:54',.340],['05:47',.679]]}};
const NOTES=['Cut this pause','Wrong b-roll here','Music is too loud'];
function buildFio(root){const V=VIDS[I.v];
 const w=h('div','fio',root);D.fio=w;
 h('div','bar',w,`${IC.back}<span class="cr" id="fcr">${V.crumb}</span><span class="sl">/</span><span>Drafts</span><span class="sl">/</span><span class="file">draft-1.mp4</span><span class="ver">v1</span>${IC.down}<div class="tog"></div>`);
 h('div','vid',w,`<svg viewBox="0 0 1000 562"><defs><linearGradient id="fvg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${V.g[0]}"/><stop offset="1" stop-color="${V.g[1]}"/></linearGradient>
  <linearGradient id="fvf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D97FF"/><stop offset="1" stop-color="#0062E0"/></linearGradient></defs>
  <rect width="1000" height="562" fill="url(#fvg)"/><circle cx="${V.lx}" cy="130" r="230" fill="#fff" opacity=".34"/>
  <circle cx="500" cy="226" r="98" fill="url(#fvf)"/><ellipse cx="500" cy="622" rx="262" ry="250" fill="url(#fvf)"/>
  <rect x="318" y="462" width="364" height="46" rx="23" fill="#fff" opacity=".94"/><rect x="344" y="479" width="170" height="12" rx="6" fill="#B9C6DC"/><rect x="526" y="479" width="110" height="12" rx="6" fill="#0075FD"/></svg>`);
 const trk=h('div','trk',w,'<i></i><b></b>');D.fprog=trk.firstChild;D.fhead=trk.lastChild;
 D.fmk=V.notes.map(([tc,x])=>{const e=h('div','mk',w,YOU());e.style.left=(20+1000*x)+'px';return e});
 const ctl=h('div','ctl',w,`${IC.pause}${IC.loop}<span>1.0x</span>${IC.vol}<div class="tc"><b id="ftc" style="font-weight:500"></b> <span>/ ${V.total}</span></div><div class="rt">${IC.pin}${IC.gear}<span class="hd">HD</span>${IC.full}</div>`);
 const pan=h('div','pan',w);
 h('div','tabs',pan,'<div class="on">Comments</div><div>Fields</div>');
 h('div','all',pan,`<span>All comments</span>${IC.down}<div class="ic">${IC.lines}${IC.search}${IC.more}</div>`);
 D.fcm=V.notes.map(([tc],i)=>{const e=h('div','cm',pan,`<div class="hd"><div class="a">${YOU()}</div>You <i>now</i></div><div class="bd"><span class="tcc">${tc}</span>${NOTES[i]}</div><div class="ft">Reply<b>#${i+1}</b></div>`);e.style.top=(110+152*i)+'px';return e});
 h('div','cmp',pan,`<div class="l1"><span class="tcc" id="fct"></span>Leave your comment…</div><div class="l2">${IC.dot()}${IC.dot()}${IC.dot()}<div class="pub">${IC.globe}Public</div><div class="send">${IC.send}</div></div>`);
 D.fdim=h('div','dim',w);
 // the wait: one lap of the dial = 24 hours
 const ticks=[...Array(12).keys()].map(i=>`<line x1="50" y1="${i%3?9:8}" x2="50" y2="${i%3?13:15}" stroke="${i%3?'#C3CAD8':'#8B93A6'}" stroke-width="${i%3?2:2.600}" stroke-linecap="round" transform="rotate(${i*30} 50 50)"/>`).join('');
 D.wait=h('div','wait',root,`<div class="ck"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" stroke="#E3E7EF" stroke-width="5"/>
   <circle id="wl1" cx="50" cy="50" r="46" fill="none" stroke="#9CC8FF" stroke-width="5" stroke-linecap="round" transform="rotate(-90 50 50)"/>
   <circle id="wl2" cx="50" cy="50" r="46" fill="none" stroke="#0075FD" stroke-width="5" stroke-linecap="round" transform="rotate(-90 50 50)"/>${ticks}
   <line id="wh" x1="50" y1="50" x2="50" y2="29" stroke="#1C1E22" stroke-width="5" stroke-linecap="round"/><line id="wm" x1="50" y1="50" x2="50" y2="17" stroke="#0075FD" stroke-width="3.600" stroke-linecap="round"/><circle cx="50" cy="50" r="4.500" fill="#1C1E22"/></svg></div>
  <div class="nm"><i>+</i><span id="wn">0</span><small>h</small></div>`);
 if(I.v!==1)D.wait.style.display='none';
}
function drawFio(t){const V=VIDS[I.v],$=i=>document.getElementById(i),N=I.v===1?[K.n1,K.n2,K.n3]:[K.m1,K.m2,K.m3];
 EG.mat(D.fio,t,F(I.f0-5),{dy:70,s0:.95});
 // the playhead goes to each note's timecode as it is left
 let x=V.notes[0][1],cur=0;N.forEach((f,i)=>{if(i)x=EG.spring(t,F(f)-.06,x,V.notes[i][1],13);if(i&&t>=F(f)-.03)cur=i});
 D.fprog.style.width=(x*100).toFixed(3)+'%';D.fhead.style.left=(x*100).toFixed(3)+'%';
 $('ftc').textContent=V.notes[cur][0];$('fct').textContent=V.notes[cur][0];
 D.fcm.forEach((e,i)=>EG.mat(e,t,F(N[i]),{dy:44,s0:.9,base:`scale(${bounce(t,N[i],.05).toFixed(4)})`}));
 D.fmk.forEach((e,i)=>{const p=E.expo(C((t-F(N[i]+2))/.3));e.style.transform=`scale(${(p*bounce(t,N[i]+2,.25)).toFixed(4)})`;e.style.opacity=C((t-F(N[i]+2))/.1).toFixed(3)});
 {const p=I.v===2?q(t,K.v2,.3):0,e=$('fcr');e.style.background=`rgba(0,117,253,${(.9*p).toFixed(3)})`;e.style.color=mix('#9A9DAB','#FFFFFF',p);e.style.transform=`scale(${bump(t,K.v2,.10).toFixed(4)})`}
 if(I.v!==1)return;
 // the wait
 D.fdim.style.opacity=(.5*q(t,K.clock,.35)).toFixed(3);
 EG.mat(D.wait,t,F(K.clock),{dy:64,base:`scale(${bounce(t,K.clock,.06).toFixed(4)})`});
 const a=E.quart(C((t-F(K.h24a))/(F(K.h24)-F(K.h24a)))),b=E.inout(C((t-F(K.h48a))/(F(K.h48)-F(K.h48a)))),hrs=24*a+24*b,ang=hrs*15,CIRC=2*Math.PI*46;
 $('wn').textContent=Math.round(hrs);
 $('wm').setAttribute('transform',`rotate(${ang.toFixed(2)} 50 50)`);$('wh').setAttribute('transform',`rotate(${(300+ang/12).toFixed(2)} 50 50)`);
 $('wl1').setAttribute('stroke-dasharray',`${(CIRC*Math.min(1,hrs/24)).toFixed(2)} ${CIRC.toFixed(2)}`);$('wl1').style.opacity=hrs>0.2?1:0;
 $('wl2').setAttribute('stroke-dasharray',`${(CIRC*C((hrs-24)/24)).toFixed(2)} ${CIRC.toFixed(2)}`);$('wl2').style.opacity=hrs>24.2?1:0;
 $('wn').parentNode.style.transform=`scale(${(bump(t,K.h24-2,.07)*bump(t,K.h48-2,.09)).toFixed(4)})`;
}

// =====================================================================================================================
function run(id){ID=id;I=INST[id];const stage=document.getElementById('stage'),root=h('div','tk',stage);
 if(I.kind==='ios'){buildE12(root);EG.seq('ar',FR+I.seq,I.n);EG.run(I.n/FPS,async t=>{await drawE12(F(I.f0)+t,t)});return}
 h('div','fsbg',root);
 if(I.kind==='fio'){buildFio(root);buildTable(root);EG.run(I.n/FPS,async t=>{if(!W)measure();const tg=F(I.f0)+t;drawFio(tg);drawTable(tg)});return}
 D.cam=h('div','tk-cam',root);D.camImg=h('img','',D.cam);D.vig=h('div','tk-vig',D.cam);
 if(I.prev){D.prev=h('div','tk-prev',root);const im=h('img','',D.prev);im.onerror=()=>{D.prev.remove();D.prev=null};im.src=I.prev}
 buildGmail(root);buildTable(root);EG.seq('ar',FR+I.seq,I.n+(I.off||0));EG.seq('arlo',FR+I.seq+'-lo',I.n+(I.off||0));
 EG.run(I.n/FPS,async t=>{if(!W)measure();const tg=F(I.f0)+t;
  D.prevOp=D.prev?EG.mat(D.prev,tg,-9,{exit:F(I.f0)-.002,exitDy:24,exitDur:.26,blur:12,s0:.97}):0;const lo=drawCam(tg);await EG.frame(D.camImg,lo?'arlo':'ar',t+(I.off||0)/FPS);drawGmail(tg);
  drawTable(tg)})}
return {run,INST,K,FPS,F};
})();
