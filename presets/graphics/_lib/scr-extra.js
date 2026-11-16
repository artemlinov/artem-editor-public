// Worker scr: extras for a screen + A-roll scene, on top of _lib/scene.js. Load it BEFORE scene.js: it wraps EG.run so
// its own overlay kinds are drawn after the scene's, every frame. They sit in SPEC.ov with the others, in the same
// window capture units (x of 3824, y of 2105).
//  scr-ring {x,y,w,h,t0,t1}: an Everygen-blue outline lighting up around a thing in the recording (preset light-up:
//           ring .28 s quart-out with a small bump, one ripple +16% over .6 s). Gone on the frame t1.
//  scr-txt  {x,w,h,rows:[[frame,y],...],text,t0,t1e,caretEnd,fs,color}: a patch in the app's own font that covers one line
//           of the recording and types other words there. rows = the line's y from that page frame on (the box grows
//           with the recording), so the patch can never be a frame off the picture under it.
//  scr-lens {sx,sy,x,y,r,mag,t0,t1}: a magnifying glass at (x,y) showing the recording around (sx,sy), for a small thing
//           at the window's edge that a camera move could only push into a corner (pass 2: point at a detail with a lens).
//  scr-blur {x,y,w,h,b,t0,t1}: that rectangle of the recording shown blurred (b = radius in capture px): one word hidden, the rest readable (a tease).
//  scr-rew  {x,y,t0,t1,f0,sec:[...]}: the rewind marker, an Everygen-blue pill with two back arrows and the run time counting back
//           (sec = seconds to show on each page frame from f0 on); enters and leaves with materialize.
// Pass 2 options, in window.SPEC.scr (the build script adds it to the page):
//  r: the window's real corner radius in page px at rest (the 2026-11 Claude captures: 13.5), so no wallpaper shows in the corners
//  nocard: true = a full-screen recording, his camera card hidden
//  free: true = camera keys [t,z,fx,fy,dur,cx,cy] put the focus (fx,fy) at (cx,cy) (default: the middle of the free area);
//        lift: how far (px) the window may rise above its rest rectangle so a focal point at its bottom edge can sit mid-frame
(function(){
 const C=EG.clamp,CW=3824,CH=2105,FPS=30000/1001,pc=(v,W)=>(v/W*100).toFixed(4)+'%',S=(window.SPEC&&window.SPEC.scr)||{};
 const st=document.createElement('style');st.textContent=`
 .o.scr-ring{box-sizing:border-box;border:.075em solid var(--eg-blue,#0075fd);border-radius:.42em;background:rgba(0,117,253,.16);box-shadow:0 0 .5em rgba(0,117,253,.55),inset 0 0 .35em rgba(0,117,253,.25)}
 .o.scr-ring i{position:absolute;inset:-.075em;border:.06em solid var(--eg-blue,#0075fd);border-radius:.42em}
 .o.scr-txt{box-sizing:border-box;background:#fff;display:flex;align-items:center;white-space:pre;overflow:hidden;font-family:"Inter",var(--eg-font);font-weight:400;-webkit-font-smoothing:antialiased;font-kerning:normal}
 .o.scr-txt .car{display:inline-block;width:.045em;height:1.25em;background:#3d3d3a;margin-left:.02em}
 .o.scr-lens{border-radius:50%;overflow:hidden;background:#fff;box-shadow:0 0 0 4px #fff,0 0 0 6.5px var(--eg-blue,#0075fd),0 18px 50px rgba(16,48,94,.38),0 3px 10px rgba(16,48,94,.2)}
 .o.scr-lens img{position:absolute;display:block;max-width:none}
 .o.scr-blur{overflow:hidden;border-radius:.14em;background:#fff}.o.scr-blur img{position:absolute;display:block;max-width:none}
 .o.scr-rew{display:flex;align-items:center;gap:.5em;white-space:nowrap;padding:.42em 1em .42em .85em;border-radius:999px;background:var(--eg-blue,#0075fd);color:#fff;font:600 1.5em var(--eg-font);font-variant-numeric:tabular-nums;box-shadow:0 .5em 1.4em rgba(16,48,94,.28)}
 .o.scr-rew svg{width:1.25em;height:.8em;display:block}
 ${S.nocard?'#arb{display:none}':''}`;document.head.appendChild(st);
 if(S.r)LAY.WIN.r=S.r;
 if(S.free){const W=LAY.WIN,ease=CAM.ease;
  const rect=(z,fx,fy,cx,cy)=>{const w=W.w*z,h=W.h*z;if(fx==null)return{x:W.x+(W.w-w)/2,y:W.y+(W.h-h)/2,w,h};
   const rb=S.nocard?W.x+W.w:LAY.CARD.x-24;
   return{x:C((cx??(S.nocard?960:742))-fx*w,Math.min(W.x,rb-w),W.x),y:C((cy??540)-fy*h,W.y+W.h-h-(S.lift||0),W.y),w,h}};
  CAM.at=(t,K)=>{let r=rect(K[0][1],K[0][2],K[0][3],K[0][5],K[0][6]);
   for(let i=1;i<K.length;i++){const[s,z,fx,fy,d=.8,cx,cy]=K[i];if(t<=s)break;const q=rect(z,fx,fy,cx,cy),u=ease(C((t-s)/d));
    r={x:r.x+(q.x-r.x)*u,y:r.y+(q.y-r.y)*u,w:r.w+(q.w-r.w)*u,h:r.h+(q.h-r.h)*u}}return r}}
 const run=EG.run;
 EG.run=(dur,fn)=>run(dur,async t=>{await fn(t);const P=window.SPEC,ov=document.getElementById('ov'),wc=document.getElementById('wc');
  for(let i=0;i<P.ov.length;i++){const o=P.ov[i],d=ov.children[i];if(!d)continue;
   if(o.k==='scr-ring'){const on=t>=o.t0&&(o.t1==null||t<o.t1);d.style.visibility=on?'visible':'hidden';if(!on)continue;
    if(!d.firstChild)d.appendChild(document.createElement('i'));
    const u=t-o.t0,p=EG.E.quart(C(u/.28)),bump=1+.12*Math.sin(Math.PI*C(u/.27)),r=EG.E.expo(C(u/.6));
    Object.assign(d.style,{left:pc(o.x,CW),top:pc(o.y,CH),width:pc(o.w,CW),height:pc(o.h,CH),opacity:C(u/.1).toFixed(3),transform:`scale(${((.9+.1*p)*bump).toFixed(4)})`});
    Object.assign(d.firstChild.style,{transform:`scale(${(1+.16*r).toFixed(4)})`,opacity:(.55*(1-r)).toFixed(3)})}
   if(o.k==='scr-txt'){const on=t>=o.t0&&(o.t1==null||t<o.t1);d.style.visibility=on?'visible':'hidden';if(!on)continue;
    if(!d.firstChild)d.innerHTML='<span class="tx"></span><i class="car"></i>';
    const f=Math.floor(t*FPS+1e-6);let y=o.rows[0][1];for(const[r,yy]of o.rows){if(r<=f)y=yy;else break}
    const n=o.t1e==null?o.text.length:Math.floor(o.text.length*C((t-o.t0)/Math.max(.01,o.t1e-o.t0))+1e-6);
    Object.assign(d.style,{left:pc(o.x,CW),top:pc(y,CH),width:pc(o.w,CW),height:pc(o.h,CH),fontSize:((o.fs||30)/40).toFixed(4)+'em',color:o.color||'#141413',paddingLeft:((o.pad||0)/(o.fs||30)).toFixed(4)+'em',opacity:1});
    d.firstChild.textContent=o.text.slice(0,n);d.lastChild.style.visibility=(o.caretEnd!=null&&t<o.caretEnd)?'visible':'hidden'}
   if(o.k==='scr-blur'){const on=t>=o.t0&&(o.t1==null||t<o.t1);d.style.visibility=on?'visible':'hidden';if(!on)continue;
    if(!d.firstChild)d.innerHTML='<img>';
    const sx=wc.offsetWidth/CW,sy=wc.offsetHeight/CH;Object.assign(d.style,{left:pc(o.x,CW),top:pc(o.y,CH),width:pc(o.w,CW),height:pc(o.h,CH)});
    const im=d.firstChild,src=document.getElementById('si').src;if(im.dataset.src!==src){im.dataset.src=src;im.src=src;try{await im.decode()}catch(e){}}
    Object.assign(im.style,{width:wc.offsetWidth+'px',height:wc.offsetHeight+'px',left:(-o.x*sx).toFixed(2)+'px',top:(-o.y*sy).toFixed(2)+'px',filter:`blur(${((o.b||8)*sx).toFixed(2)}px)`})}
   if(o.k==='scr-rew'){if(!d.firstChild)d.innerHTML='<svg viewBox="0 0 25 16"><path d="M12 1v14L1 8zM24 1v14L13 8z" fill="#fff"/></svg><span></span>';
    Object.assign(d.style,{left:pc(o.x,CW),top:pc(o.y,CH)});
    EG.mat(d,t,o.t0,{dy:26,exit:o.t1,base:'translate(-50%,-50%)'});
    const f=Math.floor(t*FPS+1e-6),v=Math.max(0,Math.round(o.sec[C(f-o.f0,0,o.sec.length-1)]));
    d.lastChild.textContent=Math.floor(v/60)+':'+String(v%60).padStart(2,'0')}
   if(o.k==='scr-lens'){const on=t>=o.t0&&(o.t1==null||t<o.t1+.3);d.style.visibility=on?'visible':'hidden';if(!on)continue;
    if(!d.firstChild)d.innerHTML='<img>';
    const sx=wc.offsetWidth/CW,sy=wc.offsetHeight/CH,R=o.r*sx,m=o.mag||2,out=o.t1==null?0:EG.E.expoIn(C((t-o.t1)/.3)),p=EG.E.expo(C((t-o.t0)/.4));
    Object.assign(d.style,{left:(o.x*sx-R).toFixed(2)+'px',top:(o.y*sy-R).toFixed(2)+'px',width:(2*R).toFixed(2)+'px',height:(2*R).toFixed(2)+'px',
     transform:`scale(${((.55+.45*p)*(1-.4*out)).toFixed(4)})`,opacity:(C((t-o.t0)/.15)*(1-out)).toFixed(3)});
    const im=d.firstChild,src=document.getElementById('si').src;if(im.dataset.src!==src){im.dataset.src=src;im.src=src;try{await im.decode()}catch(e){}}
    Object.assign(im.style,{width:(m*wc.offsetWidth).toFixed(2)+'px',height:(m*wc.offsetHeight).toFixed(2)+'px',left:(R-o.sx*sx*m).toFixed(2)+'px',top:(R-o.sy*sy*m).toFixed(2)+'px'})}
  }});
})();
