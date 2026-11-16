"""reviewmix.py: the LIVE timeline's audio for a span, rebuilt offline, to try sound changes before laying them.

  .venv/bin/python pipeline/review/reviewmix.py <t0> <t1> <out.wav> [<extra cues.json>] [--drop <file>@<start>,...]

From work/dump.json (dump-live.py): A1 = his voice from the camera file; every other audio clip with its Volume level
(keyframes: the value at the span start) plus its Clip Gain from work/prproj-audit.json (prproj-audit.py --json).
--drop leaves clips out; extra cues [{file, start, in, dur, db}] are mixed in: hear a fix before it is laid.
"""
import json, math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job import J  # noqa: E402

a = sys.argv[1:]
if len(a) < 3:
    sys.exit(__doc__)
t0, t1, out = float(a[0]), float(a[1]), a[2]
extra = json.load(open(a[3])) if len(a) > 3 and not a[3].startswith("--") else []
drop = set(a[a.index("--drop") + 1].split(",")) if "--drop" in a else set()
D = J.dump(); G = {}
if os.path.exists(J.w("prproj-audit.json")):
    for k, s, e, n, db in json.load(open(J.w("prproj-audit.json")))["gain"]:
        G[(k, round(s, 2))] = db
else:
    print("no work/prproj-audit.json: Clip Gain ignored (run lanes/premiere/prproj-audit.py --json)", file=sys.stderr)


def level(c, t):
    for co in c["comps"]:
        if co["n"] == "Volume":
            for p in co["p"]:
                if p["n"] == "Level":
                    if isinstance(p.get("v"), (int, float)) and p["v"] > 0:
                        return 20 * math.log10(p["v"]) + 15
                    if p.get("keys"):
                        mt = c["inP"] + (t - c["start"]); k = [x for x in p["keys"] if x[0] <= mt]; v = (k[-1] if k else p["keys"][0])[1]
                        return 20 * math.log10(v) + 15
    return 0


items = []
for ti, tr in enumerate(D["a"]):
    for c in tr:
        if c["end"] <= t0 or c["start"] >= t1 or c.get("dis"):
            continue
        f = c.get("path") or ""
        if f"{os.path.basename(f)}@{round(c['start'], 2)}" in drop:
            continue
        src = J.cfg["aroll"] if ti == 0 else f; s = max(t0, c["start"])
        g = 0 if ti == 0 else G.get((f"A{ti + 1}", round(c["start"], 2)), 0) + level(c, s)
        items.append(dict(file=src, inp=c["inP"] + (s - c["start"]), dur=min(t1, c["end"]) - s, at=s - t0, db=g))
for e in extra:
    if e["start"] + e["dur"] <= t0 or e["start"] >= t1:
        continue
    s = max(t0, e["start"]); items.append(dict(file=e["file"], inp=e.get("in", 0) + (s - e["start"]), dur=min(t1, e["start"] + e["dur"]) - s, at=s - t0, db=e["db"]))
args = ["ffmpeg", "-v", "error", "-y"]; fc = []
for i, it in enumerate(items):
    args += ["-ss", f"{it['inp']:.4f}", "-t", f"{it['dur']:.4f}", "-i", it["file"]]; ms = int(it["at"] * 1000)
    fc.append(f"[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume={it['db']:.2f}dB,adelay={ms}|{ms}[a{i}]")
fc.append("".join(f"[a{i}]" for i in range(len(items))) + f"amix=inputs={len(items)}:normalize=0:duration=longest,atrim=0:{t1 - t0:.4f},alimiter=limit=0.89[o]")
subprocess.run(args + ["-filter_complex", ";".join(fc), "-map", "[o]", "-ar", "48000", out], check=True)
print(out, len(items), "clips")
