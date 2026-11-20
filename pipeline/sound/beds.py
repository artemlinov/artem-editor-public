"""beds.py: music beds from a plan, at Artem's level, ready to lay on the music track (rules/sound.md, Music).

  .venv/bin/python pipeline/sound/beds.py [work/beds-plan.json]     # -> <job>/music/<key>.wav + work/beds.json

NO remix: one song per block from its first line, a start offset at most, ending either with a dry cut into a reverb
throw on its cue (the transitional line then plays over the tail) or with the song's own ending.

beds-plan.json: [{"key": "bed-step2", "song": "song5-step2.wav" (in <job>/music), "start": timeline s,
                  "offset": song s to start from (default 0),
                  "cue": timeline s of the dry cut into reverb  |  "len": s of the song to play (its own ending),
                  "fade": s, with "cue": fade out over that long, silent by the cue, instead of the dry cut,
                  "ref": [song s, song s] a typical stretch of the body, for the level,
                  "target": -39 (calm) | -41..-43 (higher energy),
                  "lift": song s, the quiet intro is lifted until here (to within ~4 dB of the body),
                  "spans": [[bed s, bed s, margin dB], ...] other quiet stretches to lift,
                  "card": [timeline s of the first word after a chapter card] the music comes UP through the card}]
Chapter cards (video 14, his own keys on the first one: "See how I raise the music here slightly so please do the same for
other transitional segments"): a bed that starts on a chapter card plays +6.7 dB from its start and comes back to its level
from 0.375 s before his first word to 0.315 s after it (linear in dB).
Level: the body's 85th-percentile 0.5 s RMS lands on `target` dBFS (video 12: -39 calm, ~19 dB under speech).
Lay the result with lanes/premiere/place-rows.py (bin "Music", the music track); judge it with pipeline/review/musicmix.py.
"""
import json, os, sys, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job import J  # noqa: E402

SR = 48000
CARD_LIFT_DB = 6.73


def load(f):
    w = wave.open(f); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32).reshape(-1, w.getnchannels()) / 32768
    if w.getframerate() != SR:
        sys.exit(f"{f}: {w.getframerate()} Hz, expected {SR} (convert with ffmpeg -ar 48000)")
    return a if a.shape[1] == 2 else np.repeat(a, 2, 1)


def _ir(rt=2.6, seed=7):
    """A dark plate reverb: decaying noise through a one-pole lowpass, 12 ms pre-delay."""
    rng = np.random.default_rng(seed); n = int(rt * SR); t = np.arange(n) / SR
    x = rng.standard_normal((n, 2)) * np.exp(-6.91 * t / rt)[:, None]; y = np.zeros_like(x); a = .82
    for c in range(2):
        prev = 0.0; col = x[:, c]
        for i in range(n):
            prev = a * prev + (1 - a) * col[i]; y[i, c] = prev
    y[:int(.012 * SR)] = 0
    return y / np.sqrt((y ** 2).sum(0)).max()


_IR = None


def conv(x, h):
    n = len(x) + len(h) - 1; N = 1 << (n - 1).bit_length()
    return np.stack([np.fft.irfft(np.fft.rfft(x[:, c], N) * np.fft.rfft(h[:, c], N), N)[:n] for c in range(2)], 1)


def throw(y, cut, send=.6, wet_db=-4):
    """Dry cut at sample `cut` with a reverb throw of the last `send` seconds ringing on after it."""
    global _IR
    _IR = _ir() if _IR is None else _IR
    f = int(.015 * SR); y = y[:cut].copy(); y[cut - f:cut] *= np.linspace(1, 0, f)[:, None]
    s = int(send * SR); snd = y[cut - s:cut] * np.linspace(.3, 1, s)[:, None]
    wet = conv(snd, _IR) * 10 ** (wet_db / 20); out = np.zeros((cut + len(wet), 2), np.float32)
    out[:cut] = y[:cut]; out[cut - s:cut - s + len(wet)] += wet
    return out


def rms_db(a, w=.5):
    n = int(w * SR); return np.array([20 * np.log10(np.sqrt((a[i:i + n] ** 2).mean()) + 1e-9) for i in range(0, len(a) - n, n)])


def body_db(a):
    return float(np.percentile(rms_db(a), 85))


def lift(y, target, t0, t1, margin, ramp=.8):
    """Raise a quiet stretch [t0, t1] s toward target-margin (about 2 s smoothing), ramped in and out over `ramp` s."""
    env = rms_db(y, .25); k = np.convolve(env, np.ones(8) / 8, mode="same"); t = np.arange(len(env)) * .25
    g_db = np.clip((target - margin) - k, 0, 24) * np.clip(np.minimum((t - t0) / ramp + 1, (t1 - t) / ramp), 0, 1) * ((t >= t0 - ramp) & (t <= t1))
    return y * np.interp(np.arange(len(y)) / SR, t + .125, 10 ** (g_db / 20))[:, None]


def write(p, y):
    w = wave.open(p, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()


def bake(b):
    song = load(os.path.join(J.music, b["song"])); off = b.get("offset", 0.0)
    ref = song[int(b["ref"][0] * SR):int(b["ref"][1] * SR)] if "ref" in b else song
    if "cue" in b and b.get("fade"):               # a fade-out that is over by the cue (his note: music gone before a joke lands)
        cut = int((b["cue"] - b["start"]) * SR); y = song[int(off * SR):int(off * SR) + cut].copy(); f = int(b["fade"] * SR)
        y[cut - f:] *= (np.cos(np.linspace(0, np.pi, f)) * .5 + .5)[:, None]
    elif "cue" in b:
        cut = int((b["cue"] - b["start"]) * SR); y = throw(song[int(off * SR):int(off * SR) + cut + int(.02 * SR)].copy(), cut)
    else:
        y = song[int(off * SR):int((off + b["len"]) * SR)].copy()
    target = b.get("target", -39); g = target - body_db(ref); y = y * 10 ** (g / 20)
    if b.get("lift"):
        y = lift(y, target, 0, b["lift"] - off, 4.0)
    for t0, t1, m in b.get("spans", []):
        y = lift(y, target, t0, t1, m)
    if b.get("card"):                              # his chapter-card lift
        t = np.arange(len(y)) / SR + b["start"]; a0, a1 = b["card"] - .375, b["card"] + .315
        gc = np.where(t < a0, CARD_LIFT_DB, np.where(t > a1, 0.0, CARD_LIFT_DB * (a1 - t) / (a1 - a0)))
        y = y * (10 ** (gc / 20))[:, None]
    nz = np.where(np.abs(y).max(1) > 1e-4)[0]; y = y[:nz[-1] + 1]
    f = int(.01 * SR); y[:f] *= np.linspace(0, 1, f)[:, None]
    p = os.path.join(J.music, f"{b['key']}.wav"); write(p, y)
    print(f"{b['key']:24s} start {b['start']:8.3f}  len {len(y) / SR:6.2f}  gain {g:+.1f} dB" + (f"  intro lifted to {b['lift']} s" if b.get("lift") else ""))
    return dict(file=p, start=round(b["start"], 4), len=round(len(y) / SR, 4), gain_db=round(g, 1))


if __name__ == "__main__":
    plan = json.load(open(sys.argv[1] if len(sys.argv) > 1 else J.w("beds-plan.json")))
    out = json.load(open(J.w("beds.json"))) if os.path.exists(J.w("beds.json")) else {}
    for b in plan:
        out[b["key"]] = bake(b)
    json.dump(out, open(J.w("beds.json"), "w"), indent=1); print("->", J.w("beds.json"))
