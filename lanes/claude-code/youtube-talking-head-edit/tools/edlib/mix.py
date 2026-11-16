"""Songs check and the final mix.

ed songs FILE ...  For each song: any words heard (a voice in it), its loudness every 2 s and where it changes
                   (pockets), so you can pick an offset and line pocket changes up with beats.
ed mix MIX.json    voice.wav + clips.wav + music beds + sound effects -> mix.wav, at the skill's levels:
  {"music": [{"file": F, "f0": 0, "f1": 1430, "offset": 9.5, "under": 15, "end": "reverb"}],
   "sfx":   [{"file": F, "f": 529, "kind": "whoosh", "db": 0, "trim": 0.8}],
   "clips_db": 0}
  music: plays F from `offset` seconds on output frames f0..f1, its RMS `under` dB below the speech's RMS
         (15 in the hook, 20 after); ends with a short reverb tail ("reverb", default), a 0.4 s fade ("fade") or a cut.
  sfx:   placed so its loudest moment lands on frame f (or its start, with "peak": false); kind whoosh / hit sit
         14 dB under the speech loudness, pop / click / ui / typing 20 dB under; "db" adjusts; "trim" keeps that many s.
"""
import json, os, subprocess
import numpy as np
from . import job as J

SR = 48000


def load(path, ss=0.0, dur=None, sr=SR, ch=2):
    cmd = [J.ffmpeg(), "-v", "error", "-nostdin", "-ss", f"{ss:.4f}", "-i", path]
    if dur:
        cmd += ["-t", f"{dur:.4f}"]
    cmd += ["-vn", "-ac", str(ch), "-ar", str(sr), "-f", "f32le", "-"]
    y = np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32)
    return y.reshape(-1, ch).copy() if ch > 1 else y.copy()


def db(x):
    return 20 * np.log10(max(float(x), 1e-9))


def rms(y):
    m = y.mean(1) if y.ndim > 1 else y
    return float(np.sqrt(np.mean(m ** 2) + 1e-12))


def songs(jb, files):
    from . import stt
    out = {}
    for f in files:
        y = load(f)
        dur = len(y) / SR
        mono = y.mean(1)
        win = 2 * SR
        lv = [db(np.sqrt(np.mean(mono[i:i + win] ** 2) + 1e-12)) for i in range(0, len(mono) - win // 2, win)]
        sm = np.convolve(lv, np.ones(2) / 2, mode="same")
        changes = [i * 2 for i in range(2, len(sm) - 1) if abs(sm[i] - sm[i - 2]) >= 3 and abs(sm[i + 1] - sm[i - 2]) >= 3]
        merged = []
        for c in changes:
            if not merged or c - merged[-1] > 6:
                merged.append(c)
        x16 = load(f, sr=16000, ch=1)
        txt, ws, _ = stt.transcribe(x16, language=jb.meta.get("language"))
        voiced = [w for w in ws if w["p"] >= 0.4]
        out[f] = {"duration": round(dur, 1), "levels_2s": [round(v, 1) for v in lv], "changes_s": merged,
                  "words": [{"w": w["w"], "s": w["s"], "p": w["p"]} for w in ws]}
        verdict = "VOICE? " + " ".join(f"{w['w']}@{w['s']:.1f}s" for w in voiced[:12]) if voiced else "no voice heard"
        print(f"\n{os.path.basename(f)}  {dur:.0f}s  peak-to-quiet {max(lv) - min(lv):.0f} dB  {verdict}")
        print("  level every 2 s: " + " ".join(f"{v:.0f}" for v in lv))
        print("  changes at (s): " + (", ".join(str(c) for c in merged) or "none (steady)"))
    json.dump(out, open(jb.p("songs.json"), "w"), indent=1)


def _ir(seconds=1.6, decay=0.35):
    rng = np.random.default_rng(7)
    n = int(seconds * SR)
    ir = rng.standard_normal((n, 2)).astype(np.float32) * np.exp(-np.arange(n) / (decay * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0))


def mix(jb, path):
    import soundfile as sf, pyloudnorm as pyln
    from scipy.signal import fftconvolve
    spec = json.load(open(path))
    cut = json.load(open(jb.p("cut.json"))); fps = jb.fps
    N = int(cut["total"] / fps * SR)
    voice = sf.read(jb.p("voice.wav"), dtype="float32")[0][:N]
    voice = np.pad(voice, ((0, N - len(voice)), (0, 0)))
    clips = sf.read(jb.p("clips.wav"), dtype="float32")[0][:N] if os.path.exists(jb.p("clips.wav")) else np.zeros_like(voice)
    clips = np.pad(clips, ((0, N - len(clips)), (0, 0)))
    meter = pyln.Meter(SR)
    # speech peaks at -3 dBFS: the peaks of the words, not one stray pop (a single plosive would set the whole level)
    m0 = np.abs(voice).max(1); w = SR // 100; nb0 = len(m0) // w
    peaks = m0[:nb0 * w].reshape(nb0, w).max(1); peaks = peaks[peaks > 1e-4]
    pk = float(np.percentile(peaks, 99.7)) if len(peaks) else 1.0
    voice *= 10 ** (-3 / 20) / pk
    over = np.abs(voice) > 10 ** (-1 / 20)            # the rare peaks above that: soft-limited at -1 dBFS
    if over.any():
        lim = 10 ** (-1 / 20)
        voice[over] = np.sign(voice[over]) * (lim + (1 - lim) * np.tanh((np.abs(voice[over]) - lim) / (1 - lim)))
    mono = voice.mean(1); hop = SR // 50; nb = len(mono) // hop
    r = np.sqrt((mono[:nb * hop].reshape(nb, hop) ** 2).mean(1))
    act = r[r > 10 ** (-40 / 20)]
    speech_rms = db(np.sqrt(np.mean(act ** 2))) if len(act) else -20
    speech_lufs = meter.integrated_loudness(voice)
    # played clips: as loud as the speech
    for it in cut["items"]:
        if it["kind"] == "clip":
            a, b = int(it["tl"][0] / fps * SR), int(it["tl"][1] / fps * SR)
            seg = clips[a:b]
            if len(seg) > SR * 0.5 and np.abs(seg).max() > 1e-4:
                seg *= 10 ** ((speech_lufs + spec.get("clips_db", 0) - meter.integrated_loudness(seg)) / 20)
    music = np.zeros_like(voice); ir = _ir(); notes = []
    for m in spec.get("music", []):
        a, b = int(m["f0"] / fps * SR), min(N, int(m["f1"] / fps * SR))
        n = b - a
        if n < int(0.5 * SR):
            notes.append(f"{os.path.basename(m['file'])}: its span is outside the cut, skipped")
            continue
        y = load(m["file"], m.get("offset", 0.0), n / SR + 0.05)[:n]
        if len(y) < n:
            notes.append(f"{os.path.basename(m['file'])} is {(n - len(y)) / SR:.1f}s too short for its span")
            y = np.pad(y, ((0, n - len(y)), (0, 0)))
        y *= 10 ** ((speech_rms - m.get("under", 20) - db(rms(y))) / 20)
        fi = int(m.get("fade_in", 0.12) * SR); y[:fi] *= np.linspace(0, 1, fi)[:, None]
        end = m.get("end", "reverb")
        if end == "fade":
            fo = int(0.4 * SR); y[-fo:] *= np.linspace(1, 0, fo)[:, None]
        else:
            fo = int(0.08 * SR); y[-fo:] *= np.linspace(1, 0, fo)[:, None]
        music[a:b] += y
        if end == "reverb":
            src = y[-int(0.25 * SR):]
            tail = np.stack([fftconvolve(src[:, c], ir[:, c])[:len(ir)] for c in range(2)], 1) * 0.5
            tail *= (np.linspace(1, 0, len(tail)) ** 1.5)[:, None]
            st = b - len(src); e = min(N, st + len(tail))
            music[st:e] += tail[:e - st]
    sfxbus = np.zeros_like(voice)
    for s in spec.get("sfx", []):
        y = load(s["file"])
        if s.get("trim"):
            y = y[:int(s["trim"] * SR)]
        if len(y) == 0:
            continue
        fo = min(len(y) // 4, int(0.03 * SR)); y[-fo:] *= np.linspace(1, 0, fo)[:, None]
        L = meter.integrated_loudness(y) if len(y) > SR * 0.45 else db(rms(y)) + 0.7
        under = 14 if s.get("kind", "pop") in ("whoosh", "hit", "riser", "impact") else 20
        y *= 10 ** ((speech_lufs - under + s.get("db", 0) - L) / 20)
        pk_i = int(np.argmax(np.abs(y).mean(1))) if s.get("peak", True) else 0
        a = int(s["f"] / fps * SR) - pk_i
        if a < 0:
            y = y[-a:]; a = 0
        m = min(len(y), N - a); sfxbus[a:a + m] += y[:m]
    out = voice + clips + music + sfxbus
    pk = np.abs(out).max()
    if pk > 10 ** (-1 / 20):
        out *= 10 ** (-1 / 20) / pk
    sf.write(jb.p("mix.wav"), out, SR, subtype="PCM_24")
    sf.write(jb.p("music_bus.wav"), music, SR, subtype="PCM_24")
    mr = music.mean(1); nb = len(mr) // hop
    mm = np.sqrt((mr[:nb * hop].reshape(nb, hop) ** 2).mean(1)); mm = mm[mm > 1e-5]
    stats = {"speech_rms_db": round(float(speech_rms), 1), "speech_lufs": round(float(speech_lufs), 1),
             "music_median_db": round(float(db(np.median(mm))), 1) if len(mm) else None,
             "final_lufs": round(float(meter.integrated_loudness(out)), 1), "final_peak_db": round(float(db(np.abs(out).max())), 1)}
    jb.meta["mix"] = stats; jb.save()
    print(f"mix.wav: {stats}" + ("".join(f"\n  NOTE {n}" for n in notes)))
