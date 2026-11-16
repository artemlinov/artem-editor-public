"""revclip.py: a review clip of one new render IN CONTEXT: the exported cut around it with the render laid over its span.

  .venv/bin/python pipeline/review/revclip.py <export.mp4> <render> <timeline start> <out.mp4> [--handle 0.5]

<export.mp4> is a full review export of the sequence (Premiere, any resolution; the clip comes out at 1080p). The render
replaces the picture for its own length from <timeline start>; the export's audio plays under it, with --handle seconds
of the cut before and after so the transition in and out can be judged.
"""
import subprocess, sys
FPS = 30000 / 1001
a = sys.argv[1:]
if len(a) < 4:
    sys.exit(__doc__)
EXP, r, st, out = a[0], a[1], float(a[2]), a[3]; h = float(a[a.index("--handle") + 1]) if "--handle" in a else .5
n = int(subprocess.check_output(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", r]).strip())
f0 = round(st * FPS); H = round(h * FPS); s = f0 - H; N = n + 2 * H
vf = (f"[1:v]scale=1920:1080:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709,setpts=PTS-STARTPTS+{H}/({FPS})/TB[r];"
      f"[0:v]scale=1920:1080[b];[b][r]overlay=eof_action=pass:enable='between(n,{H},{H + n - 1})',format=yuv420p[v]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{s / FPS:.6f}", "-i", EXP, "-i", r, "-filter_complex", vf, "-map", "[v]", "-map", "0:a",
                "-frames:v", str(N), "-t", f"{N / FPS:.6f}", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-c:a", "aac", "-b:a", "256k",
                "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", out], check=True)
print(out, "frames", N, "render", n, "from timeline frame", s)
