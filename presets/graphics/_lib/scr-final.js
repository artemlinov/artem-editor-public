// Worker scr, final pass of video 13: three more extras for a screen scene. Load AFTER scr-extra.js and BEFORE scene.js
// (it wraps EG.run once more, so its work is done every frame after the scene's and before scr-extra's own overlays).
// Options in window.SPEC.scr:
//  grade: {t0,d0,t1,d1,con,bri}  the rewind look (rules/look.md: a rewind is black and white and slightly washed out, and
//         the colour comes back as the present resumes). Only the recording image is graded, never the overlays on it:
//         it drains over d0 seconds from t0 and returns, eased, over d1 seconds from t1 (the frames the rewind pill leaves in).
//         Washed out = contrast down by con (default .30) and brightness up by bri (.12): white 95%, black lifted to 17%.
//  rk:    [[frame, r], ...]    the window's corner radius in page px at rest, from that page frame on (a scene that swaps
//         between two apps whose windows have different corners; r is scaled with the camera like LAY.WIN.r).
// Overlay kind, in SPEC.ov with the others (capture units: x of 3824, y of 2105):
//  scr-mag {sx,sy,sw,sh,x,y,mag,t0,t1,hl:[x,y,w,h],thl}: a magnifying glass shaped for a line of text. It shows the
//         sw x sh rectangle of the recording whose top-left is (sx,sy), enlarged mag times, with its own top-left at (x,y);
//         hl = a rectangle of the recording (same units) swiped Everygen blue inside the glass from thl on (default t0).
//         Enters like scr-lens (scale .55 to 1 on expo-out over .4 s, opacity over .15 s); leaves in .3 s from t1.
(function(){
 const C=EG.clamp,CW=3824,CH=2105,FPS=30000/1001,S=(window.SPEC&&window.SPEC.scr)||{};
 const st=document.createElement('style');st.textContent=`
 .o.scr-mag{overflow:hidden;background:#fff;box-shadow:0 0 0 4px #fff,0 0 0 6.5px var(--eg-blue,#0075fd),0 18px 50px rgba(16,48,94,.34),0 3px 10px rgba(16,48,94,.18)}
 .o.scr-mag img{position:absolute;display:block;max-width:none}
 .o.scr-mag b{position:absolute;display:block;background:rgba(0,117,253,.24);mix-blend-mode:multiply;transform-origin:0 50%;border-radius:.12em}`;
 document.head.appendChild(st);
 const run=EG.run;
 EG.run=(dur,fn)=>run(dur,async t=>{await fn(t);
  const P=window.SPEC,ov=document.getElementById('ov'),wc=document.getElementById('wc'),wn=document.getElementById('wn'),si=document.getElementById('si');
  const f=Math.floor(t*FPS+1e-6);
  if(S.rk){let r=S.rk[0][1];for(const[k,rr]of S.rk){if(k<=f)r=rr;else break}wn.style.borderRadius=(r*wn.offsetWidth/LAY.WIN.w).toFixed(2)+'px'}
  if(S.grade){const G=S.grade,a=EG.E.quart(C((t-G.t0)/G.d0)),b=EG.E.inout(C((t-G.t1)/G.d1)),g=t<G.t0?0:a*(1-b);
   si.style.filter=g<.002?'none':`grayscale(${g.toFixed(4)}) contrast(${(1-(G.con??.30)*g).toFixed(4)}) brightness(${(1+(G.bri??.12)*g).toFixed(4)})`}
  for(let i=0;i<P.ov.length;i++){const o=P.ov[i],d=ov.children[i];if(!d||o.k!=='scr-mag')continue;
   const on=t>=o.t0&&(o.t1==null||t<o.t1+.3);d.style.visibility=on?'visible':'hidden';if(!on)continue;
   if(!d.firstChild)d.innerHTML='<img>'+(o.hl?'<b></b>':'');
   const sx=wc.offsetWidth/CW,sy=wc.offsetHeight/CH,m=o.mag||2,W=o.sw*m*sx,H=o.sh*m*sy;
   const out=o.t1==null?0:EG.E.expoIn(C((t-o.t1)/.3)),p=EG.E.expo(C((t-o.t0)/.4));
   Object.assign(d.style,{left:(o.x*sx).toFixed(2)+'px',top:(o.y*sy).toFixed(2)+'px',width:W.toFixed(2)+'px',height:H.toFixed(2)+'px',
    borderRadius:(Math.min(H*.5,(o.rad??30)*m*sy)).toFixed(2)+'px',transformOrigin:(o.ox??.5)*100+'% 50%',
    transform:`scale(${((.55+.45*p)*(1-.4*out)).toFixed(4)})`,opacity:(C((t-o.t0)/.15)*(1-out)).toFixed(3)});
   const im=d.firstChild,src=si.src;if(im.dataset.src!==src){im.dataset.src=src;im.src=src;try{await im.decode()}catch(e){}}
   Object.assign(im.style,{width:(m*wc.offsetWidth).toFixed(2)+'px',height:(m*wc.offsetHeight).toFixed(2)+'px',left:(-o.sx*sx*m).toFixed(2)+'px',top:(-o.sy*sy*m).toFixed(2)+'px'});
   if(o.hl){const h=d.lastChild,[hx,hy,hw,hh]=o.hl,th=o.thl??o.t0;
    Object.assign(h.style,{left:((hx-o.sx)*sx*m).toFixed(2)+'px',top:((hy-o.sy)*sy*m).toFixed(2)+'px',width:(hw*sx*m).toFixed(2)+'px',height:(hh*sy*m).toFixed(2)+'px',
     transform:`scaleX(${EG.E.expo(C((t-th)/.28)).toFixed(4)})`})}
  }});
})();
