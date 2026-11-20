// p2-review-scene.js (worker review, video 14, PASS 2): Step 5, the review of the first draft, E02-E34, as ONE scene, a pure
// function of the timeline second. Built on pass 1's scene (_lib/scr-review-scene.js, unchanged, still played by the old
// renders) with Artem's pass-2 notes: the screen leaves for FULL-SCREEN CAMERA on E04, E07-E08, E12, E19-E20 and E30-E31 (his
// card grows to full frame on the frame the line before is over, and shrinks back on the frame the camera line is over), the
// E23 camera jumps are a real scrub through 1:38-1:56 (no hops, no clicks), and the extras that competed with the one focus
// (the Border/Hook/AI ad/Camera chips under his card, the Claude + Everygen tiles of E20) are gone.
// The pages graphics/scr-review-p2-1 … -6 render the six screen stretches (SRS2.run(f0, f1), NEW timeline frames); the E20
// apps overlay is its own page (scr-review-p2-apps). What changed and why: graphics/scr-review-p2-1/README.md.
//
// CLOCK: the review section sits 153 frames earlier than in pass 1 (every E line moved -5.105 s, the cut inside it is the same,
// checked frame by frame). The scene keeps pass 1's clock (old timeline seconds) so pass 1's data (scr-review-1/data.js: his
// word onsets, voice levels, A-roll sequences) stays valid; a page's NEW frame k plays the scene at old frame k + 153.
window.SRS2=(()=>{
const C=EG.clamp,L=EG.lerp,E=EG.E,F=30000/1001,D=window.SRD,P=window.SRP2,SH=P.sh,g=t=>Math.round(t*F)/F,n2o=t=>g(t+SH/F);
const FR='/Users/<you>/Library/Caches/everygen-editor/14 Your First Claude Edit/frames/',IMG=FR+'scr-review-img/';
const A0=D.A[0]/F,B0=D.B[0]/F,N=D.notes;
// the screen stretches, in the scene's (old) seconds: [card shrinks in, card grows out]; act B (the last one) ends with the card in place
const SEG=P.pieces.map(([a,b])=>[(a+SH)/F,b==null?null:(b+SH)/F]),SEGA=SEG.slice(0,5);
// ---------------------------------------------------------------- the clock (old timeline seconds, each on a frame); NEW = old - 5.105
const T={
 qtOpen:g(689.75),          // "I'll open the video"
 camFlow:g(690.45),         // "and get my dictation tool ready": down to the chat box and the bar under it
 flowIn:g(690.72),chipIn:g(692.21),micRing:g(693.43),e03:g(695.43),      // "I use Wispr Flow," | "but Claude's built-in dictation works too."
 e03cam:n2o(691.60),                                                     // (inside E04's full-screen camera) back to normal scale
 curA:n2o(694.40),play:g(700.45),pause:g(701.80),curAout:g(703.05),      // "Then I just play the video" | "…something is off, I pause"
 hudA:g(703.35),
 phones:g(703.67),phonesOut:n2o(706.20),                                 // "right off the bat looking at this phone border" (out inside E07's camera)
 camN1:g(712.47),paste:g(713.25),                                        // (inside E07-E08's camera) note 1's box, the paused frame pasted
 send1:g(724.40),                                                        // "And I'll send that now"
 to003:g(731.30),                                                        // "Next, I want Claude to visualize everything I say at the very start"
 camN2:g(735.44),                                                        // "and I'll tell it why so it knows for the next time"
 back2:g(746.14),ff0:g(746.55),ff1:g(748.60),                            // "the rest of the first minute looks great to me, | but here at 1:07,"
 slot:g(752.84),                                                         // "so I want to show one on screen": an empty slot beside him in the paused 1:07 frame
 camN3:g(757.14),                                                        // (inside E19-E20's camera) note 3's box
 back3:g(772.04),                                                        // the frame E22 is over: normal scale
 press:n2o(P.scrub.press),fast:n2o(P.scrub.fast),slow:n2o(P.scrub.slow),rel:n2o(P.scrub.rel),   // "Okay, next…": grab the knob, 1:07 -> 1:38, then scrub on to 1:56
 camWin:n2o(769.70),winRing:n2o(770.85),winOut:n2o(773.713),             // "but I'm just not the biggest fan of how my camera keeps jumping inside this window."
 camN4:g(780.80),                                                        // "so I'll say it as a rule,"
 back4:n2o(797.50),qtClose:g(801.53),                                    // (inside E30-E31's camera)
 optsDone:g(808.0),imgA:g(810.95),imgB:g(811.05),imgC:g(811.15),         // (while he is on camera) | "In the meantime,"
 curB:g(811.12),lbClick:g(811.66),lbOpen:g(811.72),flickB:g(812.68),flickC:g(813.64),txt:g(813.0),ask:g(813.5),   // "the three phone border options are back | and I think…"
 pick:g(815.50),lbClose:g(816.24),camN5:g(816.20),                       // "…option C the most."
 camOut:n2o(813.25),                                                     // "throughout the whole video": out to normal scale, landing on the send
 send2:g(819.486)                                                        // the frame "…the whole video." is over
};
T.playEnd=T.play+29/(F*.75);
const flowOn=N.map(n=>[g(n.t[0]-.33),g(n.t1+.10)]);                       // the bar listens from just before his first word to just after his last
T.plan=g(T.send1+1.1);T.status=g(T.send1+.5);
const VT=P.scrub.vt,SK0=P.scrub.k0+SH;                                    // the scrub's video time per frame (old frames from SK0)
const vtAt=k=>VT[C(k-SK0,0,VT.length-1)];
// ---------------------------------------------------------------- the page
const st=document.querySelector('.stage');
document.head.insertAdjacentHTML('beforeend',`<style>
#arb{position:absolute;overflow:hidden;z-index:5;background:#0b0c10}#arb img{position:absolute;display:block}
#sc{position:absolute;inset:0}
.dc-comp:not(.tall) .tx{padding-right:98px}
#srchip{position:absolute;height:64px;display:flex;align-items:center;gap:14px;padding:0 28px 0 13px;border-radius:999px;background:#fff;white-space:nowrap;font:600 31px/1 var(--eg-font);color:var(--eg-ink);
 box-shadow:0 0 0 2.5px var(--eg-blue),0 0 18px rgba(0,117,253,.30),0 14px 34px rgba(16,48,94,.22),0 2px 6px rgba(16,48,94,.10)}
#srchip img{width:40px;height:40px;border-radius:10px;display:block}
#srchip::before{content:"";position:absolute;left:50%;top:-9px;width:18px;height:18px;margin-left:-9px;background:#fff;transform:rotate(45deg);border-radius:3px;box-shadow:-2.5px -2.5px 0 0 var(--eg-blue)}
.sr-slot{position:absolute;border:3.2px dashed var(--eg-blue);border-radius:20px;background:rgba(0,117,253,.13);box-shadow:0 0 22px rgba(0,117,253,.35)}
.sr-slot i{position:absolute;left:50%;top:50%;width:58px;height:58px;margin:-29px;border-radius:50%;background:var(--eg-blue);box-shadow:0 8px 22px rgba(0,98,224,.45)}
.sr-slot i::before,.sr-slot i::after{content:"";position:absolute;left:50%;top:50%;width:26px;height:4.5px;margin:-2.25px -13px;border-radius:3px;background:#fff}.sr-slot i::after{transform:rotate(90deg)}
</style>`);
// the card: full frame (0) between the stretches, the card (1) inside one; it shrinks on the stretch's first frame and is back at full
// frame exactly 17 frames after the stretch's out (LAY.u, the house spring)
const seg=t=>{let s=SEG[0];for(const x of SEG)if(t>=x[0]-1e-6)s=x;return s};
function run(f0,f1){
 const sc=SRK.el('','',st);sc.id='sc';
 const t2=N.slice(1).map(n=>n.text).join(' \n\n'),w2=[].concat(...N.slice(1).map(n=>n.t));
 const planItems=['Look at how the phone frame is built','Design 3 premium phone frame variations','Snap each variation over the A-roll','Show the 3 options side by side'];
 const pT=[[T.plan+.3,g(742.6)],[g(742.6),g(775.6)],[g(775.6),g(795.0)],[g(795.0),g(806.5)]];
 const app=DCL.build(sc,{w:2048,h:1127,tab:'code',home:false,env:null,title:'Video 1 YouTube talking head edit',
  sidebar:{groups:{code:[{title:'video-editor',items:[{text:'Video 1 YouTube talking head edit',sel:1}]}]},account:{name:'Artem',plan:'Ultra'}},
  panel:{open:1,connectors:'11 connected',context:[[A0,10],[T.send1,10],[g(804.2),12],[T.send2,12],[D.B[1]/F,13]],
   outputs:[{name:'C - Frameless.jpg',kind:'image',at:T.imgC},{name:'B - Glass.jpg',kind:'image',at:T.imgB},{name:'A - Titanium.jpg',kind:'image',at:T.imgA},{name:'lib.js',kind:'code'},{name:'brand.css',kind:'code'},{name:'build_takes.py',kind:'code'}]},
  model:{name:'Fable 5.2',effort:'High',mode:'Auto'},composer:{busy:[[T.send1,T.txt],[T.send2,1e9]]},
  msgs:[
   {who:'claude',parts:[
    {k:'text',at:-1e9,text:'**Things to check**'},
    {k:'text',at:-1e9,text:'• **End screen:** the “watch next” frame is an empty placeholder; I had no thumbnail for the Disney-style ads video.'},
    {k:'text',at:-1e9,text:'• **Loudness:** the mix sits at −21.6 LUFS, which is quieter than YouTube’s usual −14.'},
    {k:'text',at:-1e9,text:'• **Jump cuts left on the A-roll:** 1:11, 6:46 and 7:28, each carried by a punch-in or reframe rather than a visual.'},
    {k:'text',at:-1e9,text:'• **Plain A-roll stretches:** 1:02–1:11 and 8:03–8:09 have only a slow push-in.'},
    {k:'text',at:-1e9,text:'Your feedback on this video becomes notes for the next one, so open this same folder for every video. The working files are kept until you’re happy with it.'},
    {k:'ask',at:-1e9,note:'Video 1 is edited: a 9:43 4K file sits next to the footage, with 35 designed graphics, 10 music beds and sound effects. Every line was re-transcribed and matches; visuals were checked on stills and review sheets, but the sound mix was measured, not listened to.',q:'What would you change after watching it?',buttons:['I’ll send notes','Looks good']}]},
   {who:'user',text:N[0].text,words:N[0].t,files:[{src:IMG+'thumb.jpg',land:T.paste}],send:T.send1,fw:538},
   {who:'claude',parts:[
    {k:'note',at:T.optsDone,text:'Ran 5 commands, read 6 files ›'},
    {k:'text',at:T.optsDone,text:'Three phone frame options on the same hook frame (0:03)'},
    {k:'images',at:T.imgA,w:538,items:[{src:IMG+'optA-s.jpg'}]},{k:'images',at:T.imgB,w:538,items:[{src:IMG+'optB.jpg'}]},{k:'images',at:T.imgC,w:538,items:[{src:IMG+'optC-s.jpg'}]},
    {k:'plan',at:T.plan,items:planItems.map((x,i)=>({text:x,start:pT[i][0],done:pT[i][1]}))},
    {k:'status',at:T.status,until:T.txt,time:[[T.status,0],[T.status+200,200]],tokens:[[T.status,0],[T.status+90,2300],[T.status+200,2900]]},
    {k:'text',at:T.txt,text:'Here are three frame options, each shown on the same hook frame at 0:03. The video itself is unchanged until you pick one.'},
    {k:'text',at:T.txt,text:'• **A · Titanium:** a real phone — brushed metal rim, thin black bezel, Dynamic Island and side buttons. [[A - Titanium.jpg]]'},
    {k:'text',at:T.txt,text:'• **B · Glass:** a soft white translucent rim with a bright edge, closer to the light cards used in the rest of the graphics. [[B - Glass.jpg]]'},
    {k:'text',at:T.txt,text:'• **C · Frameless:** no border at all, only rounded corners, a hairline highlight and a deeper shadow. [[C - Frameless.jpg]]'},
    {k:'text',at:T.txt,text:'I’d go with A: it reads as an actual phone, which backs up the “looks filmed on a phone” point, and it stands out most against the dark sofa. C is the cleanest if you’d rather the ad not sit inside a device.'},
    {k:'ask',at:T.ask,note:'Three phone frame options are ready as stills on the hook frame: titanium phone, glass rim and frameless. Nothing in the video has changed yet; the chosen frame still has to be applied to every phone and re-rendered.',q:'Which phone frame should go into the video?',buttons:['Use A','Use C']},
    {k:'ask',at:T.send2,note:'Three phone frame options are ready as stills on the hook frame: titanium phone, glass rim and frameless. Nothing in the video has changed yet; the chosen frame still has to be applied to every phone and re-rendered.',q:'Which phone frame should go into the video?',buttons:[]}]},
   {who:'user',text:t2,words:w2,send:T.send2},
   {who:'claude',parts:[{k:'status',at:g(T.send2+.5),time:[[T.send2+.5,0],[T.send2+60,60]],text:'Thinking'}]}]});
 const blk=n=>app.blocks.find(b=>b.name===n),bPlan=blk('part2.5'),bAsk=blk('part2.12'),bNote=blk('part2.0'),col=app.el.querySelector('.dc-col');
 const dk=SRK.desk(sc,app),QX=142,QY=40,QW=1280,TOT=583;
 const lb=SRK.lightbox(dk,{imgs:[IMG+'optA.jpg',IMG+'optB.jpg',IMG+'optC.jpg'],cx:1024,cy:560,w:1240,py:560+1240*9/32+62});
 const qt=SRK.quicktime(dk,{x:QX,y:QY,w:QW,name:'2026-11-06_12-26-37 - edit.mp4'}),QH=qt.h;
 const slot=SRK.el('sr-slot','<i></i>',dk.el);SRK.put(slot,{x:QX+.675*QW,y:QY+.165*QH,w:.20*QW,h:.20*QW*16/9});
 const flow=SRK.flowbar(dk,{cx:1024,cy:1106.5}),rMic=SRK.ring(dk),rWin=SRK.ring(dk),rPick=SRK.ring(dk);
 EG.seq('v1p',FR+'scr-review-v1play',30);EG.seq('ff',FR+'scr-review-ff',58);EG.seq('ar1',FR+'scr-review-ar1',D.A[1]-D.A[0]+1);EG.seq('ar2',FR+'scr-review-ar2',D.B[1]-D.B[0]+1);
 EG.seq('scrub',FR+'p2-review-scrub',VT.length);
 const chip=SRK.el('','<img src="../scr-review-1/flow-symbol.svg"><span>Wispr Flow</span>',st);chip.id='srchip';
 st.insertAdjacentHTML('beforeend','<div id="arb"><img id="ari"></div>');const arb=st.querySelector('#arb'),ari=st.querySelector('#ari');
 const cur=DCL.cursor(st,1.5);
 const rest=DCL.fit(app,{x:LAY.WIN.x,y:LAY.WIN.y,w:LAY.WIN.w}),S0=rest.s;
 let cam=null,curs=null;
 const prep=t=>{bPlan.at=t>=T.txt?1e9:T.plan;bAsk.at=t>=T.send2?1e9:T.ask};
 const scrollB=t=>{   // act B: the chat stays on the three stills as they land (it does not follow down), until Claude's text arrives
  if(t<B0-1||t>=T.txt+.6)return;const m=/translateY\(([-\d.]+)px\)/.exec(col.style.transform),kit=m?+m[1]:0,mine=Math.min(0,-(bNote.b.offsetTop-6)),u=SRK.ease(C((t-T.txt)/.55));
  col.style.transform=`translateY(${L(Math.max(kit,mine),kit,u).toFixed(2)}px)`};
 async function measure(){const at=async(t,n)=>{prep(t);await app.draw(t,rest);scrollB(t);return app.rect(n)};
  const c=[];for(const n of N){const r=await at(n.t[n.t.length-1]+.03,'composer');c.push({x:r.x+r.w/2,y:r.y+r.h/2,h:r.h,top:r.y})}
  const c0=await at(T.camFlow,'composer'),mic=await at(T.micRing,'mic'),ia=await at(T.lbClick,'part2.2');
  const ZD=1.65,PH=[QX+.785*QW,QY+.49*QH],CW=[QX+.85*QW,QY+.50*QH];
  const cy=i=>C(880-(app.H-c[i].y)*S0*ZD,600,770);
  cam=SRK.camera(app,[[0,1,null],
   [T.camFlow,1.7,c0.x+c0.w/2,c0.y+c0.h/2+18,.8,742,772],          // the chat box with Wispr Flow's bar under it
   [T.e03cam,1,null,null,.8],
   [T.phones,1.9,PH[0],PH[1],.9],                    // the three phones of the paused frame, whole, mid-frame
   [T.phonesOut,1,null,null,.8],
   [T.camN1,ZD,c[0].x,c[0].y,.8,742,cy(0)],             // note 1 (the screen comes back on it after E07-E08's camera)
   [g(T.send1+.03),1,null,null,.8],                  // sent: normal scale, Claude starts on the options under the player
   [T.camN2,ZD,c[1].x,c[1].y,.8,742,cy(1)],
   [T.back2,1,null,null,.8],
   [T.camN3,ZD,c[2].x,c[2].y,.8,742,cy(2)],
   [T.back3,1,null,null,.8],
   [T.camWin,1.9,CW[0],CW[1],.85],                   // his camera window inside the draft, while the scrub runs on through the jumps
   [T.winOut,1,null,null,.8],
   [T.camN4,ZD,c[3].x,c[3].y,.8,742,cy(3)],
   [T.back4,1,null,null,.8],
   [T.lbOpen,1.1,1024,560,.7,742,512],               // the image viewer: the still mid-frame, clear of his card
   [T.camN5,ZD,c[4].x,c[4].y,.65,742,cy(4)],
   [T.camOut,1,null,null,1.1]],{lift:330});          // back to normal scale as he finishes ("throughout the whole video"): sent at rest, res-v2 picks up there
  const pb=qt.btn('play'),fb=qt.btn('ff'),kn=v=>qt.knob(v,TOT);
  // the scrub pointer: comes up from the chat to the knob at 1:07, presses on "next", then rides the knob (no click: he drags)
  const s0=kn(67),sIn=SRK.path([[0,s0[0]+150,s0[1]+250],[n2o(767.26),s0[0]+1,s0[1]+2,.32]]);
  const scrubPath=t=>{if(t<T.press)return sIn(t);const p=kn(vtAt(Math.round(t*F)));return[p[0]+1,p[1]+2]};
  curs=[{t0:T.curA,t1:T.curAout,clicks:[T.play,T.pause],path:SRK.path([[0,QX+760,QY+610],[T.curA+.1,pb[0]+2,pb[1]+3,.75]])},
   {t0:g(746.18),t1:g(749.5),clicks:[T.ff0,T.ff1],path:SRK.path([[0,QX+700,QY+625],[746.2,fb[0]+2,fb[1]+3,.3],[g(747.9),pb[0]+2,pb[1]+3,.5]])},
   {t0:n2o(767.20),t1:n2o(774.05),clicks:[],path:scrubPath},
   {t0:T.curB,t1:g(812.25),clicks:[T.lbClick],path:SRK.path([[0,ia.x+470,ia.y+330],[T.curB+.05,ia.x+300,ia.y+150,.45]])}];
  M={c,mic,ia,c0};window.__SR={app,M,T,SEG}}
 let M=null;
 const lv=dt=>t=>{const k=Math.round((t-dt)*F),a=k>=D.B[0]?D.lvB[k-D.B[0]]:D.lvA[k-D.A[0]];return a||0};
 // ---- QuickTime: which picture, which time
 async function qtPic(t,k){const P=qt.pic;
  if(t<T.play)return EG.frame(P,'v1p',.5/F);
  if(t<T.pause)return EG.frame(P,'v1p',(Math.min(29,Math.floor((t-T.play)*F*.75+1e-6))+.5)/F);
  if(t<T.to003)return SRK.show(P,IMG+'v1-0001.jpg');
  if(t<T.ff0)return SRK.show(P,IMG+'v1-0003.jpg');
  if(t<T.ff1){const i=Math.floor((t-T.ff0)*F+1e-6);return i<58?EG.frame(P,'ff',(i+.5)/F):SRK.show(P,IMG+'v1-0107.jpg')}
  if(t<T.press)return SRK.show(P,IMG+'v1-0107.jpg');
  return EG.frame(P,'scrub',(C(k-SK0,0,VT.length-1)+.5)/F)}
 const qtTime=(t,k)=>t<T.play?0:t<T.pause?Math.min(29,Math.floor((t-T.play)*F*.75+1e-6))/F:t<T.to003?.97:t<T.ff0?2.7:t<T.ff1?Math.min(67,4.4+Math.floor((t-T.ff0)*F+1e-6)):t<T.press?67:vtAt(k);
 // the controls and the title bar: up while the pointer works them, and for every picture that has QuickTime's own controls in it
 const HUD=[[g(T.qtOpen-.5),T.hudA],[g(730.95),g(733.6)],[g(746.20),n2o(774.05)]];
 const hud=t=>{let v=0;for(const[a,b]of HUD)v=Math.max(v,C(Math.min((t-a)/.14,(b-t)/.3)));return v};
 const flowA=t=>{if(t<T.flowIn)return 0;                                       // 0 hidden, .35 the idle pill, 1 open
  let v=t<T.e03?E.expo(C((t-T.flowIn)/.3)):L(1,.35,E.expo(C((t-T.e03)/.25)));    // shown open while he introduces it, then idle
  for(const[x,y]of flowOn){if(t>=x)v=t<y?L(.35,1,E.expo(C((t-x)/.22))):L(1,.35,E.expo(C((t-y)/.25)))}return v};
 const listening=t=>flowOn.some(([x,y])=>t>=x&&t<y);
 EG.run((f1-f0)/F,async tt=>{
  const k=f0+SH+Math.round(tt*F),t=k/F,s=seg(t),actB=s[1]==null;
  if(!cam){sc.style.transform='none';sc.style.filter='none';await measure()}
  // ---- his camera: the live A-roll of this frame, full frame between the stretches, the card inside one
  LAY.aroll(arb,ari,LAY.u(t,s[0],s[1],17/F),LAY.CARD,975);
  if(actB)await EG.frame(ari,'ar2',(C(k-D.B[0],0,D.B[1]-D.B[0])+.5)/F);else await EG.frame(ari,'ar1',(C(k-D.A[0],0,D.A[1]-D.A[0])+.5)/F);
  // ---- the app, the camera
  const v=cam(t);prep(t);await app.draw(t,v);scrollB(t);dk.at(v);
  EG.mat(sc,t,s[0]+.10,{exit:s[1]==null?null:s[1]-.05});
  const sx=p=>v.x+p[0]*v.s,sy=p=>v.y+p[1]*v.s;
  // ---- QuickTime
  const qo=actB?0:Math.min(C((t-T.qtOpen)/.32),1-C((t-T.qtClose)/.2));
  if(qo>0)await qtPic(t,k);qt.draw({open:qo,hud:hud(t),time:qtTime(t,k),total:TOT,playing:(t>=T.play&&t<T.pause)||(t>=T.ff0&&t<T.ff1)});
  EG.mat(slot,t,T.slot,{exit:T.back3-.02,dy:34});const sb=t-T.slot;slot.lastChild.style.transform=`scale(${(sb<.1?.4:1+.3*Math.exp(-8*(sb-.1))*Math.cos(16*(sb-.1))).toFixed(4)})`;
  // ---- Wispr Flow
  flow.draw(t,flowA(t),listening(t)?dt=>lv(dt)(t):null);
  const fr=flow.rect(),cx=sx([fr.x+fr.w/2,0]),cyb=sy([0,fr.y+fr.h]);
  chip.style.left=(cx-chip.offsetWidth/2).toFixed(2)+'px';chip.style.top=(cyb+26).toFixed(2)+'px';EG.mat(chip,t,T.chipIn,{exit:T.e03,dy:40});
  rMic.draw(t,T.micRing,T.e03,{x:M.mic.x-7,y:M.mic.y-7,w:M.mic.w+14,h:M.mic.h+14},9);
  // ---- his camera window inside the draft (x 75-95%, y 20.4-79.6% of the picture, its own white rim around it)
  rWin.draw(t,T.winRing,T.winOut,{x:QX+.743*QW,y:QY+.192*QH,w:.214*QW,h:.616*QH},16);
  // ---- the image viewer (act B)
  const lo=actB?Math.min(C((t-T.lbOpen)/.28),1-C((t-T.lbClose)/.2)):0,pos=EG.spring(t,T.flickB-2/F,0,1,24)+EG.spring(t,T.flickC-2/F,0,1,24);
  lb.draw({open:lo,pos});
  const lr=lb.rect();rPick.draw(t,actB?T.pick:1e9,T.lbClose-.1,{x:lr.x+.022*lr.w,y:lr.y+.040*lr.h,w:.182*lr.w,h:.089*lr.h},30);
  // ---- the pointer (always on top)
  let on=null;for(const c of curs){if(t>=c.t0&&t<c.t1)on=c}
  if(on){const p=on.path(t);cur.at(sx(p),sy(p),C(Math.min((t-on.t0)/.15,(on.t1-t)/.2)));let tc=-9;for(const c of on.clicks){if(t>=c)tc=c}cur.click(t,tc)}else cur.at(0,0,0);
 })}
return{run,T,SEG,flowOn,g,n2o,SH};
})();
