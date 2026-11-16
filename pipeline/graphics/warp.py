"""warp.py: keep a finished graphic in sync after the cut under it changed (a re-cut, a take swap, a ripple).

  .venv/bin/python pipeline/graphics/warp.py <page.html> <out.html> <old_timeline.json> <new_timeline.json> <old_start> <old_end> [--ar <frames dir>]

The page was timed on the OLD cut, starting at old_start. Every animation keeps its moment relative to his words: the
page's own clock is driven by the old local time of the same source moment (removed silences are skipped, added room
holds). With --ar (A-roll frames on the NEW cut, from aroll-frames.py) the page's "ar" image sequence plays new time
unwarped, so his picture stays in sync. Save the timeline before the change first:
  cp work/timeline.json work/timeline-before-<change>.json, apply the change, dump-live + timeline build, then warp.
Prints the new start, end and duration; render the output with --dur <new dur>.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from timeline import TimeMap  # noqa: E402

a = [x for x in sys.argv[1:]]
ard = a[a.index("--ar") + 1] if "--ar" in a else None
if ard:
    i = a.index("--ar"); del a[i:i + 2]
if len(a) < 6:
    sys.exit(__doc__)
pg, out, old_f, new_f, A, B = a[0], a[1], a[2], a[3], float(a[4]), float(a[5])
M = TimeMap(json.load(open(old_f)), json.load(open(new_f)))
N0, N1 = M(A), M(B)
W = [[round(n0 - N0, 4), round(n1 - N0, 4), round(o0 - A, 4)] for n0, n1, o0 in M.pieces(A, B)]
W = [w for w in W if w[1] > 0 and w[0] < N1 - N0] or [[0, round(N1 - N0, 4), 0]]
nar = len([f for f in os.listdir(ard) if f.endswith(".jpg")]) if ard else 0
inj = f'''<script>(function(){{const W={json.dumps(W)};window.__NEWDUR={N1 - N0:.4f};
function warp(t){{for(const [a,b,o] of W){{if(t<b)return o+Math.max(0,t-a)}}const L=W[W.length-1];return L[2]+(t-L[0])}}
const run=EG.run,fr=EG.frame,sq=EG.seq;
EG.run=(dur,fn)=>run(window.__NEWDUR,t=>{{window.__TNEW=t;return fn(warp(t))}});
{"EG.frame=(img,name,lt,loop)=>fr(img,name,name==='ar'?window.__TNEW:lt,loop);" if ard else ""}
{"EG.seq=(name,dir,n,ext,fps)=>name==='ar'?sq(name," + json.dumps(ard) + "," + str(nar) + ",ext,fps):sq(name,dir,n,ext,fps);" if ard else ""}
}})();</script>'''
s = open(pg).read()
cands = [s.find(k) for k in ("<script>window.SPEC", "<script>\n", "<script>") if s.find(k) >= 0]   # after eg.js, before the page's own script
i = min(cands); s = s[:i] + inj + s[i:]
open(out, "w").write(s)
print(json.dumps(dict(out=out, new_start=round(N0, 4), new_end=round(N1, 4), dur=round(N1 - N0, 4), pieces=len(W))))
