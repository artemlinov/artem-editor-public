// Screen + A-roll scene engine (Step 3+): window = a recording retimed to his lines (frames pre-extracted, played in order),
// A-roll card on the right (LAY), camera punches on the window, and overlays in window capture px (3824x2105):
// P.cam (camera v2, graphics/_lib/cam.js) replaces P.foc/P.inner when present.
// hl = highlight swipe, lens = magnifying glass, chip = pill, type = typed text box. window.SPEC drives everything.
(function(){
const P=window.SPEC,$=i=>document.getElementById(i),C=EG.clamp,L=EG.lerp,CW=3824,CH=2105;
EG.seq('ar',P.ar.dir,P.ar.n);EG.seq('rec',P.rec.dir,P.rec.n);
const wn=$('wn'),wc=$('wc'),ov=$('ov');const pct=(x,W)=>(x/W*100).toFixed(4)+'%';
const els=P.ov.map(o=>{const d=document.createElement('div');d.className='o '+o.k;
 if(o.k==='hl'){Object.assign(d.style,{left:pct(o.x,CW),top:pct(o.y,CH),width:pct(o.w,CW),height:pct(o.h,CH),background:o.color||'rgba(0,117,253,.24)'})}
 if(o.k==='lens'){d.innerHTML='<img>';}
 if(o.k==='chip'){d.innerHTML=o.html||o.text;d.classList.add(o.color||'blue')}
 if(o.k==='type'){Object.assign(d.style,{left:pct(o.x,CW),top:pct(o.y,CH),width:pct(o.w,CW),height:pct(o.h,CH),fontSize:((o.fs||40)/40)+'em'});d.innerHTML='<span class="tx"></span><i class="car"></i>'}
 ov.appendChild(d);return d});
function foc(t){const F=P.foc;let z=F[0][1],x=F[0][2],y=F[0][3];for(let i=1;i<F.length;i++){const[s,zz,xx,yy,w]=F[i];z=EG.spring(t,s,z,zz,w||7.5);x=EG.spring(t,s,x,xx,w||7.5);y=EG.spring(t,s,y,yy,w||7.5)}return[z,x,y]}
function path(t,o){let x=o.x,y=o.y;(o.moves||[]).forEach(([s,xx,yy])=>{x=EG.spring(t,s,x,xx,9);y=EG.spring(t,s,y,yy,9)});return[x,y]}
EG.run(P.dur,async t=>{
 const tIn=P.layout.tIn==null?-9:P.layout.tIn,tOut=P.layout.tOut;const v=LAY.u(t,tIn,tOut);
 LAY.aroll($('arb'),$('ari'),v);await EG.frame($('ari'),'ar',t);
 EG.mat($('sc'),t,P.layout.tIn==null?-9:tIn+.10,{exit:tOut==null?null:tOut-.05});
 if(P.cam){const r=CAM.at(t,P.cam);CAM.apply(wn,r);Object.assign(wc.style,{left:'0',top:'0',width:'100%',height:'100%'})}  // camera v2: whole window rect, pos+scale on one ease
 else{const [z,fx,fy]=foc(t);
 if(P.inner){LAY.win(wn,1,.5,.5);const ax=P.ax??.40,ay=P.ay??.5,tx=C(ax-fx*z,(P.cr??1)-z,0),ty=C(ay-fy*z,1-z,0);
  Object.assign(wc.style,{left:(tx*100).toFixed(4)+'%',top:(ty*100).toFixed(4)+'%',width:(z*100).toFixed(4)+'%',height:(z*100).toFixed(4)+'%'})}
 else{LAY.win(wn,z,fx,fy);Object.assign(wc.style,{left:'0',top:'0',width:'100%',height:'100%'})}}
 ov.style.fontSize=(wc.offsetWidth/CW*40).toFixed(3)+'px';await EG.frame($('si'),'rec',t);
 P.ov.forEach((o,i)=>{const d=els[i],on=t>=o.t0&&(o.t1==null||t<o.t1+.3);d.style.visibility=on?'visible':'hidden';if(!on)return;
  const out=o.t1==null?0:EG.E.expoIn(C((t-o.t1)/.3));
  if(o.k==='hl'){d.style.transform=`scaleX(${EG.E.expo(C((t-o.t0)/.28)).toFixed(4)})`;d.style.opacity=(1-out).toFixed(3)}
  if(o.k==='chip'){const p=EG.E.expo(C((t-o.t0)/.35)),b=1+.14*Math.exp(-7*(t-o.t0))*Math.sin(17*(t-o.t0));
   Object.assign(d.style,{left:pct(o.x,CW),top:pct(o.y,CH),transform:`translate(-50%,-50%) scale(${(p*b*(1-.3*out)).toFixed(4)})`,opacity:((C((t-o.t0)/.12))*(1-out)).toFixed(3)})}
  if(o.k==='lens'){const [x,y]=path(t,o),r=o.r,m=o.mag||2.2,p=EG.E.expo(C((t-o.t0)/.4));
   Object.assign(d.style,{left:pct(x-r,CW),top:pct(y-r,CH),width:pct(2*r,CW),height:pct(2*r*CW/CH*CH/CW,CH),transform:`scale(${(p*(1-out*.4)).toFixed(4)})`,opacity:(C((t-o.t0)/.15)*(1-out)).toFixed(3)});
   d.style.height=(2*r/CH*100).toFixed(4)+'%';const im=d.firstChild;im.src=$('si').src;
   Object.assign(im.style,{width:(m*CW/(2*r)*100).toFixed(3)+'%',height:(m*CH/(2*r)*100).toFixed(3)+'%',left:(-(x*m-r)/(2*r)*100).toFixed(3)+'%',top:(-(y*m-r)/(2*r)*100).toFixed(3)+'%'})}
  if(o.k==='type'){const n=Math.floor(o.text.length*C((t-o.t0)/Math.max(.01,(o.t1e??o.t0+1)-o.t0)));d.firstChild.textContent=o.text.slice(0,n);
   d.style.opacity=(EG.E.expo(C((t-o.t0+.15)/.2))*(1-out)).toFixed(3);d.lastChild.style.opacity=(Math.floor(t*2.2)%2===0)?1:0}
 })});
})();
