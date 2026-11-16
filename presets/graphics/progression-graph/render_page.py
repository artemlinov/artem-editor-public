"""render_page.py: a renderable page for one progression-graph appearance (the render-only patches; the preset file is untouched).

  python3 presets/graphics/progression-graph/render_page.py <out.html> '<json params>'
params: {inst, cs:[clause starts..., end] (s from page t=0), W:[word times] (appearance 1 only), copy: bool, copyFrom: s}
Render the page with pipeline/graphics/render.mjs."""
import base64, os, re, sys, json
here=os.path.dirname(os.path.abspath(__file__)); root=os.path.abspath(os.path.join(here,"../../.."))
font=f"{root}/brand/fonts/EverygenNeue/woff2"; b=lambda f: base64.b64encode(open(f,'rb').read()).decode()
s=open(f"{here}/component.src.html").read()
s=s.replace('{{REG}}',b(f'{font}/EverygenNeue-Regular.woff2')).replace('{{MED}}',b(f'{font}/EverygenNeue-Medium.woff2')).replace('{{SEMI}}',b(f'{font}/EverygenNeue-Semibold.woff2'))
s=s.replace('{{AROLL}}',b(f"{here}/aroll-frame.jpg"))
s=re.sub(r'\{\{IMG:([\w.-]+)\}\}',lambda m:b(f"{here}/img/{m.group(1)}"),s)
# render-only patches (the preset file itself is untouched): real clause starts and real word times
a='function clauseStarts(cl){'; assert a in s; s=s.replace(a,a+'if(window.__CS)return window.__CS;')
a='const W=k=>this.starts[0]+k*.3;'; assert a in s; s=s.replace(a,'const W=k=>window.__W?window.__W[k]:this.starts[0]+k*.3;')
P=json.loads(sys.argv[2])
H='''<style>.wrap{max-width:none!important;padding:0!important;margin:0!important;gap:0!important}.wrap>header,.wrap>footer,.dir-head,.controls,.line{display:none!important}
.dir{padding:0!important;border:0!important;border-radius:0!important;background:none!important;gap:0!important}
.frame{position:fixed!important;left:0;top:0;width:1920px!important;height:1080px!important;border-radius:0!important;overflow:hidden}
.stage{transform:none!important}html,body{background:transparent!important;overflow:hidden}
#cp{position:fixed;left:0;top:0;width:1920px;height:1080px;display:none;overflow:hidden;background:#F4F6FB}
#cp .bgx{position:absolute;inset:0;background:radial-gradient(900px 620px at 12% 10%,rgba(0,117,253,.13),transparent 70%),radial-gradient(1000px 700px at 92% 95%,rgba(155,114,203,.13),transparent 70%),#F4F6FB}
#cp .cardx{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:50% 50%;border-radius:44px;overflow:hidden;box-shadow:0 50px 120px rgba(16,48,94,.22),0 4px 12px rgba(16,48,94,.08)}
#cp .cardx .stage{position:absolute!important}
#cp .sh{position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.75) 50%,transparent 65%);mix-blend-mode:screen;opacity:0}
</style><div id="cp"><div class="bgx"></div><div class="cardx" id="c1"></div><div class="cardx" id="c2"><div class="sh" id="sh"></div></div></div>
<script>(async()=>{
 const P=__P__; window.__CS=P.cs; window.__W=P.W||null;
 await new Promise(r=>{const c=()=>window.__stages?r():setTimeout(c,20);c()});
 const s=window.__stages[0]; s.t=0; s.go(P.inst);
 const dt=1001/30000; let sim=0; const seen=new Map();
 const sync=()=>document.getAnimations().forEach(a=>{if(!seen.has(a)){seen.set(a,sim);a.pause()}a.currentTime=Math.max(0,(sim-seen.get(a))*1000)});
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const spring=(t,s0,a,b,w=7.5)=>{if(t<=s0)return a;const x=t-s0;return b+(a-b)*(1+w*x)*Math.exp(-w*x)};
 if(P.copy){ // freeze appearance 1 on its last frame (title included: this is the side visual right after it)
   while(sim<P.copyFrom){s.tick(dt);sim+=dt;sync()} s.render(s.order); sync();
   const st=document.querySelector('.frame .stage'); const c1=document.getElementById('c1'),c2=document.getElementById('c2');
   c1.appendChild(st.cloneNode(true)); c2.insertBefore(st.cloneNode(true),c2.firstChild);
   document.querySelector('.wrap').style.display='none'; document.getElementById('cp').style.display='block';
   window.seek=async t=>{ // shrink into a card, a copy peels off to the right, the composition stays centred
     const k=spring(t,0,1,.40,8.5), sep=spring(t,.42,0,1,7.5);
     const x1=-sep*455, x2=sep*455, r2=sep*2.2, lift=-sep*18;
     c1.style.transform=`translate(${x1}px,0) scale(${k})`;
     c2.style.transform=`translate(${x2}px,${lift}px) rotate(${r2}deg) scale(${k*(1+.03*sep)})`;
     c2.style.boxShadow=`0 ${50+30*sep}px ${120+60*sep}px rgba(0,98,224,${.22+.18*sep}), 0 4px 12px rgba(16,48,94,.08)`;
     const u=clamp((t-.95)/.6); const sh=document.getElementById('sh'); sh.style.opacity=u>0&&u<1?Math.sin(Math.PI*u):0; sh.style.backgroundPosition=`${(1-u)*1920*1.4-600}px 0`;
     sh.style.transform=`translateX(${(u*2.2-1.1)*1920}px)`;
   };
 } else {
   window.seek=async t=>{while(sim+dt/2<t){s.tick(dt);sim+=dt;sync()} s.render(s.order); sync()};
 }
 window.__ready=(async()=>{try{await document.fonts.ready}catch(e){}})();
})();</script>'''
s=s.replace('</body>',H.replace('__P__',json.dumps(P))+'</body>') if '</body>' in s else s+H.replace('__P__',json.dumps(P))
os.makedirs(os.path.dirname(sys.argv[1]),exist_ok=True); open(sys.argv[1],'w').write(s); print(sys.argv[1],len(s))
