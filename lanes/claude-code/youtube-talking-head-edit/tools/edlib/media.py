"""Frames of other media for graphics pages, single stills, and cleaning a job up."""
import os, shutil
from . import job as J


def frames(jb, src, t0, t1, name, height=None, speed=1.0):
    """Frames of SRC from t0 to t1 (seconds), at the job's frame rate (time-lapsed by `speed`), as
    media/NAME/00001.jpg ... for a page to show as an image sequence (the reliable way to play video in a page)."""
    out = jb.d("media", name)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    vf = [f"setpts=(PTS-STARTPTS)/{speed}"] if speed != 1 else []
    vf.append(f"fps={jb.fps.numerator}/{jb.fps.denominator}")
    if height:
        vf.append(f"scale=-2:{height}:flags=lanczos")
    J.run(J.hwdec() + ["-y", "-ss", f"{t0:.3f}", "-t", f"{t1 - t0:.3f}", "-i", src, "-vf", ",".join(vf),
                       "-q:v", "2", os.path.join(out, "%05d.jpg")])
    n = len([f for f in os.listdir(out) if f.endswith(".jpg")])
    info = J.probe(src)
    print(f"{n} frames -> {out}  (source {info['width']}x{info['height']})")


FACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"


def face_model():
    """OpenCV's YuNet face detector (about 230 KB), downloaded once into the toolkit's cache."""
    p = os.path.join(J.base(), "models", "face_detection_yunet_2023mar.onnx")
    if not os.path.exists(p):
        import ssl, urllib.request
        try:
            import certifi
            ctx = ssl.create_default_context(cafile=certifi.where())
        except ImportError:
            ctx = ssl.create_default_context()
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with urllib.request.urlopen(FACE_URL, context=ctx) as r, open(p + ".part", "wb") as f:
            f.write(r.read())
        os.replace(p + ".part", p)
    return p


def face(jb, frames):
    """Where the speaker's face and eyes are on output frames of the cut (A-roll only), in output pixels: the anchor
    for a punch-in (the point between the eyes) and the crop for a speaker card. Saves a marked still per frame."""
    import json, cv2
    import numpy as np
    from .compose import Reader, _base_map
    cut = json.load(open(jb.p("cut.json"))); base = _base_map(cut)
    rd = Reader(jb.footage, jb.W, jb.H, jb.fps)
    k = max(1, jb.W // 960); sw, sh = jb.W // k, jb.H // k
    det = cv2.FaceDetectorYN.create(face_model(), "", (sw, sh), 0.6)
    sd = jb.d("snaps")
    for f in frames:
        if f >= len(base) or not base[f] or base[f][0] != "a":
            print(f"frame {f}: not A-roll"); continue
        img = rd.get(base[f][1]).copy(); rd.pos = None
        _, faces = det.detect(cv2.resize(img, (sw, sh), interpolation=cv2.INTER_AREA))
        if faces is None or not len(faces):
            print(f"frame {f}: no face found"); continue
        x, y, w, h, rex, rey, lex, ley = max(faces, key=lambda r: r[2] * r[3])[:8]
        ex, ey = (rex + lex) / 2, (rey + ley) / 2; how = "eyes"
        X, Y, Wf, Hf = [int(v * k) for v in (x, y, w, h)]; EX, EY = int(ex * k), int(ey * k)
        cv2.rectangle(img, (X, Y), (X + Wf, Y + Hf), (0, 255, 0), 6); cv2.circle(img, (EX, EY), 18, (0, 0, 255), -1)
        p = os.path.join(sd, f"face_{f:05d}.jpg"); cv2.imwrite(p, cv2.resize(img, (1280, int(1280 * jb.H / jb.W))))
        print(f"frame {f}: between the eyes [{EX}, {EY}] ({how}); face box [{X}, {Y}, {Wf}, {Hf}]  -> {p}")
    rd.close()


def still(src, t, out):
    J.run(["-y", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", out])
    print(out)


def clean(jb):
    freed = 0
    for sub in ("renders", "media", "chunks", "snaps", "previews"):
        p = jb.p(sub)
        if os.path.isdir(p):
            for root, _, files in os.walk(p):
                freed += sum(os.path.getsize(os.path.join(root, f)) for f in files)
            shutil.rmtree(p)
    for f in ("audio16.wav", "audio48.wav", "picture.mp4"):
        p = jb.p(f)
        if os.path.exists(p):
            freed += os.path.getsize(p); os.remove(p)
    print(f"freed {freed / 1e9:.1f} GB in {jb.dir}")
