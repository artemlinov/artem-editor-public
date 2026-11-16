// Everygen graphics runtime: deterministic seek(t); materialize per presets/motion/README.md
window.EG=(()=>{
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
function bez(x1,y1,x2,y2){const cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
 const X=t=>((ax*t+bx)*t+cx)*t,Y=t=>((ay*t+by)*t+cy)*t,dX=t=>(3*ax*t+2*bx)*t+cx;
 return u=>{if(u<=0)return 0;if(u>=1)return 1;let t=u;for(let i=0;i<8;i++){const d=dX(t);if(Math.abs(d)<1e-6)break;t-=(X(t)-u)/d}return Y(clamp(t))}}
const E={expo:bez(.16,1,.3,1),quart:bez(.165,.84,.44,1),k4090:bez(.4,0,.1,1),media:bez(.4,0,.2,1),lin:u=>u,
  expoIn:bez(.7,0,.84,0),inout:bez(.65,0,.35,1)};
// materialize (house entrance) + its mirror as the exit: rise 56px, scale .94, blur 12px, opacity over first 30%, 0.5 s expo-out
function mat(el,t,s,o={}){const dy=o.dy??56,s0=o.s0??.94,bl=o.blur??12,dur=o.dur??.5;
 let p=clamp((t-s)/dur),e=E.expo(p),op=clamp(p/.3),y=(1-e)*dy,sc=s0+(1-s0)*e,b=(1-e)*bl;
 if(o.exit!=null&&t>o.exit){const q=clamp((t-o.exit)/(o.exitDur??.42)),f=E.expoIn(q);y+=f*(o.exitDy??dy);sc*=1-(1-s0)*f;b+=f*bl;op*=1-clamp(q*1.15)}
 el.style.opacity=op.toFixed(4);el.style.transform=(o.base||'')+` translateY(${y.toFixed(2)}px) scale(${sc.toFixed(4)})`;el.style.filter=b>.05?`blur(${b.toFixed(2)}px)`:'none';
 el.style.visibility=op<=0.001?'hidden':'visible';return op}
// spring re-layout (critically damped, w=7.5) as a closed form from a to b starting at s
function spring(t,s,a,b,w=7.5){if(t<=s)return a;const x=t-s;return b+(a-b)*(1+w*x)*Math.exp(-w*x)}
// image sequences: seqs[name]={dir,n,ext,fps}; frame(el,name,localTime)
const SEQ={};function seq(name,dir,n,ext='jpg',fps=30000/1001){SEQ[name]={dir,n,ext,fps}}
async function frame(img,name,lt,loop=false){const q=SEQ[name];let i=Math.floor(Math.max(0,lt)*q.fps+1e-6);i=loop?i%q.n:Math.min(q.n-1,i);
 const src=`${q.dir}/${String(i+1).padStart(5,'0')}.${q.ext}`;if(img.dataset.src!==src){img.dataset.src=src;img.src=src;try{await img.decode()}catch(e){}}}
function run(dur,fn){window.DUR=dur;window.seek=async t=>{await fn(t)};
 window.__ready=(async()=>{try{await document.fonts.ready}catch(e){};await Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{})));await fn(0)})();
 if(!window.__RENDER){window.__ready.then(()=>{const t0=performance.now();const loop=async()=>{await fn(((performance.now()-t0)/1000)%dur);requestAnimationFrame(loop)};loop()})}}
return {clamp,lerp,bez,E,mat,spring,seq,frame,run};
})();
