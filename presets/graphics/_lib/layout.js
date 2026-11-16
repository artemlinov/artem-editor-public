// Screen + A-roll layout (preset: presets/layouts/screen-aroll/README.md), measured 2026-11-09 from Artem's reference frame.
// The capture is cropped to the app window (menu bar gone), shown whole with its own corners, ~96% of frame width.
// The A-roll card sits on the RIGHT (he looks to his right at the screen), overlapping the window.
// v1 (framed recording + side card) is kept in layout-v1.js.
window.LAY=(()=>{
 const L=EG.lerp,C=EG.clamp;
 // all numbers in 1920x1080 CSS px (x2 for 4K); CROP is in capture px of a 3840x2160 recording
 const CROP={x:8,y:47,w:3824,h:2105};                      // window edges below the menu bar
 const WIN={x:36.5,y:30,w:1847,h:1847*CROP.h/CROP.w,r:7};  // 96.2% of frame width; r = the window's own corner (14 capture px)
 const CARD={x:1449.5,y:217.5,w:455,h:645,r:14};           // 23.7% x 59.7% of frame, 15.5 px from the right edge, centred vertically
 const WSH='0 22px 48px rgba(16,48,94,.20),0 4px 12px rgba(16,48,94,.10),0 0 0 1px rgba(16,48,94,.07)';
 function g(x,w){return 1-(1+w*x)*Math.exp(-w*x)}
 // in: critically damped spring (w 7.5) from tIn; out: the same spring normalised to land exactly on full frame after T
 function u(t,tIn,tOut,T=.55,w=7.5){let v=t<=tIn?0:g(t-tIn,w);if(tOut!=null&&t>tOut){const x=Math.min(t-tOut,T);v=v*(1-g(x,w)/g(T,w))}return v}
 // A-roll: full frame at v=0, the card at v=1. The face column cx (1920-wide A-roll px) stays centred in the card.
 function aroll(box,img,v,card=CARD,cx=1010){const s=L(1,card.h/1080,v),iw=1920*s,ih=1080*s;
  const bx=L(0,card.x,v),by=L(0,card.y,v),bw=L(1920,card.w,v),bh=L(1080,card.h,v);
  Object.assign(box.style,{left:bx+'px',top:by+'px',width:bw+'px',height:bh+'px',borderRadius:L(0,card.r??28,v)+'px',
   boxShadow:`0 24px 60px rgba(16,48,94,${(.26*v).toFixed(3)}),0 3px 10px rgba(16,48,94,${(.10*v).toFixed(3)})`});
  const ix=L(0,card.x+card.w/2-cx*s,v),iy=L(0,card.y,v);
  Object.assign(img.style,{left:(ix-bx)+'px',top:(iy-by)+'px',width:iw+'px',height:ih+'px'})}
 // The window with a camera punch: zoom z about the window-relative focus (fx, fy), pulled toward frame centre,
 // clamped so the window never shrinks inside its rest rectangle. Returns CSS px per capture px.
 function win(el,z=1,fx=.5,fy=.5){const w=WIN.w*z,h=WIN.h*z;
  const x=C(960-fx*w,WIN.x+WIN.w-w,WIN.x),y=C(540-fy*h,WIN.y+WIN.h-h,WIN.y);
  Object.assign(el.style,{left:x.toFixed(2)+'px',top:y.toFixed(2)+'px',width:w.toFixed(2)+'px',height:h.toFixed(2)+'px',borderRadius:(WIN.r*z).toFixed(2)+'px',boxShadow:WSH});
  return w/CROP.w}
 return {u,aroll,win,CROP,WIN,CARD};
})();
