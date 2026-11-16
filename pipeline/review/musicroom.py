"""musicroom.py: how much room a music stem leaves the voice, for judging a model's (or our own) music mix.

  .venv/bin/python pipeline/review/musicroom.py <music> <voice> <t0> <t1> [<t0> <t1> ...]

<music> and <voice> are separate stems of the same timeline (any format ffmpeg reads). For each span it prints the
music's meter peak (median of half-second maxima), both short-term loudnesses (BS.1770, 3 s windows) and how far the
music sits under the voice, plus music minus voice per band. Peaks hide how dense a song is: video 13's overpowering
hooks peaked like the good one but sat 8-9 LU under the voice and only 5-11 dB under it at 1-4 kHz; the good one sat
about 15 LU and 20 dB under.
"""
import subprocess, sys
import numpy as np
from scipy.signal import butter, lfilter, sosfilt

SR = 48000


def load(path):
    ch = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels",
                             "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout.strip())
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, ch).astype(np.float64)
    return np.repeat(x[:, :1], 2, 1) if ch == 1 else x[:, :2]  # a mono stem plays at full level in both channels


def k_weight(x):
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def short_term(x, win=3.0, hop=0.1):
    y, n, h = k_weight(x), int(win * SR), int(hop * SR)
    v = np.array([-0.691 + 10 * np.log10((y[i:i + n] ** 2).mean(0).sum() + 1e-12) for i in range(0, len(y) - n, h)])
    return np.median(v[v > -60]) if (v > -60).any() else float("nan")


def band(x, lo, hi):
    sos = butter(4, [lo, hi], btype="band", fs=SR, output="sos") if lo else butter(4, hi, btype="low", fs=SR, output="sos")
    y, n = sosfilt(sos, x.mean(1)), SR // 10
    r = np.array([10 * np.log10((y[i:i + n] ** 2).mean() + 1e-12) for i in range(0, len(y) - n, n)])
    return np.median(r[r > -80])


a = sys.argv[1:]
if len(a) < 4 or len(a) % 2:
    sys.exit(__doc__)
M, V = load(a[0]), load(a[1])
for t0, t1 in zip(map(float, a[2::2]), map(float, a[3::2])):
    m, v = M[int(t0 * SR):int(t1 * SR)], V[int(t0 * SR):int(t1 * SR)]
    pk = np.median([20 * np.log10(np.abs(m[i:i + SR // 2]).max() + 1e-9) for i in range(0, len(m) - SR // 2, SR // 2)])
    ml, vl = short_term(m), short_term(v)
    print(f"{t0:g}-{t1:g} s: music peak {pk:.1f} dBFS, music {ml:.1f} LUFS, voice {vl:.1f} LUFS, "
          f"music {vl - ml:.1f} LU under the voice")
    print("   music minus voice: " + ", ".join(f"{lab} {band(m, lo, hi) - band(v, lo, hi):+.0f} dB" for lo, hi, lab in
          [(0, 150, "<150 Hz"), (150, 1000, "150 Hz-1 kHz"), (1000, 4000, "1-4 kHz (voice)"), (4000, 12000, "4-12 kHz")]))
