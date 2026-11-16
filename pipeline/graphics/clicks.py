# /// script
# requires-python = ">=3.10"
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""clicks.py: find WHEN things happen in a screen recording, so a real click sound lands on its frame (rules/sound.md:
the Magic Mouse peak on the frame the click ring appears) and a camera move or pop lands on the change.

  uv run pipeline/graphics/clicks.py rings <frames dir> [fps]                  # macOS click-highlight rings -> JSON list
  uv run pipeline/graphics/clicks.py region <frames dir> <f0> <f1> <x0> <y0> <x1> <y1>   # frames where a box changes
  uv run pipeline/graphics/clicks.py crop <video> <t0> <t1> <x0> <y0> <x1> <y1> [fps]    # change per frame in a box, as a bar

Boxes are fractions of the frame (0-1). Frames dirs are numbered jpgs (scene-build.py's <id>-rec, or ffmpeg -vf fps=...).
`rings` needs the recording made with "show clicks" on (a thin grey ring around the cursor): a ring that was not there
3 frames earlier is a click; consecutive hits at one place are one click (its first frame).
"""
import json, os, subprocess, sys
import numpy as np

FPS = 30000 / 1001


def rings(d, fps=FPS):
    import cv2
    files = sorted(f for f in os.listdir(d) if f.endswith(".jpg")); prev = []; hits = []
    for i, f in enumerate(files):
        im = cv2.imread(os.path.join(d, f), cv2.IMREAD_GRAYSCALE); H, W = im.shape; s = 1600 / W
        g = cv2.GaussianBlur(cv2.resize(im, (1600, int(H * s))), (3, 3), 0)
        c = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1, minDist=40, param1=80, param2=18, minRadius=11, maxRadius=19)
        cur = [] if c is None else [(float(x) / 1600, float(y) / g.shape[0], float(r)) for x, y, r in c[0]]
        old = prev[-3][1] if len(prev) >= 3 else []
        for x, y, r in cur:
            if not any(abs(x - a) < .01 and abs(y - b) < .015 for a, b, _ in old):
                hits.append((i, round(i / fps, 3), round(x, 3), round(y, 3)))
        prev.append((i, cur))
    out = []
    for h in hits:
        if out and h[0] - out[-1]["last"] <= 6 and abs(h[2] - out[-1]["x"]) < .02 and abs(h[3] - out[-1]["y"]) < .03:
            out[-1]["last"] = h[0]; out[-1]["n"] += 1; continue
        out.append(dict(frame=h[0], t=h[1], x=h[2], y=h[3], last=h[0], n=1))
    print(json.dumps([o for o in out if o["n"] >= 2]))


def region(d, f0, f1, x0, y0, x1, y1):
    import cv2
    prev = None; out = []
    for f in range(f0, f1 + 1):
        im = cv2.imread(f"{d}/{f:05d}.jpg", cv2.IMREAD_GRAYSCALE); H, W = im.shape
        r = im[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)].astype(np.int16)
        if prev is not None:
            m = float(np.mean(np.abs(r - prev) > 40))
            if m > .0008:
                out.append((f, round((f - 1) / FPS, 3), round(m, 4)))
        prev = r
    print(out)


def crop(v, t0, t1, x0, y0, x1, y1, fps=FPS):
    W, H = map(int, subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", v],
                                   capture_output=True, text=True).stdout.strip().split(","))
    cx, cy, cw, ch = int(x0 * W), int(y0 * H), int((x1 - x0) * W) // 2 * 2, int((y1 - y0) * H) // 2 * 2; ow, oh = cw // 4, ch // 4
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t0), "-t", str(t1 - t0), "-i", v, "-vf", f"fps={fps},crop={cw}:{ch}:{cx}:{cy},scale={ow}:{oh},format=gray",
                        "-f", "rawvideo", "-"], capture_output=True)
    a = np.frombuffer(r.stdout, np.uint8).reshape(-1, oh, ow).astype(float); prev = None
    for i, f in enumerate(a):
        d = 0 if prev is None else abs(f - prev).mean(); prev = f
        print(f"{t0 + i / fps:8.3f} {d:6.2f} {'#' * int(min(60, d * 4))}")


if __name__ == "__main__":
    a = sys.argv[1:]; cmd = a[0] if a else ""
    if cmd == "rings":
        rings(a[1], float(a[2]) if len(a) > 2 else FPS)
    elif cmd == "region":
        region(a[1], int(a[2]), int(a[3]), *map(float, a[4:8]))
    elif cmd == "crop":
        crop(a[1], float(a[2]), float(a[3]), *map(float, a[4:8]), *(map(float, a[8:9])))
    else:
        print(__doc__)
