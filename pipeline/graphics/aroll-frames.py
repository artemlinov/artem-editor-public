"""aroll-frames.py: the A-roll exactly as the cut plays it, as numbered frames, for a graphic that shows him (the
screen + A-roll card, a picture-in-picture, a still of his face).

  .venv/bin/python pipeline/graphics/aroll-frames.py <t0> <t1> <name> [--width 3840] [--timeline timeline.json]

Times are TIMELINE seconds of work/timeline.json (rebuild it after every cut change). Frames go to
<cache>/frames/<name>/00001.jpg ... one per timeline frame; a frame in a real V1 gap (a full-screen hold) repeats the
previous one so the sequence has no holes. Prints the directory, which a page or scene spec points at.
"""
import json, os, shutil, subprocess, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from job import J, FPS  # noqa: E402

VF = lambda w: f"scale={w}:-2:flags=lanczos:in_color_matrix=bt709:in_range=tv:out_color_matrix=bt601:out_range=pc"


def extract(t0, t1, name, width=3840, timeline="timeline.json"):
    o = J.frames_dir(name, clear=True)
    k0, k1 = round(t0 * FPS), round(t1 * FPS)
    for c in J.timeline(timeline)["v1"]:
        a, b = round(c["start"] * FPS), round(c["end"] * FPS); lo, hi = max(a, k0), min(b, k1)
        if lo >= hi:
            continue
        s0 = round(c["inP"] * FPS) + (lo - a)
        src = c.get("path") or J.cfg["aroll"]          # a piece may come from another camera file (video 13's live section)
        # Each frame is picked by its own timestamp (a window half a frame either side), never by trusting an input seek:
        # seeking to "frame time + 0.5 ms" made ffmpeg start at the NEXT frame, sometimes 2-3 later on HEVC, so every piece
        # ran late and a hand-over to the real camera jumped (found by video 13's progression worker, 2026-11-13).
        n = hi - lo; w0, w1 = (s0 - .5) / FPS, (s0 + n - .5) / FPS
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-copyts", "-ss", f"{max(0, s0 / FPS - 2):.3f}", "-i", src, "-an",
                        "-vf", f"select='gte(t\\,{w0:.5f})*lt(t\\,{w1:.5f})'," + VF(width), "-fps_mode", "passthrough", "-frames:v", str(n),
                        "-q:v", "2", "-start_number", str(lo - k0 + 1), f"{o}/%05d.jpg"], check=True)
    prev = None
    for k in range(1, k1 - k0 + 1):
        p = f"{o}/{k:05d}.jpg"
        if os.path.exists(p):
            prev = p
        elif prev:
            shutil.copy(prev, p)
    print(o, len(os.listdir(o)), "frames for", k1 - k0)
    return o


if __name__ == "__main__":
    a = sys.argv[1:]
    opt = lambda k, d: a[a.index(k) + 1] if k in a else d
    if len(a) < 3:
        sys.exit(__doc__)
    extract(float(a[0]), float(a[1]), a[2], int(opt("--width", 3840)), opt("--timeline", "timeline.json"))
