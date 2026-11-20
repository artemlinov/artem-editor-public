// PASS 2 (2026-11-19) copy of team-board.js for worker `team`: pages team-b10-v2, b13-v2, b17-v2, b20-v2, b26-v2.
// ALL FRAME NUMBERS BELOW ARE PASS-1 TIMELINE FRAMES. The pass-2 cut sits OFF = -31 frames earlier for the whole of Step 2
// (CB2 25 frames shorter + the A25 gap 6 frames), so timeline frame = frame + OFF (checked word by word with timeline.py words).
// What changed against pass 1 (his notes 4:03, 4:20, 5:03):
//   b10-v2  B10-B12 as before, then at the end of B12 ("…before you see it.") the board leaves and his card grows to full
//           screen: B13-B15 play on full-screen A-roll (Q.out1).
//   b13-v2  B16 only: the card shrinks back from full screen as the board returns (Q.back); a SHORT beat of Claude Code
//           coding the tools from scratch (twice, each time they land slightly different), then the week that is great,
//           the graphic that glitches, the word that gets chopped (as in pass 1). The long coding visual, the clock and
//           the three Edit copies are gone.
//   b17-v2  the Everygen toolkit + Editing principles as two big cards LOW under the tools with clear white space (his green
//           box, pass2/2.png); the whole board rises to make room (no course chip on top any more). b20-v2 matches.
//   b26-v2  B26 full screen, no camera: his own screenshot of epidemicsound.com in a clean browser window, every card whole;
//           punch-in on the Creator card's $17.99 on "$18 a month", the price boxed, then struck through ("no more paying").
// Every page plays its camera card from frames made by pipeline/graphics/aroll-frames.py on the pass-2 cut (p2tb10, p2tb13,
// p2tb17, p2tb20): his LIVE picture through every grow and shrink.
// Usage: <script src="../_lib/eg.js"></script><script src="../_lib/p2-team-board.js"></script> + team-board.css + p2-team-board.css,
//   then TEAM2.run('b10v2')   // a page id from PAGES: [first (pass-1) frame, frame after the last, mode]
// ---- the pass-1 header, still true where not changed above:
// Worker `team` (video 14): Step 2's team board (Artem's pick for the progression graphic inside Step 2), one component
// with named states. Every page draws the SAME board as a pure function of TIMELINE time, so each return continues from
// the state the last instance left (rules/continuity.md) by construction.
// Renders: graphics/renders/team-<id>.mp4 (team-b18.mov is the alpha overlay). team-b04.mp4 was rendered before B10-B12 got its own
// page, so it runs 359 frames past its row: only its first 516 frames (to timeline frame 6827) are used; team-b10.mp4 follows.
// work/place/team.json and team-sfx.json are written from PAGES and SFX below by graphics/team-b01/tools/place.mjs (node);
// tools/render.sh <id> renders a page in 4K with its voiced preview, tools/whole-preview.py makes the one-piece review copy.
// States, in story order (the cue of each is a timeline frame in Q, taken from `pipeline/timeline.py words` on the locked cut):
//   solo      B01  Claude alone, big, "Project manager"
//   pipeline  B02  Plan (ticked) - Claude - Edit (crossed): it plans well, it can't do the hands-on work
//   team      B03  the top row moves up; five empty seats (the five hats), then wires and names (members of your team)
//   roles     B04-B12  one seat lights and opens per role (a small picture of the job), its tool docks on the tool sentence
//   coded     B13-B14  Claude Code codes the tools itself, slowly (the sound library is the one it can't code: "most")
//   breaking  B15-B16  the tools are re-coded from scratch three times and come back cracked; a good week, a glitch, a chopped word
//   everygen  B17  a blue beam turns the tools into one Everygen toolkit; the editing principles join it; the camera grows back
//   (B18-B19 is the overlay strip over his full-screen camera: mode 'ov')
//   sound     B20  the board returns in the everygen state; the principles light, a pulse runs up, the sound designer opens.
//                  It ends on frame 8206, where worker timeline's tl-mono (B21) starts with the same camera card in place;
//                  B26 (mode 'es') starts on 9087 where tl-music ends and ends on 9214 where scr-s2 (B27) starts.
window.TEAM2=(()=>{
const C=EG.clamp,L=EG.lerp,E=EG.E,FPS=30000/1001,F=f=>f/FPS,OFF=-31;
const BLUE='#0075FD',INK='#1C1E22',GREY='#B3B9C5',MUT='#8B8F9A',LINE='#C9D3E6',GREEN='#30A46C',RED='#E5484D';
const FRD='/Users/<you>/Library/Caches/everygen-editor/14 Your First Claude Edit/frames/';
const CARD={x:1350,y:217,w:455,h:645,r:14},CX=942;            // contract: .cam of looks/table-3.html
const AX=115,AW=1155,ACX=AX+AW/2;                              // the free area left of his card
const SY=548,NY=664,TY=746,BUS=444,SW=[156,312],SH=[156,178],COLX=337;                            // seat row, names, tools, the wire bus
// pass 2: the toolkit cards (height HC) sit GAP under the tools' tray; the board rises UP px when they arrive (B17, B20)
const HC=104,GAP=56,UP=46;
// [first frame, frame after the last, mode, camera frames of the page (aroll-frames on the pass-2 cut)]
const PAGES={b10v2:[6827,7204,'',['p2tb10',377]],b13v2:[7482,7716,'',['p2tb13',234]],b17v2:[7716,7908,'',['p2tb17',192]],
  b20v2:[8116,8206,'',['p2tb20',90]],b26v2:[9087,9214,'es2']};
const Q={start:5984,pm:6016,b02:6083,plan:6093,cant:6130,team:6183,member:6239,
  lit:[6311,6480,6663,6827,7054],sock:[6410,6593,6754,6906,7109],dock:[6434,6602,6781,6914,7114],
  keep:6369,news:6484,social:6542,anim:6666,music:6857,sfx:6878,claim:6983,claimOut:7052,stitch:7080,check:7110,
  out1:7186,back:7482,                                   // pass 2: hand-over to full-screen A-roll at B12's end; back on "So every video"
  cc:7491,built:7505,re:[7523],slow:1e9,awhile:1e9,worst:1e9,   // Claude Code codes the tools (lands ~7505-7514), re-codes on "slightly" (lands 7540)
  diff:1e9,clean:7552,glitch:7598,gburst:7644,chop:7659,chopped:7697,
  eg:7716,kit:7764,princ:7786,five:7868,out:7890,grow:17,
  b20:8116,b20p:8130,b20s:8160};
const EXP=[[[6311,6480],[7552,7598],[7659,7716]],[[6480,6663]],[[6663,6827],[7598,7659]],[[6827,7054],[8174,1e9]],[[7054,7300]]];   // pass 2: the finisher stays open while the board leaves (B12 -> A-roll)
const NAMES=['Cutter','Researcher','Animator','Sound designer','Finisher'];
const TOOLS=['Speech-to-text','Browser','Renderer','Licensed library','Stitch & check'];
const P={cut:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
 search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
 layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
 music:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 done:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
 plan:'<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
 film:'<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
 stt:'<line x1="2.5" y1="10" x2="2.5" y2="14"/><line x1="6.5" y1="6" x2="6.5" y2="18"/><line x1="10.5" y1="9" x2="10.5" y2="15"/><polyline points="14.5 8.5 14.5 6 22 6 22 8.5"/><line x1="18.25" y1="6" x2="18.25" y2="18"/><line x1="16.25" y1="18" x2="20.25" y2="18"/>',
 globe:'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
 cpu:'<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
 library:'<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
 checks:'<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>',
 book:'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
 tick:'<polyline points="20 6 9 17 4 12"/>',x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
 bang:'<line x1="12" y1="5" x2="12" y2="13"/><line x1="12" y1="18.5" x2="12" y2="18.6"/>',up:'<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
 note:'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
 zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',code:'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'};
const ROLE_IC=['cut','search','layers','music','done'],TOOL_IC=['stt','globe','cpu','library','checks'];
const sv=(p,sw=1.8,col='currentColor')=>`<svg viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const h=(tag,cls,parent,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e};
const NS='http://www.w3.org/2000/svg';
const se=(svg,tag,a)=>{const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e};
const mkSvg=parent=>{const s=document.createElementNS(NS,'svg');s.setAttribute('class','w');s.setAttribute('width',1920);s.setAttribute('height',1080);parent.appendChild(s);return s};
const hex=c=>c[0]==='#'?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)):c.match(/\d+/g).slice(0,3).map(Number);
const mix=(a,b,k)=>{k=C(k);const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*k)).join(',')})`};
const mix3=(a,b,c,k1,k2)=>{const A=hex(a),B=hex(b),D=hex(c);k1=C(k1);k2=C(k2);return `rgb(${A.map((v,i)=>{const m=v+(B[i]-v)*k1;return Math.round(m+(D[i]-m)*k2)}).join(',')})`};
const rgba=(c,a)=>{const A=hex(c);return `rgba(${A[0]},${A[1]},${A[2]},${a})`};
const put=(el,x,y,w,hh)=>{const s=el.style;s.left=x.toFixed(2)+'px';s.top=y.toFixed(2)+'px';if(w!=null)s.width=w.toFixed(2)+'px';if(hh!=null)s.height=hh.toFixed(2)+'px'};
const sp=(T,f,a,b,w=7.5)=>EG.spring(T,F(f),a,b,w);
const qt=(T,f,d=.28)=>E.quart(C((T-F(f))/d));
const xp=(T,f,d=.5)=>E.expo(C((T-F(f))/d));
const pop=(T,f,d=.3,amp=.18)=>{const x=T-F(f);return x<=0?0:E.expo(C(x/d))*(1+amp*Math.exp(-7*x)*Math.sin(17*x))};
const bounce=(T,f,a=.16)=>{const x=T-F(f);return x<=0?1:1+a*Math.exp(-7*x)*Math.sin(17*x)};
const bump=(T,f,amt=.12,d=.27)=>{const x=(T-F(f))/d;return x<=0||x>=1?1:1+amt*Math.sin(Math.PI*x)};
const ripple=(el,T,f,r,col)=>{const x=(T-F(f))/.6;if(x<=0||x>=1){el.style.opacity=0;return}const g=4+26*E.expo(x);el.style.inset=(-g).toFixed(2)+'px';el.style.borderRadius=(r+g).toFixed(2)+'px';
  if(col)el.style.borderColor=col;el.style.opacity=(.55*Math.pow(1-x,1.6)).toFixed(3)};
const hash=(i,s=1)=>{const x=Math.sin(i*127.1+s*311.7)*43758.5453;return x-Math.floor(x)};
const gs=x=>1-(1+7.5*x)*Math.exp(-7.5*x);
const BDG=(p,bg,size,parent,sw=3.2)=>{const b=h('div','tm-bdg',parent,sv(p,sw,'#fff'));b.style.background=bg;b.style.width=b.style.height=size+'px';return b};
// his picture: v = 0 full frame, 1 the card (the face column CX stays centred in the card)
function cam(box,img,v){const sc=CARD.h/1080,s=L(1,sc,v),bx=L(0,CARD.x,v),by=L(0,CARD.y,v),bw=L(1920,CARD.w,v),bh=L(1080,CARD.h,v);
  Object.assign(box.style,{left:bx+'px',top:by+'px',width:bw+'px',height:bh+'px',borderRadius:L(0,CARD.r,v)+'px',
   boxShadow:`0 34px 80px rgba(16,48,94,${(.28*v).toFixed(3)}),0 3px 10px rgba(16,48,94,${(.10*v).toFixed(3)})`});
  const ix=L(0,CARD.x+CARD.w/2-CX*sc,v),iy=L(0,CARD.y,v);
  Object.assign(img.style,{left:(ix-bx)+'px',top:(iy-by)+'px',width:(1920*s)+'px',height:(1080*s)+'px'})}

let D={},PG,T0;
function tile(parent,inner){const w=h('div','tm-tile',parent);w.d=h('div','d',w);w.s=h('div','s',w);w.ring=h('div','ring',w);w.clip=h('div','clip',w);w.rip=h('div','rip',w);if(inner)w.ic=h('div','ic',w,inner);return w}
function setTile(w,cx,cy,sw,sh,rad,solid,ring,rc){put(w,cx-sw/2,cy-sh/2,sw,sh);w.style.borderRadius=rad.toFixed(2)+'px';w.d.style.opacity=(1-solid).toFixed(3);w.s.style.opacity=solid.toFixed(3);
  const c=rc||BLUE;w.ring.style.opacity=ring.toFixed(3);w.ring.style.boxShadow=`0 0 0 4px ${c},0 0 0 14px ${rgba(c,.13)},0 30px 70px ${rgba(c,.22)}`}
function setIc(w,size,col,op=1){const s=w.ic.style;s.width=size+'px';s.height=size+'px';s.marginLeft=(-size/2)+'px';s.marginTop=(-size/2)+'px';s.color=col;s.opacity=op}

// ---------------------------------------------------------------- the seat pictures (300 x 170)
function mkCutter(ill){const takes=[{x:22,n:9,w:[30,40]},{x:108,n:9,w:[22,48]},{x:194,n:10,w:[26,18,17,17]}],o={takes:[]};let bi=0;
  takes.forEach((t,ti)=>{const g=h('div','',ill);Object.assign(g.style,{left:0,top:0,width:'300px',height:'170px',transformOrigin:(t.x+40)+'px 85px'});
    const bars=[];for(let j=0;j<t.n;j++){const hh=22+56*hash(bi++,3);const b=h('div','bar',g);Object.assign(b.style,{left:(t.x+j*8.4)+'px',top:(68-hh/2)+'px',width:'5px',height:hh+'px'});bars.push(b)}
    let wx=t.x;const words=t.w.map((w,k)=>{const d=h('div','wd',g);Object.assign(d.style,{left:wx+'px',top:'120px',width:w+'px',height:'24px'});
      if(ti===2&&k===2){d.style.borderRadius='7px 0 0 7px';wx+=w}else{if(ti===2&&k===3)d.style.borderRadius='0 7px 7px 0';wx+=w+6}return d});
    o.takes.push({g,bars,words})});
  o.scan=h('div','',ill);Object.assign(o.scan.style,{top:'24px',width:'3px',height:'124px',borderRadius:'2px',background:BLUE,boxShadow:'0 0 14px 4px rgba(0,117,253,.45)'});
  o.cutl=h('div','',ill);Object.assign(o.cutl.style,{width:'4px',borderRadius:'2px',background:RED,transformOrigin:'50% 0',boxShadow:'0 0 10px 2px rgba(229,72,77,.4)'});
  o.no=[0,1].map(()=>{const b=BDG(P.x,'#A9B0BD',22,ill,3.6);b.style.borderColor='#fff';b.style.borderWidth='3px';return b});
  o.ck=BDG(P.tick,GREEN,28,ill);o.ck.style.borderColor='#fff';o.xk=BDG(P.x,RED,28,ill);o.xk.style.borderColor='#fff';return o}
function drawCutter(o,T,lit){const late=T>F(7400),u=late?99:T-F(lit),uk=late?99:T-F(Q.keep),uc=T-F(Q.chop),chopMode=T>F(7630);
  let bi=0,wi=0;const k1=E.quart(C(uk/.25)),fall=chopMode?E.quart(C((T-F(Q.chopped))/.45)):0,red=chopMode?qt(T,Q.chop+13,.2):0;
  const pp=(x,d=.3,a=.18)=>x<=0?0:E.expo(C(x/d))*(1+a*Math.exp(-7*x)*Math.sin(17*x));
  o.takes.forEach((t,ti)=>{const best=ti===2;
    t.bars.forEach((b,j)=>{const p=E.expo(C((u-.05-bi*.012)/.35)),wob=1-.24*(1-k1)*(.5+.5*Math.sin(u*9+bi*1.7));bi++;
      const cut=best&&j===9;b.style.background=best?mix3('#8DB3EA',BLUE,RED,k1,cut?red:0):mix('#8DB3EA','#D3D9E3',k1);
      b.style.transform=`translateY(${(cut?46*fall:0).toFixed(2)}px) rotate(${(cut?16*fall:0).toFixed(2)}deg) scaleY(${(p*wob).toFixed(4)})`;b.style.opacity=cut?(1-fall).toFixed(3):1});
    t.words.forEach((d,k)=>{const x=u-(.25+wi*.13);wi+=(best&&k===2)?0:1;const sc=pp(x);
      const cut=best&&k===3;d.style.background=best?mix3('#CBD8EC','#9CC8FF','#F3A5A8',k1,cut?red:0):mix('#CBD8EC','#E3E7EE',k1);
      d.style.transform=`translateY(${(cut?40*fall:0).toFixed(2)}px) rotate(${(cut?18*fall:0).toFixed(2)}deg) scale(${sc.toFixed(4)})`;d.style.opacity=cut?(1-fall).toFixed(3):1});
    // the takes he does not keep step back; the kept one steps forward
    const kk=uk<=0?0:EG.spring(uk,0,0,1,10);t.g.style.transform=`scale(${(best?1+.07*kk:1-.08*kk).toFixed(4)})`;t.g.style.opacity=(best?1:1-.35*k1).toFixed(3)});
  const su=C((u-.12)/1.35);o.scan.style.left=L(20,286,E.inout(su)).toFixed(2)+'px';o.scan.style.opacity=(u<.12||su>=1?0:Math.min(1,su/.08,(1-su)/.12)).toFixed(3);
  o.no.forEach((b,i)=>{put(b,[82,168][i],10);b.style.transform=`scale(${(late?1:pp(uk-.1-.1*i)).toFixed(4)})`});
  const px=chopMode?pop(T,Q.chopped+3):0,pk=late?1:pp(uk-.36);
  put(o.ck,262,6);o.ck.style.transform=`scale(${(pk*(1-C(px*1.4))).toFixed(4)})`;put(o.xk,262,6);o.xk.style.transform=`scale(${px.toFixed(4)})`;
  // the chopped week: a red cut lands in the middle of the last word, and the cut-off half drops away
  const cl=chopMode?E.expo(C((uc-.42)/.22)):0;put(o.cutl,267.3,22,null,132);o.cutl.style.transform=`scaleY(${cl.toFixed(4)})`;o.cutl.style.opacity=cl>0?1:0}

function mkResearch(ill){const o={};
  o.news=h('div','mc',ill);Object.assign(o.news.style,{width:'120px',height:'126px',top:'22px'});
  o.news.innerHTML='<div style="left:8px;top:8px;width:104px;height:50px;border-radius:9px;background:linear-gradient(135deg,#CFE2FB,#9FC4F5)"></div>'+
   '<div style="left:10px;top:67px;width:34px;height:9px;border-radius:5px;background:#E5484D"></div><div class="gb" style="left:10px;top:84px;width:98px;height:9px;background:#3A3F4A"></div><div class="gb" style="left:10px;top:100px;width:70px;height:9px;background:#3A3F4A"></div>'+
   '<svg viewBox="0 0 24 24" style="left:46px;top:19px;width:28px;height:28px" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
  o.post=h('div','mc',ill);Object.assign(o.post.style,{width:'120px',height:'126px',top:'22px'});
  o.post.innerHTML='<div style="left:10px;top:10px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 28%,#7DB8FF,#0075FD)"></div><div class="gb" style="left:48px;top:13px;width:52px;height:9px;background:#3A3F4A"></div><div class="gb" style="left:48px;top:28px;width:34px;height:8px"></div>'+
   '<div class="gb" style="left:10px;top:52px;width:100px;height:9px"></div><div class="gb" style="left:10px;top:68px;width:76px;height:9px"></div>'+
   '<svg viewBox="0 0 24 24" style="left:10px;top:92px;width:22px;height:22px" fill="#F0556A" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg><div class="gb" style="left:38px;top:99px;width:22px;height:8px"></div>'+
   '<svg viewBox="0 0 24 24" style="left:74px;top:92px;width:21px;height:21px" fill="none" stroke="#9AA1AE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
  return o}
function drawResearch(o,T){const a=pop(T,Q.news,.34),b=pop(T,Q.social,.34),k=sp(T,Q.social,0,1,9);
  o.news.style.left=L(90,22,k).toFixed(2)+'px';o.news.style.transform=`translateY(${(30*(1-C(a))).toFixed(2)}px) rotate(${(-4*k).toFixed(2)}deg) scale(${(.6+.4*a).toFixed(4)})`;o.news.style.opacity=C(a*2.2).toFixed(3);
  o.post.style.left='158px';o.post.style.transform=`translateY(${(30*(1-C(b))).toFixed(2)}px) rotate(${(4*C(b)).toFixed(2)}deg) scale(${(.6+.4*b).toFixed(4)})`;o.post.style.opacity=C(b*2.2).toFixed(3)}

function mkAnim(ill){const o={bars:[],dia:[]};o.wrap=h('div','',ill);Object.assign(o.wrap.style,{left:0,top:0,width:'300px',height:'170px'});
  const H=[40,62,84,108];H.forEach((hh,i)=>{const b=h('div','',o.wrap);Object.assign(b.style,{left:(40+i*46)+'px',top:(136-hh)+'px',width:'32px',height:hh+'px',borderRadius:'8px 8px 3px 3px',background:'linear-gradient(180deg,#5AA9FF,#0075FD)',transformOrigin:'50% 100%'});o.bars.push(b)});
  o.base=h('div','',o.wrap);Object.assign(o.base.style,{left:'30px',top:'138px',width:'240px',height:'3px',borderRadius:'2px',background:'#D5DBE6'});
  o.svg=document.createElementNS(NS,'svg');o.svg.setAttribute('width',300);o.svg.setAttribute('height',170);Object.assign(o.svg.style,{left:0,top:0,overflow:'visible'});o.wrap.appendChild(o.svg);
  o.line=se(o.svg,'path',{d:'M44 82 L100 66 L148 44 L232 22',fill:'none',stroke:INK,'stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round',pathLength:1,'stroke-dasharray':1});
  o.head=se(o.svg,'path',{d:'M212 16 L234 21 L222 39',fill:'none',stroke:INK,'stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'});
  [0,1,2].forEach(i=>{const d=h('div','',o.wrap);Object.assign(d.style,{left:(232+0)+'px',top:(62+i*26)+'px',width:'15px',height:'15px',borderRadius:'3px',background:i===1?BLUE:'#9CC8FF'});o.dia.push(d)});
  o.tear=[0,1].map(()=>{const d=h('div','',ill);Object.assign(d.style,{left:'0px',width:'300px',background:'#fff'});return d});
  o.bang=BDG(P.bang,RED,32,ill,3.4);o.bang.style.borderColor='#fff';return o}
function drawAnim(o,T){const gm=T>F(7400),u=gm?99:T-F(Q.anim),ug=T-F(Q.glitch),fi=Math.round(T*FPS);
  const strong=gm&&T>=F(Q.gburst)&&T<F(Q.gburst)+.62,mild=gm&&ug>.32&&!strong,slot=Math.floor(fi/2);
  const on=strong?hash(slot,9)<.92:mild?hash(Math.floor(fi/3),9)<.3:false,A=strong?18:6;
  o.bars.forEach((b,i)=>{const x=u-(.1+i*.09),s=x<=0?0:E.expo(C(x/.4))*(1+.16*Math.exp(-7*x)*Math.sin(17*x));
    const dx=on?(hash(slot*7+i,5)-.5)*2*A:0,sy=on?1+(hash(slot*3+i,7)-.5)*(strong?.7:.2):1;
    b.style.transform=`translateX(${dx.toFixed(2)}px) scaleY(${(s*sy).toFixed(4)})`;b.style.boxShadow=on?`${-5-A/4}px 0 0 rgba(255,45,85,.75),${5+A/4}px 0 0 rgba(0,229,255,.75)`:'none'});
  const lp=E.expo(C((u-.5)/.55));o.line.setAttribute('stroke-dashoffset',(1-lp).toFixed(4));o.head.style.opacity=(C((u-.95)/.1)*(on&&strong?0:1)).toFixed(3);
  o.line.style.opacity=on&&hash(slot,11)<.5?.25:1;o.line.setAttribute('stroke',gm&&ug>.3?mix(INK,RED,C((ug-.3)/.3)):INK);o.head.setAttribute('stroke',gm&&ug>.3?mix(INK,RED,C((ug-.3)/.3)):INK);
  o.dia.forEach((d,i)=>{const x=u-(.95+i*.1),s=x<=0?0:E.expo(C(x/.3))*(1+.2*Math.exp(-7*x)*Math.sin(17*x));const dx=on?(hash(slot*5+i,13)-.5)*A*1.6:0;d.style.transform=`translateX(${dx.toFixed(2)}px) rotate(45deg) scale(${s.toFixed(4)})`});
  o.wrap.style.transform=on&&strong?`skewX(${((hash(slot,17)-.5)*14).toFixed(2)}deg)`:'none';
  o.tear.forEach((d,i)=>{const show=on&&(strong||i===0);d.style.opacity=show?1:0;d.style.top=(18+hash(slot*11+i,19)*120).toFixed(1)+'px';d.style.height=(strong?6+hash(slot+i,23)*12:5)+'px'});
  put(o.bang,254,10);o.bang.style.transform=`scale(${(gm?pop(T,Q.gburst+2):0).toFixed(4)})`}

function mkSound(ill){const o={};
  o.voice=h('div','lane',ill);Object.assign(o.voice.style,{left:'24px',width:'252px',height:'24px',background:'#DCE2EC'});
  o.voice.innerHTML=[0,1,2,3].map(i=>`<div style="left:${6+i*62}px;top:5px;width:${[52,54,50,56][i]}px;height:14px;border-radius:5px;background:#C2CAD8"></div>`).join('');
  o.music=h('div','lane',ill);Object.assign(o.music.style,{left:'24px',width:'252px',height:'36px',background:'linear-gradient(180deg,#2B8CFF,#0067E6)',transformOrigin:'0 50%',boxShadow:'0 8px 18px rgba(0,98,224,.28)'});
  let s='<svg viewBox="0 0 24 24" style="left:9px;top:7px;width:22px;height:22px" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+P.note+'</svg>';
  for(let i=0;i<32;i++){const hh=5+19*hash(i,31);s+=`<div style="left:${42+i*6.4}px;top:${18-hh/2}px;width:3px;height:${hh}px;border-radius:2px;background:rgba(255,255,255,.82)"></div>`}o.music.innerHTML=s;
  o.sfx=[[46,44],[128,34],[204,52]].map(([x,w])=>{const d=h('div','lane',ill);Object.assign(d.style,{left:x+'px',width:w+'px',height:'26px',background:'#FFB224',boxShadow:'0 6px 14px rgba(255,160,20,.32)'});
    d.innerHTML='<svg viewBox="0 0 24 24" style="left:50%;top:4px;margin-left:-9px;width:18px;height:18px" fill="#fff" stroke="none">'+P.zap+'</svg>';return d});return o}
function drawSound(o,T,lit){const b20=T>F(8000),u=b20?99:T-F(lit),m=b20?1:sp(T,Q.music,0,1,9),x=b20?1:sp(T,Q.sfx,0,1,9);
  const yv=L(L(73,45,m),28,x);                              // the lanes re-centre as each one arrives
  const pv=E.expo(C((u-.08)/.4));o.voice.style.top=yv.toFixed(2)+'px';o.voice.style.opacity=C(pv*2).toFixed(3);o.voice.style.transform=`translateY(${(20*(1-pv)).toFixed(2)}px)`;
  const pm=b20?1:xp(T,Q.music,.5);o.music.style.top=L(81,64,x).toFixed(2)+'px';o.music.style.transform=`scaleX(${pm.toFixed(4)})`;o.music.style.opacity=pm>0?1:0;
  o.sfx.forEach((d,i)=>{const s=b20?1:pop(T,Q.sfx+3*i,.3,.25);d.style.top='114px';d.style.transform=`scale(${s.toFixed(4)})`})}

function mkFinish(ill){const o={clips:[]};const W=[56,70,50,64],COL=['#8DB3EA',BLUE,'#FFB224','#10305E'];let x=0;
  W.forEach((w,i)=>{const d=h('div','',ill);Object.assign(d.style,{top:'36px',width:w+'px',height:'62px',background:COL[i]});d.x1=30+x;x+=w;o.clips.push(d)});
  o.scan=h('div','',ill);Object.assign(o.scan.style,{top:'26px',width:'4px',height:'82px',borderRadius:'2px',background:'#fff',boxShadow:'0 0 14px 5px rgba(0,117,253,.6)'});
  o.ck=[0,1].map(()=>{const b=BDG(P.tick,GREEN,30,ill);b.style.borderColor='#fff';return b});return o}
function drawFinish(o,T,lit){const u=T-F(lit),k=sp(T,Q.stitch,0,1,10);
  o.clips.forEach((d,i)=>{const x0=14+[0,68,150,212][i],y0=[-9,8,-6,10][i],r0=[-4,3,-3,4][i],p=E.expo(C((u-.06-i*.07)/.4));
    d.style.left=L(x0,d.x1,k).toFixed(2)+'px';d.style.transform=`translateY(${(y0*(1-k)+26*(1-p)).toFixed(2)}px) rotate(${(r0*(1-k)).toFixed(2)}deg)`;d.style.opacity=C(p*2).toFixed(3);
    const rl=i===0?10:L(10,0,k),rr=i===3?10:L(10,0,k);d.style.borderRadius=`${rl}px ${rr}px ${rr}px ${rl}px`});
  const su=C((T-F(Q.check))/.5);o.scan.style.left=L(26,272,E.inout(su)).toFixed(2)+'px';o.scan.style.opacity=(su<=0||su>=1?0:Math.min(1,su/.1,(1-su)/.15)).toFixed(3);
  o.ck.forEach((b,i)=>{put(b,119+i*26,112);b.style.transform=`scale(${pop(T,Q.check+13+4*i).toFixed(4)})`})}

// ---------------------------------------------------------------- build
function build(stage){
  h('div','fsbg',stage);D.wash=h('div','tm-wash',stage);const root=h('div','tm',stage);D.root=root;
  D.gWire=h('div','tm-g',root);D.svg=mkSvg(D.gWire);
  D.gTop=h('div','tm-g',root);D.svgT=mkSvg(D.gTop);
  D.gSeat=[0,1,2,3,4].map(()=>h('div','tm-g',root));D.gTool=h('div','tm-g',root);D.gFx=h('div','tm-g',root);
  D.G=[D.gTop,D.gWire,...D.gSeat,D.gTool];
  // top row
  D.cL=[0,1].map(()=>({base:se(D.svgT,'line',{stroke:LINE,'stroke-width':4,'stroke-linecap':'round','stroke-dasharray':'2 12'}),lit:se(D.svgT,'line',{stroke:BLUE,'stroke-width':4,'stroke-linecap':'round'})}));
  D.orb=[0,1].map(i=>se(D.svgT,'circle',{fill:'none',stroke:i?'rgba(0,117,253,.26)':'rgba(0,117,253,.40)','stroke-width':i?2.5:3,'stroke-linecap':'round','stroke-dasharray':i?'2 20':'3 15'}));
  D.plan=tile(D.gTop,sv(P.plan));D.planCk=BDG(P.tick,GREEN,30,D.plan);
  D.edit=tile(D.gTop,sv(P.film));D.ghost=[0,1].map(()=>{const g=h('div','',D.edit);Object.assign(g.style,{position:'absolute',inset:'0',borderRadius:'inherit',border:'3px solid #9DB7DA',boxSizing:'border-box',background:'rgba(255,255,255,.55)',zIndex:-1});return g});
  D.editX=BDG(P.x,RED,30,D.edit);D.editCk=BDG(P.tick,GREEN,30,D.edit);
  D.planLab=h('div','tm-lab',D.gTop,'Plan');D.editLab=h('div','tm-lab',D.gTop,'Edit');
  D.cl=tile(D.gTop);D.clImg=h('img','logo',D.cl);D.clImg.src='../_lib/claude.png';
  D.pm=h('div','tm-pill',D.gTop,'Project manager');D.pm2=h('div','tm-pill',D.gTop,'Project manager');
  D.cc=h('div','tm-pill cc',D.gTop,'<img src="../_lib/team-mascot.png"><span>Claude Code</span>');
  D.clock=h('div','tm-clock',D.gTop,'<i></i><i></i><b></b>');
  // wires
  D.wire=[0,1,2,3,4].map(()=>({g:se(D.svg,'path',{fill:'none',stroke:LINE,'stroke-width':4,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':1})}));
  D.wire.forEach(w=>{w.b=se(D.svg,'path',{fill:'none',stroke:BLUE,'stroke-width':4,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':1})});
  D.wire.forEach(w=>{w.f=se(D.svg,'path',{fill:'none',stroke:'#fff','stroke-width':2.4,'stroke-linecap':'round','stroke-dasharray':'3 15'});
    w.port=se(D.svg,'circle',{r:5.5,fill:'#fff','stroke-width':3.5});w.glow=se(D.svg,'circle',{r:15,fill:'rgba(0,117,253,.26)'});w.head=se(D.svg,'circle',{r:6.5,fill:BLUE,stroke:'#fff','stroke-width':2})});
  // seats
  const MK=[mkCutter,mkResearch,mkAnim,mkSound,mkFinish];
  D.seat=[0,1,2,3,4].map(i=>{const g=D.gSeat[i],inner=h('div','tm-g',g),t=tile(inner,sv(P[ROLE_IC[i]]));
    const ill=h('div','tm-ill',t.clip),o=MK[i](ill),name=h('div','tm-lab',inner,NAMES[i]),num=h('div','tm-num',t,String(i+1));name.style.fontSize='28px';return {inner,t,ill,o,name,num}});
  // the Everygen tray, the tools, the toolkit row
  D.tray=h('div','tm-tray',D.gTool);
  D.tool=[0,1,2,3,4].map(i=>{const w=h('div','tm-tool',D.gTool);w.need=h('div','o need',w);w.built=h('div','o built',w);w.red=h('div','o red',w);w.grn=h('div','o grn',w);w.eg=h('div','o eg',w);
    w.pr=document.createElementNS(NS,'svg');w.pr.setAttribute('class','pr');w.pr.setAttribute('width',72);w.pr.setAttribute('height',72);w.appendChild(w.pr);
    w.prr=se(w.pr,'rect',{x:1.5,y:1.5,width:69,height:69,rx:20.5,fill:'none',stroke:BLUE,'stroke-width':6,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':1});
    w.row=h('div','row',w);w.ti=h('div','ti',w.row,sv(P[TOOL_IC[i]],1.9));w.ti.style.width=w.ti.style.height='72px';w.tx=h('div','tx',w.row,TOOLS[i]);
    w.cr=document.createElementNS(NS,'svg');w.cr.setAttribute('class','crack');w.cr.setAttribute('width',72);w.cr.setAttribute('height',72);w.appendChild(w.cr);
    const zz=[[46,0,40,14,50,24,38,40,46,52],[22,0,30,16,20,30,30,46],[50,0,42,12,54,26,40,38,50,54,42,72],[0,0,0,0],[18,0,28,18,16,32,28,50]][i];
    w.crp=se(w.cr,'polyline',{points:zz.join(' '),fill:'none',stroke:'#2B2F38','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round',pathLength:1,'stroke-dasharray':1});
    w.bang=BDG(P.bang,RED,26,w,3.4);w.ok=BDG(P.tick,GREEN,26,w);w.code=BDG(P.code,INK,26,w,3);return w});
  D.row=h('div','tm-row',D.gTool);D.kit=h('div','tm-kit',D.row,'<img src="../_lib/everygen-lockup.png"><span class="serif">toolkit</span>');
  D.plus=h('div','tm-plus',D.row,'+');D.prin=h('div','tm-prin',D.row,`<div class="ring"></div><div class="pi">${sv(P.book,2.2,'#fff')}</div><span>Editing principles</span><span class="yr">5 years</span>`);
  D.prinRing=D.prin.querySelector('.ring');D.yr=D.prin.querySelector('.yr');D.prinRip=h('div','',D.gTool);Object.assign(D.prinRip.style,{position:'absolute',border:'3px solid '+BLUE,boxSizing:'border-box',opacity:0});
  D.svgP=mkSvg(D.gFx);
  D.pglow=se(D.svgP,'circle',{r:18,fill:'rgba(0,117,253,.30)'});D.phead=se(D.svgP,'circle',{r:7.5,fill:BLUE,stroke:'#fff','stroke-width':2.5});
  D.beam=h('div','tm-beam',D.gFx);D.claim=h('div','tm-claim',D.gFx,'<div class="cc">©</div><span>Copyright claim</span>');
  D.cam=h('div','tm-cam',stage);D.camImg=h('img','',D.cam);
  if(PG[3])EG.seq('cam',FRD+PG[3][0],PG[3][1]);
}

// ---------------------------------------------------------------- one frame of the board
async function draw(t){const T=T0+t,k=Math.round(T*FPS),B=T>F(8000);       // B = the board's second life (B20)
  const A1=T<F(Q.back-60);                                                    // pass 2: life A1 = b10-v2 (before B13-B15 on A-roll)
  // camera card <-> full frame (grow: hand to full-screen A-roll; shrink: back from it)
  const grow=f=>{const x=Math.min(Math.max(0,T-F(f)),Q.grow/FPS);return 1-gs(x)/gs(Q.grow/FPS)};
  let v=1;if(A1)v=grow(Q.out1);else if(!B){v=T<F(Q.out)?gs(Math.max(0,T-F(Q.back))):grow(Q.out)}else v=gs(Math.max(0,T-F(Q.b20)));
  cam(D.cam,D.camImg,v);await EG.frame(D.camImg,'cam',(k-PG[0])/FPS);
  D.G.forEach((g,j)=>{if(B)EG.mat(g,T,F(Q.b20)+.03+.03*j);else if(A1)EG.mat(g,T,-99,{exit:F(Q.out1)+.015*(D.G.length-1-j),exitDur:.34});
    else EG.mat(g,T,F(Q.back)+.03+.03*j,{exit:F(Q.out)+.015*(D.G.length-1-j),exitDur:.34})});
  D.wash.style.opacity=(B?1:E.quart(C((T-F(Q.eg))/.9))).toFixed(3);

  // ---- layout
  const r=sp(T,Q.team,0,1);
  const e=EXP.map(iv=>C(iv.reduce((s,[a,b])=>s+sp(T,a,0,1,9)-sp(T,b,0,1,9),0)));
  const Es=e.reduce((a,b)=>a+b,0),cw=(AW-COLX*Es)/(5-Es),X=[];{let x=AX;e.forEach(ei=>{const w=ei*COLX+(1-ei)*cw;X.push(x+w/2);x+=w})}
  // centred at every moment: the board sits lower while it is short, and rises as the tools, then the toolkit row, arrive
  // pass 2: the toolkit cards are bigger and lower, so the board rises UP above its pass-1 place when they arrive
  // (the tray alone barely changes the centre; the cards lift the board as they arrive on "into Everygen")
  D.root.style.transform=`translateY(${(B?-UP:r*(95-50*sp(T,Q.sock[0],0,1))-8*sp(T,Q.eg+8,0,1)-(37+UP)*sp(T,Q.kit-2,0,1)).toFixed(2)}px)`;
  const egT=i=>F(Q.eg)+.1+.62*((X[i]-AX)/AW);                                    // when the beam crosses tool i
  const G=i=>B?1:E.quart(C((T-egT(i))/.3)),Gall=B?1:E.quart(C((T-F(Q.eg)-.3)/.6));

  // ---- top row: Plan - Claude - Edit
  const cy=L(495,283,r),cs=L(300,150,r),dx=L(420,270,r),ss=L(190,110,r);
  const pmk=qt(T,Q.pm),clB=bump(T,Q.pm,.06)*bump(T,Q.cc,.08)*Q.re.reduce((a,f)=>a*bump(T,f,.07),1)*bump(T,Q.eg+10,.06);
  setTile(D.cl,ACX,cy,cs,cs,cs*.26,1,Math.min(pmk,1-E.inout(C((T-F(Q.pm)-.75)/.5))));D.cl.style.transform=`scale(${clB.toFixed(4)})`;
  D.clImg.style.width=(cs*.6).toFixed(2)+'px';
  if(!B)EG.mat(D.cl,T,F(Q.start)-.13,{base:`scale(${clB.toFixed(4)})`});
  [Q.pm,Q.cc,...Q.re].forEach((f,i)=>{if(T>=F(f)&&T<F(f)+.6)ripple(D.cl.rip,T,f,cs*.26)});if(![Q.pm,Q.cc,...Q.re].some(f=>T>=F(f)&&T<F(f)+.6))D.cl.rip.style.opacity=0;
  D.orb.forEach((c,i)=>{const oo=B?0:(1-C(r*2.2))*E.quart(C((T-F(Q.start)+.1)/.7));c.setAttribute('cx',ACX);c.setAttribute('cy',cy.toFixed(2));c.setAttribute('r',(cs*(i?1.03:.76)*(.9+.1*E.expo(C((T-F(Q.start)+.1)/.8)))).toFixed(2));
    c.setAttribute('stroke-dashoffset',((i?-1:1)*T*16).toFixed(2));c.style.opacity=oo.toFixed(3)});
  // the label under Claude: Project manager -> Claude Code (B13-B16) -> Project manager
  const ph=L(64,44,r),pf=L(34,24,r),py=cy+cs/2+L(26,14,r);
  const pill=(el,w)=>{el.style.height=ph.toFixed(2)+'px';el.style.fontSize=pf.toFixed(2)+'px';el.style.padding=`0 ${(pf*.85).toFixed(1)}px`;put(el,ACX-w/2,py)};
  const clk=sp(T,Q.slow,0,1,9)-sp(T,Q.worst,0,1,9),clkW=ph,ccW=D.cc.offsetWidth,ccX=ACX-(ccW+clk*(clkW+12))/2;
  pill(D.pm,D.pm.offsetWidth);pill(D.pm2,D.pm2.offsetWidth);pill(D.cc,ccW);D.cc.style.left=ccX.toFixed(2)+'px';
  EG.mat(D.pm,T,B?1e9:F(Q.pm),{dy:34,exit:F(Q.cc),exitDy:-26,exitDur:.24});
  EG.mat(D.cc,T,B?1e9:F(Q.cc)+.05,{dy:30,exit:F(Q.eg)+.05,exitDy:-26,exitDur:.24});
  EG.mat(D.pm2,T,B?-99:F(Q.eg)+.22,{dy:30});
  put(D.clock,ccX+ccW+12,py,clkW,clkW);EG.mat(D.clock,T,B?1e9:F(Q.slow),{dy:26,s0:.6,exit:F(Q.worst),exitDur:.24});
  {const a=(T-F(Q.slow))*150+Math.pow(Math.max(0,T-F(Q.awhile)),2)*2600,[hh,mm]=D.clock.children;
   hh.style.height=(clkW*.24)+'px';mm.style.height=(clkW*.36)+'px';hh.style.transform=`rotate(${(a/12+40).toFixed(2)}deg)`;mm.style.transform=`rotate(${a.toFixed(2)}deg)`}
  // Plan
  const pk=qt(T,Q.plan),px=ACX-dx,exx=ACX+dx;
  setTile(D.plan,px,cy,ss,ss,ss*.27,pk,0);setIc(D.plan,ss*.46,mix(GREY,BLUE,pk));D.plan.style.transform=`scale(${bump(T,Q.plan).toFixed(4)})`;
  if(!B)EG.mat(D.plan,T,F(Q.b02),{dy:40,base:`scale(${bump(T,Q.plan).toFixed(4)})`});ripple(D.plan.rip,T,Q.plan+1,ss*.27);
  put(D.planCk,ss-22,-12);D.planCk.style.transform=`scale(${(B?1:pop(T,Q.plan+4)).toFixed(4)})`;
  // Edit: crossed (B02) -> plain once tools exist -> three slightly different copies (B16) -> ticked (Everygen)
  const builtK=B?1:qt(T,Q.built),shake=T>F(Q.cant+7)&&T<F(Q.cant+40)?9*Math.exp(-6*(T-F(Q.cant+7)))*Math.sin(34*(T-F(Q.cant+7))):0,
    shake2=T>F(Q.glitch+4)&&T<F(Q.glitch+40)?7*Math.exp(-6*(T-F(Q.glitch+4)))*Math.sin(34*(T-F(Q.glitch+4))):0;
  const fan=0,egE=B?1:qt(T,Q.eg+22);                                           // pass 2: no three Edit copies (one focus)
  setTile(D.edit,exx,cy,ss,ss,ss*.27,Math.max(builtK,egE),0);setIc(D.edit,ss*.46,mix3(GREY,'#5B6472',BLUE,builtK,egE));
  const eb=`translateX(${(shake+shake2).toFixed(2)}px) scale(${(bump(T,Q.clean,.08)*bump(T,Q.eg+22,.1)).toFixed(4)})`;D.edit.style.transform=eb;
  if(!B)EG.mat(D.edit,T,F(Q.b02)+.1,{dy:40,base:eb});ripple(D.edit.rip,T,Q.eg+22,ss*.27);
  D.ghost.forEach((g,i)=>{const s=i?1:-1;g.style.opacity=fan.toFixed(3);g.style.transform=`translate(${(s*15*fan).toFixed(2)}px,${(5*fan).toFixed(2)}px) rotate(${(s*9*fan+(fan>0?1.4*Math.sin(T*5+i*2):0)).toFixed(2)}deg)`});
  const xA=B?0:pop(T,Q.cant+8)*(1-qt(T,Q.built,.2)),xB=B?0:pop(T,Q.glitch+5)*(1-qt(T,Q.eg+20,.15)),ckA=B?0:pop(T,Q.clean+2)*(1-qt(T,Q.glitch+3,.12)),ckB=B?1:pop(T,Q.eg+24);
  put(D.editX,ss-22,-12);D.editX.style.transform=`scale(${Math.max(xA,xB).toFixed(4)})`;put(D.editCk,ss-22,-12);D.editCk.style.transform=`scale(${Math.max(ckA,ckB).toFixed(4)})`;
  // labels under the side tiles
  const ly=cy+ss/2+L(38,25,r),lf=L(34,26,r);
  [[D.planLab,px,mix(MUT,INK,pk),F(Q.b02)+.06],[D.editLab,exx,mix(MUT,INK,egE),F(Q.b02)+.16]].forEach(([el,x,col,s])=>{put(el,x,ly);el.style.fontSize=lf.toFixed(2)+'px';el.style.color=col;
    if(!B)EG.mat(el,T,s,{dy:30,base:'translate(-50%,-50%)'});else el.style.transform='translate(-50%,-50%)'});
  // connectors Plan - Claude - Edit (the one to Edit tries and fails in B02, connects with Everygen)
  const gap=L(20,12,r),x1a=px+ss/2+gap,x1b=ACX-cs/2-gap,x2a=ACX+cs/2+gap,x2b=exx-ss/2-gap,cin=B?1:xp(T,Q.b02+2,.4);
  const tryK=B?0:Math.min(xp(T,Q.cant,.3)*.62,1-E.inout(C((T-F(Q.cant)-.34)/.3)));
  [[x1a,x1b,pk,1],[x2a,x2b,Math.max(tryK,egE),-1]].forEach(([a,b,lit,dir],i)=>{const c=D.cL[i];
    const A=dir>0?b:a,Bx=dir>0?a:b;[['x1',A],['x2',L(A,Bx,cin)],['y1',cy],['y2',cy]].forEach(([k2,val])=>c.base.setAttribute(k2,val.toFixed(2)));
    [['x1',A],['x2',L(A,Bx,lit)],['y1',cy],['y2',cy]].forEach(([k2,val])=>c.lit.setAttribute(k2,val.toFixed(2)));c.lit.style.opacity=lit>0.01?1:0;c.base.style.opacity=cin>0?1:0});

  // ---- wires Claude -> seats
  const y0=py+ph+2,pg=B?1:xp(T,Q.member,.62);
  const ccFlow=B?0:sp(T,Q.cc+4,0,1)-sp(T,Q.built,0,1);
  D.wire.forEach((w,i)=>{const sh=L(SH[0],SH[1],e[i]),x=X[i],y1=SY-sh/2-4,dxx=x-ACX,R=Math.min(22,Math.abs(dxx)/2),s=Math.sign(dxx);
    const d=Math.abs(dxx)<1?`M${ACX} ${y0} L${ACX} ${y1}`:`M${ACX} ${y0} L${ACX} ${BUS-R} Q${ACX} ${BUS} ${ACX+s*R} ${BUS} L${x-s*R} ${BUS} Q${x} ${BUS} ${x} ${BUS+R} L${x} ${y1}`;
    [w.g,w.b,w.f].forEach(p=>p.setAttribute('d',d));w.g.setAttribute('stroke-dashoffset',(1-pg).toFixed(4));w.g.style.opacity=pg>0?1:0;
    const pb=B?1:xp(T,Q.lit[i]-1,.5);w.b.setAttribute('stroke-dashoffset',(1-pb).toFixed(4));w.b.style.opacity=pb>0?1:0;
    w.port.setAttribute('cx',x.toFixed(2));w.port.setAttribute('cy',(y1-1).toFixed(2));w.port.setAttribute('stroke',mix(LINE,BLUE,pb));w.port.style.opacity=(B?1:C((pg-.85)/.15)).toFixed(3);
    const fl=Math.max(e[i],i===3?0:ccFlow,Gall*.75)*(pb>=1||B?1:0);w.f.style.opacity=(.8*fl).toFixed(3);w.f.setAttribute('stroke-dashoffset',(-T*84).toFixed(2));
    // glowing head: on the grey draw (B03) and on each blue draw
    let hp=-1;const xg=(T-F(Q.member))/.62,xb=(T-F(Q.lit[i]-1))/.5;if(!B&&xg>0&&xg<1)hp=pg;if(!B&&xb>0&&xb<1)hp=pb;
    if(hp<0){w.head.style.opacity=0;w.glow.style.opacity=0}else{const len=w.g.getTotalLength(),pt=w.g.getPointAtLength(len*hp),xx=xb>0&&xb<1?xb:xg,o=Math.min(1,xx/.06)*(1-C((xx-.6)/.4));
      [w.head,w.glow].forEach(c=>{c.setAttribute('cx',pt.x.toFixed(2));c.setAttribute('cy',pt.y.toFixed(2));c.style.opacity=o.toFixed(3)})}});

  // ---- seats
  const dim=B?sp(T,Q.b20s,0,1):0,weekG=B?0:sp(T,Q.clean,0,1,10)-sp(T,Q.glitch,0,1,10),weekR=[B?0:sp(T,Q.chop+6,0,1,10),0,B?0:sp(T,Q.glitch+6,0,1,10)-sp(T,Q.chop,0,1,10),B?0:(qt(T,Q.claim,.16)-qt(T,Q.claimOut,.3)),0];
  D.seat.forEach((s,i)=>{const ei=e[i],lit=B?1:qt(T,Q.lit[i]),sw=L(SW[0],SW[1],ei),sh=L(SH[0],SH[1],ei),x=X[i];
    const rc=i===0?mix3(BLUE,GREEN,RED,weekG,weekR[0]):mix(BLUE,RED,weekR[i]);
    setTile(s.t,x,SY,sw,sh,L(36,30,ei),lit,ei,rc);const b=bump(T,Q.lit[i])*(B&&i===3?bump(T,Q.b20s):1);s.t.style.transform=`scale(${b.toFixed(4)})`;
    setIc(s.t,L(70,44,ei),mix(GREY,BLUE,lit),C(1-ei*2));if(B&&i!==3)s.t.rip.style.opacity=0;else ripple(s.t.rip,T,B?Q.b20s+1:Q.lit[i]+1,L(36,30,ei),rc);
    s.ill.style.opacity=C((ei-.45)/.5).toFixed(3);s.ill.style.visibility=ei>.3?'visible':'hidden';
    if(ei>.3){if(i===0)drawCutter(s.o,T,Q.lit[0]);if(i===1)drawResearch(s.o,T);if(i===2)drawAnim(s.o,T);if(i===3)drawSound(s.o,T,Q.lit[3]);if(i===4)drawFinish(s.o,T,Q.lit[4])}
    s.num.style.background=mix('#BFC6D2',BLUE,lit);put(s.name,x,NY);s.name.style.color=mix(MUT,INK,lit);s.name.style.fontWeight=lit>.5?600:500;
    if(B){s.name.style.transform='translate(-50%,-50%)';s.inner.style.transform='none';s.inner.style.opacity=1;s.inner.style.filter='none';s.inner.style.visibility='visible'}
    else{EG.mat(s.inner,T,F(Q.team)+.1+.1*i);EG.mat(s.name,T,F(Q.member)+.3+.1*i,{dy:26,base:'translate(-50%,-50%)'})}
    const dm=i===3?1:1-.5*dim;s.t.style.opacity=dm.toFixed(3);if(B)s.name.style.opacity=dm.toFixed(3)});

  // ---- tools
  // pass 2: a SHORT beat on "So every video…": Claude Code codes the four tools fast (ring + code badge, 3 frames apart), they
  // land almost straight; on "slightly" they are re-coded from scratch and land visibly different (tilted, the renderer cracked)
  const TILT=[[1.5,-1.5,-1.5,0,1.5],[-5,4,-4,0,5]],CRAT=[9,9,0,9,9];     // tilt after build / after the re-code; the re-code a crack first shows on
  D.tool.forEach((w,i)=>{const ei=e[i],x=X[i],tw=w.tx.offsetWidth,wd=72+ei*tw;put(w,x-wd/2,TY-36,wd,72);w.style.borderRadius='22px';
    const can=i!==3,j=[0,1,2,0,3][i],cs=Q.cc+2+3*j,bd=cs+14;let built=B?1:(can?qt(T,bd,.18):0),cr=0,p=0,tilt=0,crack=0,pops=bounce(T,Q.dock[i],.22),coding=0;
    if(!B&&can){p=T<F(cs)||T>=F(bd)?0:E.quart(C((T-F(cs))/(13/FPS)));
      tilt=sp(T,bd,0,TILT[0][i],14);pops*=bounce(T,bd,.2);coding=pop(T,cs)*(1-qt(T,bd-2,.12));
      Q.re.forEach((f,c)=>{const a=f+j,x0=(T-F(a))*FPS;                       // frames into this re-code: crumble 0-6, re-code 6-17, land 17
        if(x0>0){const fallK=E.quart(C(x0/5)),back=E.quart(C((x0-13)/5));if(x0<18)cr=fallK*(1-back);if(x0>=6&&x0<17)p=C((x0-6)/11);if(x0<20)coding=Math.max(coding,E.quart(C((x0-4)/4))*(1-E.quart(C((x0-15)/4))));
          tilt=EG.spring(T,F(a+17),tilt,TILT[c+1][i],14);pops*=bounce(T,a+17,.2);if(c>=CRAT[i])crack=Math.max(crack,xp(T,a+17,.25))}})}
    const g=G(i),red=B||i===3?0:(weekR[i]||0),grn=i===0?weekG:0,soft=B?0:(crack>0?.42*crack*(1-grn):0);
    const sway=!B&&T>F(Q.re[Q.re.length-1]+18)&&can?1.3*Math.sin(T*4.2+i*1.9)*(1-g):0;tilt*=(1-g)*(1-grn);
    w.need.style.opacity=1;w.built.style.opacity=(built*(1-cr)).toFixed(3);w.red.style.opacity=(Math.max(red,soft)*(1-cr)).toFixed(3);w.grn.style.opacity=grn.toFixed(3);w.eg.style.opacity=g.toFixed(3);
    const icol=g>0?mix(mix3('#2F7FE6',INK,'#D5373D',built,Math.max(red,soft)),'#FFFFFF',g):grn>0?mix(INK,'#1B8050',grn):mix3('#2F7FE6',INK,'#D5373D',built,Math.max(red,soft*1.4));
    w.ti.style.color=icol;w.tx.style.color=g>.5?'#fff':icol;w.row.style.opacity=(1-.75*cr).toFixed(3);
    w.prr.setAttribute('stroke-dashoffset',(1-p).toFixed(4));w.pr.style.opacity=p>0&&p<1&&ei<.05?1:0;
    w.crp.setAttribute('stroke-dashoffset',(1-crack).toFixed(4));w.cr.style.opacity=(crack>0?(1-g)*(1-grn)*(ei<.5?1:0):0).toFixed(3);w.crp.setAttribute('stroke',mix('#2B2F38',RED,.75));
    put(w.bang,wd-16,-12);w.bang.style.transform=`scale(${(B?0:(i===2?pop(T,Q.gburst+2)*(1-qt(T,egT(i)*FPS,.15)):i===0?pop(T,Q.chopped+3)*(1-qt(T,egT(i)*FPS,.15)):0)).toFixed(4)})`;
    put(w.code,wd-16,-12);w.code.style.transform=`scale(${coding.toFixed(4)})`;
    put(w.ok,wd-16,-12);w.ok.style.transform=`scale(${(i===0&&!B?pop(T,Q.clean+3)*(1-qt(T,Q.glitch,.12)):0).toFixed(4)})`;
    const most=i===3&&!B?1-.5*(qt(T,Q.cc+12,.4)-G(3)):1,dmT=i===3?1:1-.5*dim;
    const jit=!B&&i===2&&T>=F(Q.gburst)&&T<F(Q.gburst)+.62?(hash(Math.round(T*FPS),41)-.5)*10:0;
    const base=`translateX(${jit.toFixed(2)}px) rotate(${(tilt+sway).toFixed(2)}deg) scale(${(pops*bounce(T,egT(i)*FPS,.14)*(1-.14*cr)).toFixed(4)})`;
    // the socket arrives first (dashed, empty), the tool docks into it
    const op=B?1:EG.mat(w,T,F(Q.sock[i]),{dy:40,base});if(B){w.style.transform=base;w.style.visibility='visible';w.style.filter='none'}w.style.opacity=((B?1:op)*most*dmT).toFixed(3);
    const dk=B?1:pop(T,Q.dock[i],.32,.2);w.row.style.transform=`translateY(${(22*(1-C(dk))).toFixed(2)}px) scale(${(.5+.5*dk).toFixed(4)})`;if(!B&&T<F(Q.dock[i]))w.row.style.opacity=0;
    w.need.style.background=mix('#FFFFFF','#F2F8FF',dk)});

  // ---- Everygen: the beam, the tray, the toolkit row
  {const bx=(T-F(Q.eg)-.06)/.72,on=!B&&bx>0&&bx<1;D.beam.style.opacity=on?Math.min(1,bx/.08,(1-bx)/.14).toFixed(3):0;put(D.beam,L(AX-70,AX+AW+70,E.inout(C(bx)))-4,200,null,670)}
  put(D.tray,X[0]-66,TY-52,X[4]-X[0]+132,104);EG.mat(D.tray,T,B?-99:F(Q.eg)+.5,{dy:44});
  // pass 2 (his green box): two big cards of one kind (same height, radius, shadow) GAP under the tray, centred, re-centring
  // as the principles card joins; "5 years" grows inside it on "five years"
  const kp=B?1:sp(T,Q.princ,0,1,8.5),yk=B?1:qt(T,Q.five,.3);D.yr.style.maxWidth=(150*yk).toFixed(1)+'px';D.yr.style.padding=`0 ${(16*yk).toFixed(1)}px`;D.yr.style.marginLeft=(2*yk).toFixed(1)+'px';D.yr.style.opacity=yk.toFixed(3);D.yr.style.overflow='hidden';
  D.yr.style.transform=`scale(${(B?1:bounce(T,Q.five,.12)).toFixed(4)})`;
  const kw=D.kit.offsetWidth,pw=D.prin.offsetWidth,plw=34,GP=16,tot=kw+kp*(GP+plw+GP+pw),rx=ACX-tot/2,ry=TY+52+GAP;
  put(D.row,0,0);Object.assign(D.kit.style,{position:'absolute',left:rx.toFixed(2)+'px',top:ry+'px',height:HC+'px'});
  Object.assign(D.plus.style,{position:'absolute',left:(rx+kw+GP).toFixed(2)+'px',top:(ry+HC/2-30)+'px',width:plw+'px',height:'60px',lineHeight:'58px'});
  Object.assign(D.prin.style,{position:'absolute',left:(rx+kw+GP+plw+GP).toFixed(2)+'px',top:ry+'px',height:HC+'px'});
  EG.mat(D.kit,T,B?-99:F(Q.kit),{dy:34});EG.mat(D.plus,T,B?-99:F(Q.princ)+.04,{dy:26});
  const pb=bump(T,Q.princ+2,.05)*(B?bump(T,Q.b20p,.09):1);EG.mat(D.prin,T,B?-99:F(Q.princ)+.04,{dy:34,base:`scale(${pb.toFixed(4)})`});
  // B20: the principles light, then a pulse runs up to the sound designer
  const prk=B?qt(T,Q.b20p):0;D.prinRing.style.opacity=prk.toFixed(3);
  {const x0=rx+kw+GP+plw+GP,x=(T-F(Q.b20p+1))/.6;if(!B||x<=0||x>=1)D.prinRip.style.opacity=0;else{const gg=4+24*E.expo(x);put(D.prinRip,x0-gg,ry-gg,pw+2*gg,HC+2*gg);D.prinRip.style.borderRadius=(30+gg)+'px';D.prinRip.style.opacity=(.55*Math.pow(1-x,1.6)).toFixed(3)}
   const xs=Math.min(Math.max(X[3],x0+30),x0+pw-30),hx=(T-F(Q.b20s-10))/.34,hy=L(ry-2,SY+SH[1]/2,E.inout(C(hx))),ho=!B||hx<=0||hx>=1?0:Math.min(1,hx/.12,(1-hx)/.15);
   [D.phead,D.pglow].forEach(c=>{c.setAttribute('cx',xs.toFixed(1));c.setAttribute('cy',hy.toFixed(1));c.style.opacity=ho.toFixed(3)})}
  // ---- the copyright claim on the sound designer
  {const x=X[3]+58,y=SY-98,pk2=pop(T,Q.claim,.3,.22);put(D.claim,x-D.claim.offsetWidth/2,y-38);
   EG.mat(D.claim,T,B?1e9:F(Q.claim),{dy:0,s0:1,blur:0,dur:.01,exit:F(Q.claimOut),exitDy:36,exitDur:.26,base:`rotate(-4deg) scale(${pk2.toFixed(4)})`})}
}

// ---------------------------------------------------------------- the overlay strip (B18-B19) over his full-screen camera
const O={in:7893,link:7897,ok:7909,team:7922,give:7936,ready:7972,tick:7998,up:8021,reach:8064,out:8116};
function buildOv(stage){const bg=new URLSearchParams(location.search).get('bg');if(bg){const im=h('img','',stage);im.src=bg;Object.assign(im.style,{position:'absolute',left:0,top:0,width:'1920px',height:'1080px'})}
  D.og=h('div','tm-ovg',stage);const root=h('div','tm',stage);D.or=root;D.osvg=mkSvg(root);
  const ln=()=>({base:se(D.osvg,'line',{stroke:'rgba(255,255,255,.55)','stroke-width':4,'stroke-linecap':'round','stroke-dasharray':'2 12'}),lit:se(D.osvg,'line',{stroke:'#3D97FF','stroke-width':5,'stroke-linecap':'round'}),
    fl:se(D.osvg,'line',{stroke:'#fff','stroke-width':2.6,'stroke-linecap':'round','stroke-dasharray':'3 15'}),glow:se(D.osvg,'circle',{r:17,fill:'rgba(61,151,255,.45)'}),head:se(D.osvg,'circle',{r:7,fill:'#fff',stroke:'#3D97FF','stroke-width':3})});
  D.l1=ln();D.l2=ln();
  D.team=h('div','tm-team',root);
  D.or_=[0,1,2,3,4].map(i=>{const t=h('div','tm-ot',root,sv(P[ROLE_IC[i]],1.9,BLUE));t.firstChild.style.width=t.firstChild.style.height='50px';t.ck=BDG(P.tick,GREEN,24,t,3.6);t.ck.style.borderColor='#fff';t.ck.style.borderWidth='3px';return t});
  D.oeg=h('div','tm-ot eg',root,'<img src="../_lib/everygen-appicon-blue.png"><div class="shine"><i></i></div><div class="rip"></div>');D.oegUp=BDG(P.up,GREEN,30,D.oeg,3.6);D.oegUp.style.borderColor='#fff';D.oegUp.style.borderWidth='3px';
  D.ocl=h('div','tm-ot',root,'<img src="../_lib/claude.png" style="width:62%"><div class="ring"></div><div class="rip"></div>');D.oclUp=BDG(P.up,GREEN,30,D.ocl,3.6);D.oclUp.style.borderColor='#fff';D.oclUp.style.borderWidth='3px';
  D.okb=BDG(P.tick,GREEN,30,root,3.6);D.okb.style.borderColor='#fff';D.okb.style.borderWidth='3px'}
function drawOv(t){const T=T0+t,Y=922,S=124,RS=90,ex=F(O.out),k2=sp(T,O.team,0,1,8.5);
  const M=(el,f,o={})=>EG.mat(el,T,F(f),Object.assign({exit:ex+(o.xd||0),exitDur:.3},o));
  D.og.style.opacity=(E.quart(C((T-F(O.in))/.5))*(1-E.inout(C((T-ex)/.36)))).toFixed(3);
  const TW=5*RS+4*12+28,G1=70,G2=150,left=960-(TW+G1+S+G2+S)/2,egx=L(960-(G2+S)/2,left+TW+G1+S/2,k2),clx=L(960+(G2+S)/2,left+TW+G1+S+G2+S/2,k2),tx=left*1+0;
  // tiles
  const upK=pop(T,O.up+5),egB=bump(T,O.up,.2,.34)*bump(T,O.ok-10,.06),clB=bump(T,O.ok-1,.12)*bump(T,O.reach+13,.14);
  put(D.oeg,egx-S/2,Y-S/2,S,S);M(D.oeg,O.in,{base:`scale(${egB.toFixed(4)})`});
  put(D.ocl,clx-S/2,Y-S/2,S,S);M(D.ocl,O.in+3,{base:`scale(${clB.toFixed(4)})`,xd:.04});
  const sh=(T-F(O.up))/.55,si=D.oeg.querySelector('.shine i');si.style.left=L(-60,130,C(sh))+'%';si.style.opacity=sh>0&&sh<1?1:0;
  const rp=(el,f)=>{const x=(T-F(f))/.6;if(x<=0||x>=1){el.style.opacity=0;return}const g=26*E.expo(x);el.style.inset=(-g)+'px';el.style.opacity=(.7*Math.pow(1-x,1.6)).toFixed(3)};
  rp(D.oeg.querySelector('.rip'),O.up+1);rp(D.ocl.querySelector('.rip'),T<F(O.up)?O.ok:O.reach+13);
  D.ocl.querySelector('.ring').style.opacity=Math.min(qt(T,O.ok-1),1-E.inout(C((T-F(O.ok)-.6)/.5))).toFixed(3);
  put(D.oegUp,S-22,-12);D.oegUp.style.transform=`scale(${upK.toFixed(4)})`;put(D.oclUp,S-22,-12);D.oclUp.style.transform=`scale(${pop(T,O.reach+13).toFixed(4)})`;
  // link Everygen -> Claude
  const line=(l,xa,xb,drawF,d,flow,pulses)=>{const p=xp(T,drawF,d),o=E.quart(C((T-F(O.in)-.1)/.3))*(1-E.inout(C((T-ex)/.25)));
    [['x1',xa],['x2',xb],['y1',Y],['y2',Y]].forEach(([k,v])=>{l.base.setAttribute(k,v);l.fl.setAttribute(k,v)});l.base.style.opacity=(o*(drawF===O.link?1:C(p*4))).toFixed(3);
    [['x1',xa],['x2',L(xa,xb,p)],['y1',Y],['y2',Y]].forEach(([k,v])=>l.lit.setAttribute(k,v));l.lit.style.opacity=(p>0?o:0).toFixed(3);
    l.fl.style.opacity=(p>=1?.85*o:0).toFixed(3);l.fl.setAttribute('stroke-dashoffset',(-T*80).toFixed(2));
    let hp=-1,ho=0;const xd=(T-F(drawF))/d;if(xd>0&&xd<1){hp=p;ho=Math.min(1,xd/.08)*(1-C((xd-.7)/.3))}
    pulses.forEach(f=>{const x=(T-F(f))/.42;if(x>0&&x<1){hp=E.inout(x);ho=Math.min(1,x/.1,(1-x)/.12)}});
    [l.head,l.glow].forEach(c=>{c.setAttribute('cx',L(xa,xb,Math.max(0,hp)));c.setAttribute('cy',Y);c.style.opacity=(ho*o).toFixed(3)})};
  line(D.l1,egx+S/2+12,clx-S/2-12,O.link,.4,1,[O.reach]);
  put(D.okb,(egx+clx)/2-18,Y-18);D.okb.style.transform=`scale(${(pop(T,O.ok)*(1-E.inout(C((T-ex)/.2)))).toFixed(4)})`;
  // the team: five roles in one container, fed by Everygen
  const rm=sp(T,O.ready,0,1,10),fl2=Math.min(qt(T,O.give+12),1-E.inout(C((T-F(O.give+12)-.5)/.5)));put(D.team,left,Y-RS/2-14,TW,RS+28);M(D.team,O.team,{dy:40,xd:.08,base:`scale(${bump(T,O.ready,.04).toFixed(4)})`});
  // ready-made: the team's tray turns Everygen blue (they hold the toolkit now); tested: a tick on every role
  D.team.style.background=`rgba(${Math.round(L(255,0,rm))},${Math.round(L(255,117,rm))},${Math.round(L(255,253,rm))},${L(.14,.55,rm).toFixed(3)})`;
  D.team.style.boxShadow=`inset 0 0 0 ${L(2,3,rm).toFixed(2)}px rgba(${Math.round(L(255,125,rm))},${Math.round(L(255,184,rm))},255,${L(.34,.95,rm).toFixed(3)}),0 0 0 ${(4*fl2).toFixed(2)}px #3D97FF`;
  D.or_.forEach((el,i)=>{const x=left+14+i*(RS+12);put(el,x,Y-RS/2,RS,RS);const b=bump(T,O.give+13+2*i,.12)*bump(T,O.reach+13+2*i,.1);
    M(el,O.team+2+3*i,{dy:40,base:`scale(${b.toFixed(4)})`,xd:.08});put(el.ck,RS-18,-10);el.ck.style.transform=`scale(${(pop(T,O.tick+3*i)*bounce(T,O.reach+14+2*i,.25)).toFixed(4)})`});
  line(D.l2,egx-S/2-12,left+TW+10,O.team+6,.35,1,[O.give,O.reach]);
}

// ---------------------------------------------------------------- B26 (pass 2): Epidemic Sound's pricing page, full screen
// His own screenshot (CleanShot 2026-11-19 11.20.09, the Dia window cropped on its own edges, menu bar off, extension icons
// cleaned) in a browser window with every card whole; "$18 a month" pushes in on the Creator card (the rest of the page
// veiled), the price is boxed, and on "Epidemic Sound" it is struck through. Coordinates are pixels of es-page.jpg (5736x3156).
const ES2={in:9087,zoom:9109,zd:24,box:9126,strike:9188};          // "$18" = 9117 (speed peak of the push-in), "Epidemic" = 9188
const PW=5736,PH=3156,WW=1700,S0=WW/PW,WL=(1920-WW)/2,WT=(1080-PH*S0)/2;
const ZA={x:1600,y:1353},S1=.72,CARDR={x:1192,y:1071,w:1080,h:2003,r:30},PBOX={x:1236,y:1242,w:466,h:222},STK=[1262,1326,1522,1320];   // the price block and the Creator card share the centre
function buildEs2(stage){h('div','fsbg',stage);const root=h('div','tm',stage);
  D.wrap=h('div','tm',root);D.win=h('div','p2-win',D.wrap);D.win.innerHTML='<img src="es-page.jpg">';D.veil=h('div','p2-veil',D.win);
  D.box=h('div','p2-box',root);D.stk=mkSvg(root);D.stkL=se(D.stk,'line',{stroke:RED,'stroke-width':8,'stroke-linecap':'round',pathLength:1,'stroke-dasharray':1})}
function drawEs2(t){const T=T0+t;
  // the camera: a slight drift on the whole page, then the push-in (40-90 ease, speed peak on "$18")
  const u=E.k4090(C((T-F(ES2.zoom))/(ES2.zd/FPS))),dr=1+.012*E.media(C((T-F(ES2.in))/1.0)),Z=Math.pow(dr,1-u)*Math.pow(S1/S0,u);
  const P0x=WL+S0*ZA.x,P0y=WT+S0*ZA.y,px=L(P0x,960,u),py=L(P0y,540,u),k=Z*S0,tx=px-k*ZA.x,ty=py-k*ZA.y;
  Object.assign(D.win.style,{left:'0px',top:'0px',width:PW+'px',height:PH+'px',transformOrigin:'0 0',transform:`translate(${tx.toFixed(3)}px,${ty.toFixed(3)}px) scale(${k.toFixed(6)})`,
    borderRadius:(10/k).toFixed(2)+'px',boxShadow:`0 ${(34/k).toFixed(1)}px ${(90/k).toFixed(1)}px rgba(16,48,94,.22),0 ${(4/k).toFixed(1)}px ${(12/k).toFixed(1)}px rgba(16,48,94,.10),0 0 0 ${(1/k).toFixed(2)}px rgba(16,48,94,.12)`});
  EG.mat(D.wrap,T,F(ES2.in)-.12,{dy:40,s0:.96});                    // the cut in lands on a window already settling (as in pass 1)
  // one focus: the rest of the page steps back while the camera arrives on the Creator card
  const vk=E.quart(C((T-F(ES2.zoom+8))/.45));put(D.veil,CARDR.x,CARDR.y,CARDR.w,CARDR.h);D.veil.style.borderRadius=CARDR.r+'px';D.veil.style.boxShadow=`0 0 0 6000px rgba(240,239,234,${(.62*vk).toFixed(3)})`;
  const sx=x=>tx+k*x,sy=y=>ty+k*y;
  // the price box (screen space, so its stroke stays crisp), then the strike through the price
  const pad=0;put(D.box,sx(PBOX.x)-pad,sy(PBOX.y)-pad,PBOX.w*k+2*pad,PBOX.h*k+2*pad);const rk=qt(T,ES2.strike);
  D.box.style.borderColor=mix(BLUE,RED,rk);D.box.style.boxShadow=`0 0 0 10px ${rgba(rk>.5?RED:BLUE,.14)},0 18px 40px ${rgba(rk>.5?RED:BLUE,.20)}`;
  EG.mat(D.box,T,F(ES2.box),{dy:14,s0:1.06,blur:6,dur:.42});
  const sp2=xp(T,ES2.strike,.45);[['x1',sx(STK[0])],['y1',sy(STK[1])],['x2',sx(STK[2])],['y2',sy(STK[3])]].forEach(([a,v])=>D.stkL.setAttribute(a,v.toFixed(2)));
  D.stkL.setAttribute('stroke-dashoffset',(1-sp2).toFixed(4));D.stkL.style.opacity=sp2>0?1:0}

function run(id){PG=PAGES[id];T0=F(PG[0]);const stage=document.getElementById('stage'),dur=(PG[1]-PG[0])/FPS;
  if(PG[2]==='ov'){buildOv(stage);EG.run(dur,drawOv)}else if(PG[2]==='es2'){buildEs2(stage);EG.run(dur,drawEs2)}else{build(stage);EG.run(dur,draw)}}
// Sound cues of the pass-2 pieces (PASS-1 frame, kind, what it is); work/place/p2-team-sfx.json is written from this list with
// OFF applied (graphics/team-b10-v2/tools/place.mjs). Only NEW sounds: the B10-B12, B17 and B18-B20 sounds already on the
// timeline stay (same moments). REMOVE (pass-1 frames) lists the spans whose old sounds must go first.
const SFX=[[7190,'whoosh','B12 -> B13: the board leaves, his card grows to full-screen A-roll'],
 [7486,'whoosh','B16: his card shrinks back from full screen, the board returns'],
 [7493,'ui-pop','"Claude Code" takes the label; the four tools are coded (one sound)'],[7510,'ui-click','the coded tools land (one sound for the four)'],
 [7540,'ui-click','re-coded from scratch: they land slightly different (tilted, the renderer cracked)'],
 [7556,'ui-click','a good week: the cutter gets a green tick'],[7646,'ui-pop','the animator\'s graphic glitches (red)'],[7699,'ui-click','a word is chopped off (red cross)'],
 [9129,'ui-pop','B26: the box lands on the Creator price ($17.99)'],[9190,'ui-click','the price is struck through ("no more paying")']];
const REMOVE=[[7181,7716],[9092,9214]];   // B13-B16 (the long coding visual, the clock, the re-codes) and B26 after the cut in (the tab-close click)
return {run,PAGES,Q,SFX,REMOVE,FPS,OFF};
})();
