"""Self-review of a finished render: what the skill's Phase 7 asks for, measured.

 - every line transcribed again from the final file and compared with its text
 - a sheet of frames around every change (A-roll join, graphic in or out, camera move): 2 before, the change, 1 after
 - one- and two-frame glitches anywhere in the video
 - the silences left in the voice, longest first
 - loudness of the final file
"""
import json, os, subprocess
import cv2
import numpy as np
from . import job as J, stt, text as T
from .render import flash_frames


def short_shots(jb, names=None, span=None):
    """Shots on screen for only one or two frames: a graphic coming in or going out a frame away from a cut the viewer
    can see (the A-roll in the open or in a speaker card). `names`: the plan's visuals (default: every render)."""
    cut = json.load(open(jb.p("cut.json")))
    rd, rs = jb.p("renders"), []
    for f in sorted(os.listdir(rd)) if os.path.isdir(rd) else []:
        if f.endswith(".json") and (names is None or f[:-5] in names):
            rs.append(json.load(open(os.path.join(rd, f))))

    def hidden(f):                                    # a full-screen graphic with no speaker card on that frame
        return any(not m["alpha"] and m["f0"] <= f < m["f1"] and str(f) not in (m.get("cards") or {}) for m in rs)
    ch = {c for it in cut["items"] for c in [it["tl"][0]] + [p["tl"][0] for p in it.get("pieces", [])] if not hidden(c)}
    for m in rs:
        ch.update([m["f0"], m["f1"]])
    a0, a1 = span or (0, cut["total"])
    ch = sorted(c for c in ch if 0 < c < cut["total"])
    return [f"SHORT SHOT frames {a}-{b} ({J.tc(jb.f2s(a))}): a shot on screen for only {b - a} frame(s); "
            f"move the graphic's in or out onto the cut" for a, b in zip(ch, ch[1:]) if b - a <= 2 and a0 <= a < a1]


def review(jb, video=None):
    video = video or jb.meta.get("final")
    if not video or not os.path.exists(video):
        raise SystemExit("no finished video: pass its path")
    cut = json.load(open(jb.p("cut.json"))); fps = jb.fps; rv = jb.d("review")
    lines = []
    # 1. words
    a16 = subprocess.run([J.ffmpeg(), "-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                         capture_output=True).stdout
    x = np.frombuffer(a16, np.float32)
    lang = jb.meta.get("language")
    for it in cut["items"]:
        if it["kind"] != "aroll" or not it.get("text"):
            continue
        a, b = it["tl"][0] / fps, it["tl"][1] / fps
        z = np.zeros(4800, np.float32)
        heard, _, _ = stt.transcribe(np.concatenate([z, x[int(a * 16000):int(b * 16000)], z]), language=lang, words=False)
        miss, extra, r = T.diff(it["text"], heard)
        if miss or extra:
            lines.append(f"WORDS {it['id']} {J.tc(float(a))}: " + "; ".join(
                ([f"missing: {' / '.join(miss)}"] if miss else []) + ([f"extra: {' / '.join(extra)}"] if extra else [])))
    # 2-3. one decode pass: small grey frames for glitches, and the frames around every change for the sheets
    changes = set(); gfx = set()
    for it in cut["items"]:
        changes.add(it["tl"][0])
        for p in it.get("pieces", []):
            changes.add(p["tl"][0])
    for f in os.listdir(jb.p("renders")) if os.path.isdir(jb.p("renders")) else []:
        if f.endswith(".json"):
            m = json.load(open(jb.p("renders", f)))
            changes.update([m["f0"], m["f1"]]); gfx.update(range(m["f0"] - 2, m["f1"] + 2))
    changes = sorted(c for c in changes if 2 <= c < cut["total"] - 1)
    want = {c + d for c in changes for d in (-2, -1, 0, 1)}
    W, H = 384, 216
    p = subprocess.Popen([J.ffmpeg(), "-v", "error", "-nostdin"] + J.hwdec() + ["-i", video, "-vf", f"scale={W}:{H}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, bufsize=10 ** 7)
    grey, keep, i = [], {}, 0
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        im = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        grey.append(cv2.resize(im.mean(2).astype(np.float32), (160, 90), interpolation=cv2.INTER_AREA).astype(np.int16))
        if i in want:
            keep[i] = im.copy()
        i += 1
    p.wait()
    d = np.array(grey, np.int16)
    fl = [f for f in flash_frames(d) if f in gfx]    # camera footage alone flags fast hand moves; graphics are what glitch
    for f in fl:
        lines.append(f"GLITCH frame {f} ({J.tc(f / float(fps))}): part of the picture changes for 1-2 frames")
    lines += short_shots(jb)
    sheets = _sheets(rv, changes, keep, fps)
    # 4. silences in the voice
    import soundfile as sf
    v, sr = sf.read(jb.p("voice.wav"), dtype="float32")
    m = v.mean(1) if v.ndim > 1 else v
    hop = sr // 100; nb = len(m) // hop
    lv = 20 * np.log10(np.sqrt((m[:nb * hop].reshape(nb, hop) ** 2).mean(1)) + 1e-9)
    thr = jb.meta.get("levels", {}).get("in", -50)
    sil, st = [], None
    for k, q in enumerate(lv < thr):
        if q and st is None:
            st = k
        elif not q and st is not None:
            if (k - st) >= 30:
                sil.append(((k - st) / 100, st / 100))
            st = None
    sil.sort(reverse=True)
    for dur, at in sil[:12]:
        lines.append(f"SILENCE {dur:.2f}s at {J.tc(at)} (frame {int(at * float(fps))})")
    # 5. loudness
    try:
        import pyloudnorm as pyln
        y, sr = sf.read(jb.p("mix.wav"), dtype="float32")
        lines.append(f"LOUDNESS final {pyln.Meter(sr).integrated_loudness(y):.1f} LUFS, peak {20 * np.log10(np.abs(y).max()):.1f} dBFS; "
                     f"mix stats {jb.meta.get('mix')}")
    except Exception:
        pass
    open(os.path.join(rv, "report.txt"), "w").write("\n".join(lines) + "\n")
    print("\n".join(lines) if lines else "no word, glitch or silence problems found")
    print(f"{len(changes)} changes on {len(sheets)} sheets (2 frames before, the change, 1 after):")
    print("\n".join(sheets))


def _sheets(rv, changes, keep, fps, rows=8):
    from PIL import Image, ImageDraw
    out = []
    for s in range(0, len(changes), rows):
        grp = changes[s:s + rows]
        W, H = 384, 216
        im = Image.new("RGB", (W * 4 + 90, H * len(grp)), "white"); d = ImageDraw.Draw(im)
        for r, c in enumerate(grp):
            d.text((6, r * H + 6), f"f{c}\n{J.tc(c / float(fps))}", fill="black")
            for k, off in enumerate((-2, -1, 0, 1)):
                fr = keep.get(c + off)
                if fr is not None:
                    im.paste(Image.fromarray(fr), (90 + k * W, r * H))
            d.rectangle([90 + 2 * W, r * H, 90 + 3 * W - 1, r * H + H - 1], outline="red", width=2)
        path = os.path.join(rv, f"changes_{s // rows + 1:02d}.jpg")
        im.save(path, quality=80); out.append(path)
    return out
