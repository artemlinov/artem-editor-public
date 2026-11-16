// sbs worker kit (video 13). Shared by the pills / tick overlays and the two side-by-side pages (sbs1, sbs2):
//   SBS.pill(name, size, badge)  the white model pill from 0:02 of the intro (fable-edit/gfx/lib.js chip(): size = font px, 46 there)
//   SBS.chip(name)               the small name chip above a player (same as layout option A/B's chip: 58 px tall)
//   SBS.crown(w), SBS.tick(d)    the winner crown and the green approved tick
//   SBS.players(stage, segs, dir) Opus's edit left, Fable's right, the same scene in both, one quiet scrub bar under the pair
// Everything is a pure function of t; nothing here animates on its own.
window.SBS=(()=>{
const C=EG.clamp,L=EG.lerp;
const SPARK="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z";
document.head.insertAdjacentHTML('beforeend',`<style>
.sbs-pill{display:inline-flex;align-items:center;background:#fff;font-family:var(--eg-font);font-weight:600;color:var(--eg-ink);white-space:nowrap;box-sizing:border-box;letter-spacing:-.01em;
 border:1px solid rgba(16,48,94,.07);box-shadow:0 18px 50px rgba(16,48,94,.18),0 3px 10px rgba(16,48,94,.10)}
.sbs-pill b{margin-left:.5em;font-size:.5em;font-weight:600;color:#fff;background:var(--eg-blue);padding:.38em .7em .32em;border-radius:1em;letter-spacing:.06em}
.sbs-chip{position:absolute;display:flex;align-items:center;gap:12px;height:58px;padding:0 22px 0 18px;border-radius:14px;background:#fff;font:500 27px var(--eg-font);color:var(--eg-ink);
 box-shadow:0 10px 30px rgba(16,48,94,.12),0 1px 3px rgba(16,48,94,.08);white-space:nowrap;box-sizing:border-box}
.sbs-pl{position:absolute;border-radius:16px;overflow:hidden;background:#0b0c10;box-shadow:0 30px 80px rgba(16,48,94,.22),0 3px 10px rgba(16,48,94,.08)}
.sbs-pl img{width:100%;height:100%;object-fit:cover;display:block}
.sbs-pl::after{content:"";position:absolute;inset:0;border-radius:16px;box-shadow:inset 0 0 0 2px rgba(16,48,94,.16)}
.sbs-bar{position:absolute;height:40px;display:flex;align-items:center;gap:18px;font:500 23px var(--eg-font);color:var(--eg-ink);font-variant-numeric:tabular-nums}
.sbs-bar .trk{flex:1;height:6px;border-radius:99px;background:rgba(16,48,94,.13);position:relative}
.sbs-bar .trk i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:var(--eg-blue)}
.sbs-bar .trk u{position:absolute;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px var(--eg-blue),0 4px 10px rgba(0,117,253,.35)}
.sbs-bar .end{color:var(--eg-muted)}
</style>`);
const spark=(s,c='#D97757')=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="display:block;flex:none"><path fill="${c}" d="${SPARK}"/></svg>`;
const pill=(name,size=46,badge='')=>`<div class="sbs-pill" style="font-size:${size}px;padding:${size*.42}px ${size*.78}px ${size*.42}px ${size*.62}px;gap:${size*.36}px;border-radius:${size*1.2}px">${spark(size*1.12)}<span>${name}</span>${badge?`<b>${badge}</b>`:''}</div>`;
const chip=name=>`<div class="sbs-chip">${spark(28)}${name}</div>`;
// crown: the same crown the progression graphic puts on Opus later (prog-graph.js CROWN), so the two crownings rhyme. w = width in px (96 x 80 box)
const crown=(w=96)=>`<svg width="${w}" height="${w*80/96}" viewBox="0 0 96 80" style="display:block;overflow:visible"><defs><linearGradient id="sbscr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD261"/><stop offset="1" stop-color="#FFA41C"/></linearGradient></defs>
<g stroke="#fff" stroke-width="13" stroke-linejoin="round" stroke-linecap="round" fill="#fff"><path d="M14 66 L9 27 L30 44 L48 15 L66 44 L87 27 L82 66 Z"/><circle cx="9" cy="24" r="6"/><circle cx="48" cy="12" r="6"/><circle cx="87" cy="24" r="6"/></g>
<g stroke="url(#sbscr)" stroke-width="5" stroke-linejoin="round" fill="url(#sbscr)"><path d="M14 66 L9 27 L30 44 L48 15 L66 44 L87 27 L82 66 Z"/></g>
<circle cx="9" cy="24" r="6" fill="#FFB224"/><circle cx="48" cy="12" r="6" fill="#FFB224"/><circle cx="87" cy="24" r="6" fill="#FFB224"/>
<rect x="14" y="55" width="68" height="6" rx="3" fill="#fff" opacity=".55"/></svg>`;
// approved tick (the intro's ICON.check), green with a white rim
const tick=(d=64)=>`<svg width="${d}" height="${d}" viewBox="-2 -2 28 28" style="display:block;overflow:visible"><circle cx="12" cy="12" r="13.400" fill="#fff"/><circle cx="12" cy="12" r="11.200" fill="#30A46C"/><path d="M6.900 12.500l3.400 3.400 6.900-7.500" fill="none" stroke="#fff" stroke-width="2.500" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// underdamped pop (0 -> 1 with about 20% overshoot, lands by ~.55 s): for the crown landing and the tick
const pop=(x,w=16,z=.45)=>{if(x<=0)return 0;const wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*x)*(Math.cos(wd*x)+z*w/wd*Math.sin(wd*x))};

// ---- side by side: geometry shared with the other full-screen comparison (do not change) ----
const G={W:824,H:463.5,XO:116,XF:980,CY:560,BW:900,DUR:80.41};
// segs: [{t: local start s, o:[seq name, n], f:[seq name, n], tc: Fable's intro time at the segment start}], dir = frames cache
function players(stage,segs,dir){
 const top=G.CY-G.H/2;
 stage.insertAdjacentHTML('beforeend',`<div class="sbs-pl" id="sbsPO" style="left:${G.XO}px;top:${top}px;width:${G.W}px;height:${G.H}px"><img></div>
<div class="sbs-pl" id="sbsPF" style="left:${G.XF}px;top:${top}px;width:${G.W}px;height:${G.H}px"><img></div>${chip('Opus 5.5')}${chip('Fable 5.2')}
<div class="sbs-bar" style="left:${960-G.BW/2}px;top:${top+G.H+22}px;width:${G.BW}px"><span class="cur">0:00</span><div class="trk"><i></i><u></u></div><span class="end">1:20</span></div>`);
 const q=s=>stage.querySelector(s),pO=q('#sbsPO'),pF=q('#sbsPF'),[cO,cF]=stage.querySelectorAll('.sbs-chip'),bar=q('.sbs-bar'),cur=q('.sbs-bar .cur'),fill=q('.sbs-bar i'),knob=q('.sbs-bar u');
 cO.style.top=cF.style.top=(top-20-58)+'px';let placed=false;
 segs.forEach(s=>{EG.seq(s.o[0],dir+s.o[0],s.o[1]);EG.seq(s.f[0],dir+s.f[0],s.f[1])});
 return async t=>{
  if(!placed){cO.style.left=(G.XO+G.W/2-cO.offsetWidth/2)+'px';cF.style.left=(G.XF+G.W/2-cF.offsetWidth/2)+'px';placed=true}
  let i=0;while(i+1<segs.length&&t>=segs[i+1].t-1e-6)i++;const s=segs[i],lt=Math.max(0,t-s.t);
  await EG.frame(pO.firstChild,s.o[0],lt);await EG.frame(pF.firstChild,s.f[0],lt);
  EG.mat(pO,t,.03);EG.mat(cO,t,.09);EG.mat(pF,t,.13);EG.mat(cF,t,.19);EG.mat(bar,t,.25,{dy:30});
  const tc=s.tc+lt;let p=tc/G.DUR;
  if(i>0){const pr=segs[i-1],x=t-s.t;p+=((pr.tc+(s.t-pr.t))-s.tc)/G.DUR*(1+7.5*x)*Math.exp(-7.5*x)}   // the knob springs to the new scene (house spring)
  cur.textContent=Math.floor(tc/60)+':'+String(Math.floor(tc%60)).padStart(2,'0');
  fill.style.width=(p*100).toFixed(3)+'%';knob.style.left=(p*100).toFixed(3)+'%'}}
return {spark,pill,chip,crown,tick,pop,players,G};
})();
