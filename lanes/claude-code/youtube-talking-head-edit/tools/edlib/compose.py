"""The final picture: the cut (A-roll pieces and played clips), camera moves on the A-roll, rendered graphics on top
(full-screen or transparent overlays, with the live A-roll filled into any speaker card), muxed with the mix.

PLAN.json:
  {"visuals": ["V01", "V02", ...],            renders by name, in stacking order (later on top)
   "camera":  [{"f0": 300, "f1": 420, "keys": [[300, 1.0], [360, 1.06]], "anchor": [1920, 820]}],
                                              scale keys eased in between (anchor: the point that stays put, in
                                              output pixels, e.g. between the eyes)
   "audio": "mix.wav"}                        default: the job's mix.wav, else voice.wav
The video is built in parallel chunks on this computer's disk, then written once to --out (default: next to the footage).
"""
import json, os, subprocess, sys, time
import numpy as np
from . import job as J


def _encoder(W, H):
    rate = max(12, int(50 * W * H / (3840 * 2160)))
    if sys.platform == "darwin":
        return ["-c:v", "h264_videotoolbox", "-b:v", f"{rate}M", "-maxrate", f"{int(rate * 1.4)}M", "-profile:v", "high"]
    for enc in ("h264_nvenc", "h264_qsv", "h264_amf"):
        t = subprocess.run([J.ffmpeg(), "-v", "error", "-f", "lavfi", "-i", "color=s=256x256:d=0.1", "-c:v", enc, "-f", "null", "-"],
                           capture_output=True)
        if t.returncode == 0:
            return ["-c:v", enc, "-b:v", f"{rate}M"]
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17"]


class Reader:
    """Sequential frames of a file from a given frame on (seeks only when a jump is needed)."""

    def __init__(self, path, W, H, fps, alpha=False, fit=False, scale=False):
        self.path, self.W, self.H, self.fps, self.alpha, self.fit, self.scale = path, W, H, fps, alpha, fit, scale
        self.ch = 4 if alpha else 3
        self.p = None; self.pos = None; self.last = None

    def _open(self, f):
        if self.p:
            self.p.kill()
        vf = []
        if self.fit:
            vf = [f"fps={self.fps.numerator}/{self.fps.denominator}",
                  f"scale={self.W}:{self.H}:force_original_aspect_ratio=decrease",
                  f"pad={self.W}:{self.H}:(ow-iw)/2:(oh-ih)/2"]
        elif self.scale:
            vf = [f"scale={self.W}:{self.H}"]          # a render at another size never misreads as tiles
        t = max(0.0, (f - 0.5) / float(self.fps))
        cmd = [J.ffmpeg(), "-v", "error", "-nostdin"] + ([] if self.alpha else J.hwdec()) + ["-ss", f"{t:.6f}", "-i", self.path]
        if vf:
            cmd += ["-vf", ",".join(vf)]
        cmd += ["-f", "rawvideo", "-pix_fmt", "bgra" if self.alpha else "bgr24", "-"]
        self.p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10 ** 8)
        self.pos = f

    def get(self, f):
        if self.pos is None or f < self.pos or f > self.pos + 8:
            self._open(f)
        n = self.W * self.H * self.ch
        while self.pos <= f:
            buf = self.p.stdout.read(n)
            if len(buf) == n:
                self.last = np.frombuffer(buf, np.uint8).reshape(self.H, self.W, self.ch)
            elif self.last is None:
                self.last = np.zeros((self.H, self.W, self.ch), np.uint8)
            self.pos += 1
        return self.last

    def close(self):
        if self.p:
            self.p.kill()


def _ease(t):
    return t * t * (3 - 2 * t)


def _cam(cams, f):
    for c in cams:
        if c["f0"] <= f < c["f1"]:
            ks = sorted(c["keys"])
            if f <= ks[0][0]:
                s = ks[0][1]
            elif f >= ks[-1][0]:
                s = ks[-1][1]
            else:
                for (fa, sa), (fb, sb) in zip(ks, ks[1:]):
                    if fa <= f <= fb:
                        s = sa + (sb - sa) * _ease((f - fa) / max(1, fb - fa)); break
            return s, c["anchor"]
    return 1.0, None


_masks = {}


def _mask(w, h, r):
    import cv2
    k = (w, h, r)
    if k not in _masks:
        S = 4
        m = np.zeros((h * S, w * S), np.uint8); rr = max(1, min(int(r * S), w * S // 2, h * S // 2))
        cv2.rectangle(m, (rr, 0), (w * S - rr, h * S), 255, -1); cv2.rectangle(m, (0, rr), (w * S, h * S - rr), 255, -1)
        for x, y in ((rr, rr), (w * S - rr, rr), (rr, h * S - rr), (w * S - rr, h * S - rr)):
            cv2.circle(m, (x, y), rr, 255, -1)
        _masks[k] = (cv2.resize(m, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255)[..., None]
    return _masks[k]


def _paste_card(frame, src, card, k):
    import cv2
    H, W = src.shape[:2]
    if isinstance(card, (list, tuple)):              # [x, y, w, h, r] or [x, y, w, h, r, cx, cy, cw, ch] (crop in source px)
        c = {"x": card[0], "y": card[1], "w": card[2], "h": card[3], "r": card[4] if len(card) > 4 else 0}
        if len(card) >= 9:
            c["crop"] = [card[5] / W, card[6] / H, card[7] / W, card[8] / H]
        card = c
    x, y, w, h = [int(round(card[q] * k)) for q in ("x", "y", "w", "h")]
    r = card.get("r", 0) * k
    if w < 4 or h < 4:
        return frame
    cx, cy, cw, ch = card.get("crop") or [0, 0, 0, 0]
    if not cw:                                        # default: the full height, centred, at the card's shape
        ch = 1.0; cw = min(1.0, (w / h) * H / W); cx = (1 - cw) / 2; cy = 0
    sx, sy, sw, sh = int(cx * W), int(cy * H), max(2, int(cw * W)), max(2, int(ch * H))
    crop = src[sy:sy + sh, sx:sx + sw]
    crop = cv2.resize(crop, (w, h), interpolation=cv2.INTER_AREA if sw > w else cv2.INTER_LINEAR)
    FH, FW = frame.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(FW, x + w), min(FH, y + h)
    if x1 <= x0 or y1 <= y0:
        return frame
    m = _mask(w, h, r)[y0 - y:y1 - y, x0 - x:x1 - x]
    reg = frame[y0:y1, x0:x1].astype(np.float32)
    frame[y0:y1, x0:x1] = (crop[y0 - y:y1 - y, x0 - x:x1 - x] * m + reg * (1 - m)).astype(np.uint8)
    return frame


def _base_map(cut):
    """Per output frame: ('a', source frame) for A-roll, ('c', item index, frame in clip) for a played clip."""
    m = [None] * cut["total"]
    for k, it in enumerate(cut["items"]):
        if it["kind"] == "aroll":
            for p in it["pieces"]:
                for i in range(p["tl"][1] - p["tl"][0]):
                    m[p["tl"][0] + i] = ("a", p["src"][0] + i)
        else:
            for i in range(it["tl"][1] - it["tl"][0]):
                m[it["tl"][0] + i] = ("c", k, i)
    for it in cut["items"]:                           # pic_lead: the picture of a line cuts in n frames before its sound
        n = it.get("pic_lead", 0)
        if it["kind"] == "aroll" and n > 0:
            p = it["pieces"][0]
            for i in range(1, n + 1):
                if p["tl"][0] - i >= 0:
                    m[p["tl"][0] - i] = ("a", p["src"][0] - i)
    return m


def chunk(jbdir, plan_path, c0, c1, out):
    """One process: frames c0..c1 of the final picture into `out`."""
    import cv2
    jb = J.Job(jbdir); W, H, fps = jb.W, jb.H, jb.fps; k = W / 1920
    cut = json.load(open(jb.p("cut.json"))); plan = json.load(open(plan_path))
    base = _base_map(cut)
    vis = []
    for v in plan.get("visuals", []):
        name = v if isinstance(v, str) else v["name"]
        meta = json.load(open(jb.p("renders", f"{name}.json")))
        if not isinstance(v, str):
            meta["f0"], meta["f1"] = v.get("f0", meta["f0"]), v.get("f1", meta["f1"])
        meta["reader"] = None
        vis.append(meta)
    cams = plan.get("camera", [])
    aroll = Reader(jb.footage, W, H, fps)
    clips = {}
    enc = subprocess.Popen([J.ffmpeg(), "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
                            "-r", f"{fps.numerator}/{fps.denominator}", "-i", "-"] + _encoder(W, H) +
                           ["-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", out],
                           stdin=subprocess.PIPE)
    black = np.zeros((H, W, 3), np.uint8)
    for f in range(c0, c1):
        on = [v for v in vis if v["f0"] <= f < v["f1"]]
        full = [v for v in on if not v["alpha"]]
        top_full = full[-1] if full else None
        need_base = top_full is None or str(f) in top_full["cards"] or any(str(f) in v["cards"] for v in on)
        src = None
        if need_base and f < len(base) and base[f]:
            b = base[f]
            if b[0] == "a":
                src = aroll.get(b[1])
            else:
                it = cut["items"][b[1]]
                if b[1] not in clips:
                    clips[b[1]] = (Reader(it["file"], W, H, fps, fit=True), int(round(it["src_s"][0] * fps)))
                rd, off = clips[b[1]]
                src = rd.get(off + b[2])
        if top_full is None:
            frame = src.copy() if src is not None else black.copy()
            s, anc = _cam(cams, f)
            if abs(s - 1) > 1e-4 and anc is not None:
                ax, ay = anc
                M = np.array([[s, 0, ax - ax * s], [0, s, ay - ay * s]], np.float32)
                frame = cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            layers = on
        else:
            layers = on[on.index(top_full):]
            frame = None
        for v in layers:
            if v["reader"] is None:
                v["reader"] = Reader(v["file"], W, H, fps, alpha=v["alpha"], scale=True)
            img = v["reader"].get(f - v["f0"])
            if v["alpha"]:
                a = img[..., 3:4].astype(np.float32) / 255
                frame = (img[..., :3] * a + frame * (1 - a)).astype(np.uint8) if frame is not None else img[..., :3].copy()
            else:
                frame = img.copy()
            c = v["cards"].get(str(f))
            if c and src is not None:
                frame = _paste_card(frame, src, c, k)
        if frame is None:
            frame = black
        enc.stdin.write(np.ascontiguousarray(frame).tobytes())
    enc.stdin.close(); enc.wait()
    aroll.close()
    for v in vis:
        if v["reader"]:
            v["reader"].close()


def compose(jb, plan_path, out=None, workers=None, span=None):
    """span=(f0, f1): build only that part (a preview with its sound), into the job's previews/ folder."""
    cut = json.load(open(jb.p("cut.json")))
    total = cut["total"]
    plan_path = os.path.abspath(plan_path)
    plan = json.load(open(plan_path))
    n = workers or max(2, min(6, (os.cpu_count() or 4) // 2))
    cd = jb.d("chunks")
    for f in os.listdir(cd):
        os.remove(os.path.join(cd, f))
    a0, a1 = span or (0, total)
    a1 = min(a1, total)
    n = max(1, min(n, (a1 - a0) // 30))
    bounds = [a0 + round((a1 - a0) * i / n) for i in range(n + 1)]
    t = time.time()
    procs, files = [], []
    for i in range(n):
        fl = os.path.join(cd, f"c{i:02d}.mp4"); files.append(fl)
        procs.append(subprocess.Popen([sys.executable, os.path.join(os.path.dirname(os.path.dirname(__file__)), "ed.py"),
                                       "_chunk", jb.dir, plan_path, str(bounds[i]), str(bounds[i + 1]), fl]))
    if any(p.wait() for p in procs):
        raise SystemExit("a compose chunk failed")
    lst = os.path.join(cd, "list.txt")
    open(lst, "w").write("".join(f"file '{os.path.basename(f)}'\n" for f in files))
    pic = jb.p("picture.mp4")
    J.run(["-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", pic])
    audio = plan.get("audio") or ("mix.wav" if os.path.exists(jb.p("mix.wav")) else "voice.wav")
    audio = audio if os.path.isabs(audio) else jb.p(audio)
    if span:
        out = out or os.path.join(jb.d("previews"), f"preview_{a0}-{a1}.mp4")
    elif out is None:
        fd = os.path.dirname(jb.footage); stem = os.path.splitext(os.path.basename(jb.footage))[0]
        out = os.path.join(fd, f"{stem} - edit.mp4")
    mux = ["-y", "-i", pic, "-ss", f"{a0 / float(jb.fps):.4f}", "-i", audio, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
           "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart"]
    try:
        J.run(mux + [out])
    except Exception:
        out2 = jb.p("final.mp4")
        J.run(mux + [out2])
        print(f"Could not write {out}; the finished video is at {out2}")
        out = out2
    dt = time.time() - t
    print(f"{'preview' if span else 'final'}: {out}  ({J.tc((a1 - a0) / float(jb.fps))}, {a1 - a0} frames, "
          f"built in {dt:.0f}s with {n} at once)")
    from .review import short_shots
    for s in short_shots(jb, plan.get("visuals"), (a0, a1)):
        print(s)
    if not span:
        jb.meta["final"] = out; jb.save()
