// Screen-recording camera (Artem 2026-11-10): subtle moves that GUIDE attention, never isolate the focal point.
// Every move interpolates the window's whole rect (position AND scale) with ONE eased progress, so scale and position
// always share the same timing and easing. Framing is clamped per keyframe (never per frame), so nothing stalls mid-move.
// Keyframes: [t, z, fx, fy, dur?] = at time t start moving to zoom z with focus (fx, fy) (fractions of the window),
// over dur seconds (default .8), Premiere-style ease in/out. z stays subtle: about 1.0-1.3.
window.CAM=(()=>{
 const C=EG.clamp;
 const ease=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;     // ease in/out (cubic), same for every property
 // the rect of the window for zoom z centred (as far as the rest rect allows) on focus (fx,fy) at screen point (cx,cy):
 // cx defaults to the middle of the area left of the A-roll card, so the focus sits where the eye already is.
 // fx=null: the window's rest rect. The right bound is the A-roll card's left edge (minus a gap), not the window's own
 // edge, so a target at the far right of the page can slide into view beside the card (follow the mouse).
 const RB=()=>LAY.CARD.x-24;
 // o.rb: right bound override (a full-window scene with no A-roll card passes LAY.WIN.x+LAY.WIN.w, with cx 960)
 function rect(z,fx,fy,cx=742,cy=540,rb){const W=LAY.WIN,w=W.w*z,h=W.h*z;
  if(fx==null)return {x:W.x+(W.w-w)/2,y:W.y+(W.h-h)/2,w,h};
  return {x:C(cx-fx*w,Math.min(W.x,(rb??RB())-w),W.x),y:C(cy-fy*h,W.y+W.h-h,W.y),w,h}}
 function at(t,K,o={}){let r=rect(K[0][1],K[0][2],K[0][3],o.cx,o.cy,o.rb);
  for(let i=1;i<K.length;i++){const[s,z,fx,fy,d=.8]=K[i];if(t<=s)break;const q=rect(z,fx,fy,o.cx,o.cy,o.rb),u=ease(C((t-s)/d));
   r={x:r.x+(q.x-r.x)*u,y:r.y+(q.y-r.y)*u,w:r.w+(q.w-r.w)*u,h:r.h+(q.h-r.h)*u}}
  return r}
 function apply(el,r){const z=r.w/LAY.WIN.w;Object.assign(el.style,{left:r.x.toFixed(2)+'px',top:r.y.toFixed(2)+'px',width:r.w.toFixed(2)+'px',height:r.h.toFixed(2)+'px',
  borderRadius:(LAY.WIN.r*z).toFixed(2)+'px',boxShadow:'0 22px 48px rgba(16,48,94,.20),0 4px 12px rgba(16,48,94,.10),0 0 0 1px rgba(16,48,94,.07)'});return z}
 return {rect,at,apply,ease};
})();
