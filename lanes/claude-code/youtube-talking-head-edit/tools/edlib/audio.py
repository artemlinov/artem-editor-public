"""The footage's sound: 16 kHz mono for speech-to-text, 48 kHz stereo for the mix, and a level map (dBFS every 5 ms)."""
import os
import numpy as np
from . import job as J

HOP = 0.005          # seconds per level-map step


def extract(jb):
    a16, a48 = jb.p("audio16.wav"), jb.p("audio48.wav")
    if not os.path.exists(a16):
        J.run(["-y", "-i", jb.footage, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_f32le", a16])
    if not os.path.exists(a48):
        J.run(["-y", "-i", jb.footage, "-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s24le", a48])
    if not os.path.exists(jb.p("env.npy")):
        x = load16(jb)
        n = int(16000 * HOP)
        k = len(x) // n
        rms = np.sqrt((x[:k * n].reshape(k, n) ** 2).mean(1) + 1e-12)
        np.save(jb.p("env.npy"), (20 * np.log10(rms)).astype(np.float32))
    env = np.load(jb.p("env.npy"))
    live = env[env > -90]                           # digital silence (an empty start) isn't the room's noise floor
    floor = float(np.percentile(live if len(live) else env, 5))
    speech = float(np.percentile(env[env > floor + 20], 75)) if (env > floor + 20).any() else floor + 30
    jb.meta["levels"] = {"floor": round(floor, 1), "speech": round(speech, 1),
                         "in": round(max(-50.0, floor + 6), 1), "out": round(max(-60.0, floor + 3), 1)}
    jb.save()
    return jb.meta["levels"]


_cache = {}


def load16(jb):
    import soundfile as sf
    k = ("16", jb.dir)
    if k not in _cache:
        _cache[k] = sf.read(jb.p("audio16.wav"), dtype="float32")[0]
    return _cache[k]


def load48(jb):
    import soundfile as sf
    k = ("48", jb.dir)
    if k not in _cache:
        _cache[k] = sf.read(jb.p("audio48.wav"), dtype="float32")[0]
    return _cache[k]


def env(jb):
    k = ("env", jb.dir)
    if k not in _cache:
        _cache[k] = np.load(jb.p("env.npy"))
    return _cache[k]


def islands(e, a, b, thr, gap=0.45, minlen=0.25):
    """Stretches of speech between a and b (seconds): above thr dB, split where it stays below for >= gap seconds."""
    i0, i1 = max(0, int(a / HOP)), min(len(e), int(b / HOP))
    act = e[i0:i1] > thr
    out, st, last = [], None, None
    for i, v in enumerate(act):
        if v:
            if st is None:
                st = i
            last = i
        elif st is not None and (i - last) * HOP >= gap:
            out.append((i0 + st, i0 + last + 1))
            st = None
    if st is not None:
        out.append((i0 + st, i0 + last + 1))
    return [(s * HOP, t * HOP) for s, t in out if (t - s) * HOP >= minlen]


def clip16(jb, a, b, pad=0.3):
    """16 kHz samples of source seconds a..b, with `pad` seconds of silence on both sides (Whisper hears edges better)."""
    x = load16(jb)
    seg = x[max(0, int(a * 16000)):max(0, int(b * 16000))]
    z = np.zeros(int(pad * 16000), np.float32)
    return np.concatenate([z, seg, z])
