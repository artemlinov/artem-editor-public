// live-v3: the progress stepper of the live section, three small white chips hanging under his camera card
// (Folder, Prompt, Model), so the viewer sees how far along the setup is (Artem, final pass: "let's give the live
// section a sense of progress").
// A fixed element of the frame: it never moves with the recording's camera, it sits above the window and its shadow,
// under the card (never over it), in the one corner of this layout that stays empty in every framing of the scene.
// SPEC.steps = {labels:[...], tIn, tOut, gap, h, fs, ring:[[t, i|null], ...], tick:[[t, i, 1|0], ...]}
//   ring: from t on, step i is the one he is on (Everygen-blue outline, blue dot); null = none (the chat is sent)
//   tick: at t, step i is done (1: blue badge with a white tick) or open again (0: a new chat)
// Motion, all from presets/motion/README.md:
//   in/out  materialize, the chips 0.10 s apart in reading order, and its mirror as the exit
//   ring    light-up's colour and ring, 0.28 s quart-out (no bump: it only says where he is)
//   tick    the whole light-up: colour 0.28 s quart-out, badge bump +12% in the first 0.27 s, one ripple off the chip's
//           frame (opacity .55 -> 0 over 0.6 s, expo-out). Clearing a tick is the colour change alone, played back.
// Load after scr-extra.js (and dock.js) and before scene.js.
(function(){
 const S=window.SPEC&&window.SPEC.steps;if(!S)return;
 const C=EG.clamp,Q=EG.E.quart,X=EG.E.expo,K=LAY.CARD,gap=S.gap??16,H=S.h??50,fs=S.fs??26,bd=Math.round(fs);
 const mix=(a,b,u)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*u)).join(',')+')';
 const BLUE=[0,117,253],INK=[28,30,34],MUTED=[139,143,154],LINE=[201,205,214],WHITE=[255,255,255];
 const st=document.createElement('style');st.textContent=`
 #stp{position:absolute;display:flex;gap:8px;z-index:6;pointer-events:none}
 #stp .chip{position:relative;flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;gap:${(fs*.31).toFixed(1)}px;height:100%;box-sizing:border-box;border-radius:999px;background:#fff;white-space:nowrap}
 #stp .lb{font:600 ${fs}px/1 var(--eg-font);letter-spacing:-.01em;padding-top:.04em}
 #stp .bd{position:relative;flex:none;width:${bd}px;height:${bd}px;box-sizing:border-box;border-radius:50%;border:2.5px solid}
 #stp .bd svg{position:absolute;left:-2.5px;top:-2.5px;width:${bd}px;height:${bd}px;display:block}
 #stp .bd i{position:absolute;left:50%;top:50%;width:${(bd*.38).toFixed(1)}px;height:${(bd*.38).toFixed(1)}px;margin:${(-bd*.19).toFixed(1)}px 0 0 ${(-bd*.19).toFixed(1)}px;border-radius:50%;background:var(--eg-blue,#0075fd)}
 #stp .rp{position:absolute;border:2px solid var(--eg-blue,#0075fd);border-radius:999px;pointer-events:none}`;
 document.head.appendChild(st);
 const box=document.createElement('div');box.id='stp';
 Object.assign(box.style,{left:K.x+'px',top:(K.y+K.h+gap)+'px',width:K.w+'px',height:H+'px'});
 const chips=S.labels.map(l=>{const c=document.createElement('div');c.className='chip';
  c.innerHTML='<i class="rp"></i><span class="bd"><svg viewBox="0 0 24 24"><path d="M6.6 12.6l3.5 3.5 7.3-8" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><i></i></span><span class="lb"></span>';
  c.lastChild.textContent=l;c.style.visibility='hidden';box.appendChild(c);return c});
 // in the page from the start, so the semibold face is loaded before the first frame is drawn (EG.run waits for fonts)
 document.querySelector('.stage').appendChild(box);try{document.fonts.load(`600 ${fs}px EverygenNeue`)}catch(e){}
 // a level that follows its on/off events with the 0.28 s quart-out colour change
 const lvl=(ev,t)=>{let v=0;for(const[te,on]of ev){if(t<=te)break;v+=(on-v)*Q(C((t-te)/.28))}return v};
 const ringEv=i=>S.ring.map(([t,k])=>[t,k===i?1:0]),tickEv=i=>S.tick.filter(e=>e[1]===i).map(([t,,on])=>[t,on]);
 function draw(t){
  chips.forEach((c,i)=>{
   EG.mat(c,t,S.tIn+i*.10,{exit:S.tOut==null?null:S.tOut+i*.06});
   if(c.style.visibility==='hidden'){c.firstChild.style.visibility='hidden';return}   // (a child's own visibility would show through)
   const r=lvl(ringEv(i),t),k=lvl(tickEv(i),t),a=Math.max(r,k);
   let u=9;for(const[te,on]of tickEv(i)){if(on&&t>te)u=t-te}                       // seconds since this chip's last tick
   const bump=1+.12*Math.sin(Math.PI*C(u/.27)),rp=X(C(u/.6));
   c.style.boxShadow=`0 0 0 2.5px rgba(0,117,253,${r.toFixed(3)}),0 0 16px rgba(0,117,253,${(.32*r).toFixed(3)}),0 10px 26px rgba(16,48,94,.18),0 2px 6px rgba(16,48,94,.10),0 0 0 1px rgba(16,48,94,.07)`;
   const[rip,b,lb]=c.children;lb.style.color=mix(MUTED,INK,a);
   Object.assign(b.style,{borderColor:mix(LINE,BLUE,a),background:mix(WHITE,BLUE,k),transform:`scale(${bump.toFixed(4)})`});
   Object.assign(b.firstChild.style,{opacity:k.toFixed(3),transform:`scale(${(.6+.4*k).toFixed(4)})`});
   b.lastChild.style.opacity=(r*(1-k)).toFixed(3);
   const on=u<.6;rip.style.visibility=on?'visible':'hidden';
   if(on){const d=(2.5+8*rp).toFixed(2);Object.assign(rip.style,{inset:`-${d}px`,opacity:(.55*(1-rp)).toFixed(3)})}
  })}
 const run=EG.run;
 EG.run=(dur,fn)=>run(dur,async t=>{await fn(t);draw(t)});
})();
