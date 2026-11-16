"""musicmix.py: his voice + the music beds for a span, to judge music level and switches before anything is laid.

  .venv/bin/python pipeline/review/musicmix.py <out.m4a> <t0> <t1> [--beds work/beds.json]

Voice exactly as the cut plays it (work/timeline.json); beds at their planned starts (work/beds.json from
pipeline/sound/beds.py). Times are timeline seconds.
"""
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job import J  # noqa: E402

a = sys.argv[1:]
if len(a) < 3:
    sys.exit(__doc__)
out, t0, t1 = a[0], float(a[1]), float(a[2]); dur = t1 - t0
B = json.load(open(a[a.index("--beds") + 1] if "--beds" in a else J.w("beds.json")))
inp, flt, k = [], [], 0
for p in J.timeline()["v1"]:
    s, e = max(t0, p["start"]), min(t1, p["end"])
    if e - s > .005:
        inp += ["-ss", f"{p['inP'] + (s - p['start']):.4f}", "-t", f"{e - s:.4f}", "-i", J.cfg["aroll"]]; ms = int(round((s - t0) * 1000))
        flt.append(f"[{k}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms}[x{k}]"); k += 1
for b in B.values():
    s, e = max(t0, b["start"]), min(t1, b["start"] + b["len"])
    if e - s > .05:
        inp += ["-ss", f"{s - b['start']:.4f}", "-t", f"{e - s:.4f}", "-i", b["file"]]; ms = int(round((s - t0) * 1000))
        flt.append(f"[{k}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms}[x{k}]"); k += 1
mix = "".join(f"[x{i}]" for i in range(k)) + f"amix=inputs={k}:normalize=0,apad=whole_dur={dur:.3f},atrim=0:{dur:.3f}[o]"
subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-filter_complex", ";".join(flt) + ";" + mix, "-map", "[o]", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out], check=True)
print(out)
