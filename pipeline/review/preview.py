"""preview.py: a voiced review copy of one graphic, so Artem judges it with his own words under it (memory: one review
folder per pass, voiced previews).

  .venv/bin/python pipeline/review/preview.py <out.mp4> <t0> <dur> <graphic> [--overlay] [--height 1080|360]

t0/dur: timeline seconds (work/timeline.json) the graphic covers. Full-frame graphics play as they are; --overlay lays an
alpha .mov over the A-roll picture of the span. His voice is cut from the camera file piece by piece, exactly as the cut
plays it (a gap stays silent). Use --height 360 for quick blockouts on the review board.
"""
import os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job import J  # noqa: E402


def spans(t0, t1):
    out = []
    for p in J.timeline()["v1"]:
        a, b = max(t0, p["start"]), min(t1, p["end"])
        if b - a > .005:
            out.append((p["inP"] + (a - p["start"]), b - a, a - t0))
    return out


def voice(t0, dur, wav):
    S = spans(t0, t0 + dur); AR = J.cfg["aroll"]; inp, flt = [], []
    for i, (s, d, o) in enumerate(S):
        ms = int(round(o * 1000)); inp += ["-ss", f"{s:.4f}", "-t", f"{d:.4f}", "-i", AR]
        flt.append(f"[{i}:a]aformat=channel_layouts=stereo,adelay={ms}|{ms},apad=whole_dur={dur:.3f}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(S))) + f"amix=inputs={len(S)}:normalize=0,asetpts=N/SR/TB,atrim=0:{dur:.3f}[aout]"
    # asetpts: with ffmpeg 9 a span that starts in a V1 gap (a chapter card) lost its leading silence in atrim, so his
    # voice played early by the gap's length (pass-3 barsend worker, 2026-11-20)
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-filter_complex", ";".join(flt) + ";" + mix, "-map", "[aout]", "-ar", "48000", wav], check=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    if len(a) < 4:
        sys.exit(__doc__)
    out, t0, dur, g = a[0], float(a[1]), float(a[2]), a[3]; H = int(a[a.index("--height") + 1]) if "--height" in a else 1080
    tmp = tempfile.mkdtemp(); voice(t0, dur, f"{tmp}/v.wav"); enc = ["-c:v", "libx264", "-crf", "18" if H >= 1080 else "26", "-preset", "medium",
                                                                  "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{dur:.3f}"]
    if "--overlay" in a:
        S = spans(t0, t0 + dur); vin, vf = [], []
        for i, (s, d, o) in enumerate(S):
            vin += ["-ss", f"{s:.4f}", "-t", f"{d:.4f}", "-i", J.cfg["aroll"]]; vf.append(f"[{i}:v]scale=-2:{H},fps=30000/1001,setpts=PTS-STARTPTS[v{i}]")
        n = len(S); cat = "".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[bg]"
        subprocess.run(["ffmpeg", "-v", "error", "-y", *vin, "-i", g, "-i", f"{tmp}/v.wav", "-filter_complex",
                        ";".join(vf) + ";" + cat + f";[{n}:v]scale=-2:{H},format=yuva420p[g];[bg][g]overlay=0:0:shortest=0:eof_action=pass,format=yuv420p[o]",
                        "-map", "[o]", "-map", f"{n + 1}:a", *enc, out], check=True)
    else:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", g, "-i", f"{tmp}/v.wav", "-map", "0:v", "-map", "1:a", "-vf", f"scale=-2:{H},format=yuv420p", *enc, out], check=True)
    print(out)
