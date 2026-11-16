"""tlsheet.py: what the edit shows at given timeline moments, as one contact sheet, without touching Premiere.

  .venv/bin/python pipeline/review/tlsheet.py <out.jpg> <t> [<t> ...] [--cols 4] [--width 640]
  .venv/bin/python pipeline/review/tlsheet.py <out.jpg> --rows <place.json> [--per 3]     # N moments inside every row of one file
  add --dump to any of them: build the tiles from work/dump.json (the LIVE timeline as last read: every clip on every
  video track, V1 included) instead of the plan. Use it after Artem has edited, or once several passes have piled up.

Each tile is rebuilt from the plan, bottom to top: the A-roll frame the cut plays at t (work/timeline.json), then every
row of work/place/*.json that covers t: V4 rows are opaque full-frame graphics, V5 and up are alpha overlays. Use it to
check a worker's renders in context (is the overlay beside his face, does the hand-off match) before placing them, and
to proof the whole plan after. It shows the plan, not the live timeline: after Artem edits, dump and compare instead.
"""
import glob, json, os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job import J, FPS  # noqa: E402


def rows():
    out = []
    for f in sorted(glob.glob(os.path.join(J.work, "place", "*.json"))):
        d = json.load(open(f))
        if isinstance(d, dict) and "rows" in d:
            out += [r for r in d["rows"] if r["track"].startswith("V")]
    return sorted(out, key=lambda r: int(r["track"][1:]))


def tile(t, R, T, w, out):
    src = next(((p.get("path") or J.cfg["aroll"], p["inP"] + (t - p["start"])) for p in T["v1"] if p["start"] <= t < p["end"]), None)
    inputs, flt = [], []
    if src:
        inputs += ["-ss", f"{src[1]:.4f}", "-i", src[0]]; flt.append(f"[0:v]setpts=PTS-STARTPTS,scale={w}:-2[b0]")
    else:
        inputs += ["-f", "lavfi", "-i", f"color=black:s={w}x{w * 9 // 16}"]; flt.append("[0:v]null[b0]")
    n = 0
    for r in R:
        if r["start"] <= t < (r["end"] or 1e9):
            n += 1; inputs += ["-ss", f"{max(0, t - r['start'] + r.get('in', 0)):.4f}", "-i", r["file"]]
            flt.append(f"[{n}:v]setpts=PTS-STARTPTS,scale={w}:-2[o{n}];[b{n - 1}][o{n}]overlay[b{n}]")   # same clock, or the first frame goes out bare
    lab = f"{int(t // 60)}\\:{t % 60:05.2f}"
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(flt) + f";[b{n}]drawbox=0:0:150:34:black@0.55:fill[v]",
                    "-map", "[v]", "-frames:v", "1", "-q:v", "3", out], check=True)
    return lab


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 2:
        sys.exit(__doc__)
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d
    cols, w = int(opt("--cols", 4)), int(opt("--width", 640)); R = rows(); T = J.timeline()
    if "--dump" in a:                                  # the live timeline: V1 as it is (intro, other cameras), upper tracks as rows
        D = J.dump()
        T = dict(v1=[dict(start=c["start"], end=c["end"], inP=c["inP"], path=c["path"]) for c in D["v"][0]])
        R = [dict(file=c["path"], track=f"V{k + 1}", start=c["start"], end=c["end"], **{"in": c["inP"]}) for k, tr in enumerate(D["v"]) if k for c in tr if not c.get("dis")]
    if "--rows" in a:
        per = int(opt("--per", 3)); ts = []
        for r in json.load(open(opt("--rows", "")))["rows"]:
            if r["track"].startswith("V"):
                d = r["end"] - r["start"]; ts += [r["start"] + d * (k + .7) / per for k in range(per)]
    else:
        skip = {i + 1 for i, x in enumerate(a) if x.startswith("--") and x != "--dump"}   # an option's value is not a time
        ts = [float(x) for i, x in enumerate(a) if i >= 1 and i not in skip and x.replace(".", "").isdigit()]
    tmp = tempfile.mkdtemp()
    for i, t in enumerate(ts):
        tile(t, R, T, w, os.path.join(tmp, f"{i:04d}.jpg"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(tmp, "%04d.jpg"), "-vf", f"tile={cols}x{-(-len(ts) // cols)}", "-q:v", "3", a[0]], check=True)
    print(a[0], " ".join(f"{t:.2f}" for t in ts))
