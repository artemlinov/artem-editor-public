"""scene-build.py: build a screen + A-roll scene page (presets/layouts/screen-aroll) from a spec, ready to render.

  .venv/bin/python pipeline/graphics/scene-build.py <spec.json> [--no-rec] [--no-ar]
  then: node pipeline/graphics/render.mjs <job>/graphics/<id>/index.html <job>/graphics/renders/<id>.mp4 --dur <dur>

spec: {"id", "start": timeline s (work/timeline.json), "dur": s, "layout": {"tIn", "tOut"},
       "keys": [[t, "<recording file>", rec_t], ...],   # page time -> recording time
       "cam": [[t, z, fx, fy, dur], ...],                # camera v2 (presets/graphics/_lib/cam.js); rules in the layout README
       "ov": [...], "crop": {"<file>": "crop=w:h:x:y"}, "timelapse": 25,
       "scale": "3824:2105" (frame size after the crop; change it with "win_h" for a window of another shape),
       "win_h": window height in 1920-wide page px (default 1016.7; the window is re-centred vertically),
       "timeline": "live.json" (a work/ file whose v1 pieces carry their own camera `path`; default timeline.json)}
Consecutive keys on the same file with a later recording time play that stretch, sped up as needed (a wait longer than
`timelapse` x real time holds instead: raise it to 80 for a deliberate time-lapse, rules: long waits time-lapsed with the
camera at rest); a different file, or the same time, holds that frame until the next key.
Recordings come from work/job.json "recordings" (the video's Screen Recordings folder). The default crop removes the
macOS menu bar of a 4K capture. Frames go to the cache; the page goes to <job>/graphics/<id>/index.html.
"""
import json, math, os, shutil, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from job import J, FPS  # noqa: E402

CROP = {"default": "crop=3840:2114:0:40"}
sp = json.load(open(sys.argv[1])); ID = sp["id"]; N = round(sp["dur"] * FPS)
crops = {**CROP, **sp.get("crop", {})}; cap = sp.get("timelapse", 25); SC = sp.get("scale", "3824:2105")
recdir = sp.get("rec_dir") or J.cfg.get("recordings")
rd = os.path.join(J.frames, f"{ID}-rec")
if "--no-rec" not in sys.argv:
    shutil.rmtree(rd, ignore_errors=True); os.makedirs(rd)
    K = sp["keys"]; segs = []
    for i in range(len(K)):
        t0, f0, r0 = K[i]; t1 = K[i + 1][0] if i + 1 < len(K) else sp["dur"] + 1
        f1, r1 = (K[i + 1][1], K[i + 1][2]) if i + 1 < len(K) else (f0, r0)
        k0 = math.ceil(t0 * FPS - 1e-6); k1 = min(N, math.ceil(t1 * FPS - 1e-6))
        if k1 <= k0:
            continue
        moving = f1 == f0 and r1 > r0 + 1e-6 and (r1 - r0) / max(1e-6, t1 - t0) <= cap
        segs.append((k0, k1, f0, r0, r1 if moving else r0, t0, t1))
    tmp = os.path.join(J.frames, f"{ID}-tmp")
    for (k0, k1, f, r0, r1, t0, t1) in segs:
        n = k1 - k0; shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
        cr = crops.get(f, crops["default"]); src = f if os.path.isabs(f) else os.path.join(recdir, f)
        if abs(r1 - r0) < 1e-6:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{r0:.4f}", "-i", src, "-frames:v", "1", "-vf", f"{cr},scale={SC}", "-q:v", "3", f"{tmp}/00001.jpg"], check=True)
            srcs = [f"{tmp}/00001.jpg"] * n
        else:                                          # recording time at output frame k: linear between the keys
            ra = r0 + (r1 - r0) * ((k0 / FPS) - t0) / (t1 - t0); rb = r0 + (r1 - r0) * ((k1 / FPS) - t0) / (t1 - t0); rate = n / max(1e-3, rb - ra)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(0, ra - .02):.4f}", "-i", src, "-t", f"{rb - ra + .05:.4f}", "-vf",
                            f"fps={rate:.6f},{cr},scale={SC}", "-q:v", "3", f"{tmp}/%05d.jpg"], check=True)
            got = sorted(os.listdir(tmp)); srcs = [f"{tmp}/{got[min(len(got) - 1, j)]}" for j in range(n)] if got else []
        for j, s_ in enumerate(srcs):
            shutil.copy(s_, f"{rd}/{k0 + j + 1:05d}.jpg")
    shutil.rmtree(tmp, ignore_errors=True)
    prev = None
    for k in range(1, N + 1):                         # frames no key covers hold the previous one
        p = f"{rd}/{k:05d}.jpg"
        if os.path.exists(p):
            prev = p
        elif prev:
            shutil.copy(prev, p)
ard = os.path.join(J.frames, f"{ID}-ar")
if "--no-ar" not in sys.argv:
    subprocess.run([sys.executable, os.path.join(HERE, "aroll-frames.py"), str(sp["start"]), str(sp["start"] + sp["dur"]), f"{ID}-ar"]
                   + (["--timeline", sp["timeline"]] if sp.get("timeline") else []), check=True)
spec = dict(dur=sp["dur"], layout=sp["layout"], foc=sp.get("foc", [[0, 1, .5, .5]]), cam=sp.get("cam"), ov=sp.get("ov", []), inner=sp.get("inner", False),
            cr=sp.get("cr", 1), ax=sp.get("ax", .40), ay=sp.get("ay", .5), ar=dict(dir=ard, n=len(os.listdir(ard)) if os.path.isdir(ard) else 0), rec=dict(dir=rd, n=N))
WIN = f"LAY.WIN.h={sp['win_h']};LAY.WIN.y=(1080-{sp['win_h']})/2;" if sp.get("win_h") else ""
os.makedirs(os.path.join(J.graphics, ID), exist_ok=True)
page = os.path.join(J.graphics, ID, "index.html")
open(page, "w").write(f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../_lib/eg.css"><link rel="stylesheet" href="../_lib/scene.css"><script src="../_lib/eg.js"></script><script src="../_lib/layout.js"></script><script src="../_lib/cam.js"></script></head><body><div class="stage"><div class="fsbg"></div>
<div class="abs" id="sc"><div id="wn"><div id="wc"><img id="si"><div id="ov"></div></div></div></div><div id="arb"><img id="ari"></div></div>
<script>window.SPEC={json.dumps(spec)};{WIN}</script><script src="../_lib/scene.js"></script></body></html>''')
print(ID, "frames", N, "rec", len(os.listdir(rd)) if os.path.isdir(rd) else 0, "->", page)
