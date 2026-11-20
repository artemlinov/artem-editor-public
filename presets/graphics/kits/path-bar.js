// path-bar.js (video 14, worker `path`): the small course bar Artem asked for as an experiment ("i like this… Let's also
// add it in as an experiment. We always can remove if it feels weird"): a white chip, top left, over his camera for the
// whole of a step: the step's badge, its short name, five small segments (this step and the finished ones filled).
// Look: `.chip` of scripts/looks.py (still: review/pass 0…/chapters-C2 course bar stays up during the video.png), with
// narrower segments so every chip stays inside the zone the other graphics keep free (x 115-600; step 5 ends at 609).
// Usage: <div class="stage" id="stage"></div><script>PATHBAR.run(step 1..5, 'in'|'out'|'still')</script>
//   in    16 frames: the chip materializes; this step's segment fills and the badge bumps as it settles (last frame = the still)
//   out   16 frames: the first frame is the still, then the house exit (the mirror of materialize); the last frame is empty
//   still the settled chip (a transparent PNG)
window.PATHBAR=(()=>{
const C=EG.clamp,E=EG.E,FPS=30000/1001,NF=16;
const NAMES=['The right hire?','Equip your team','Team memory','First project','Review their work'];
const CSS=`
.pb{position:absolute;left:115px;top:76px;display:flex;align-items:center;gap:16px;height:64px;padding:0 24px 0 12px;border-radius:32px;background:rgba(255,255,255,.96);
 box-shadow:0 14px 40px rgba(0,0,0,.35);font-size:28px;font-weight:600;color:#1C1E22;white-space:nowrap;box-sizing:border-box}
.pb .badge{width:42px;height:42px;font-size:22px;flex:none}
.pb .bars{display:flex;gap:5px;margin-left:6px}.pb .bars b{position:relative;width:24px;height:8px;border-radius:4px;background:#D9DBE0;overflow:hidden}
.pb .bars b i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:#0075FD}`;
const bump=u=>u<0?1:1+.12*Math.sin(Math.PI*C(u/.27));
function run(step,mode){
 const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
 const el=document.createElement('div');el.className='pb';
 el.innerHTML=`<div class="badge">${step}</div><span>${NAMES[step-1]}</span><div class="bars">${'<b><i></i></b>'.repeat(5)}</div>`;
 document.getElementById('stage').appendChild(el);
 const segs=[...el.querySelectorAll('.bars i')],badge=el.firstChild;
 EG.run(NF/FPS,t=>{
  const s=mode==='in'?t:9;                                          // seconds since the chip began to arrive
  EG.mat(el,s,0,{dy:40,exit:mode==='out'?9+1/FPS:null,exitDy:40});if(mode==='out')EG.mat(el,9+t,0,{dy:40,exit:9+1/FPS,exitDy:40});
  segs.forEach((g,i)=>{g.style.width=(i<step-1?100:i===step-1?100*E.expo(C((s-.18)/.3)):0).toFixed(2)+'%'});
  badge.style.transform=`scale(${bump(s-.2).toFixed(4)})`})}
return {run,NAMES,NF};
})();
