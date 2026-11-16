"""sfx-tracks.py: put a list of sound cues on the first free SFX track, then lay them with place-rows.

  python3 lanes/premiere/sfx-tracks.py <cues.json> [--tracks A4-A7] [--dry]

cues.json: [{"file", "start": s, "end": s|null (null = the whole file), "db": gain, "in": s}]
Which sound, where and how loud comes from rules/sound.md; this only finds room for it: each cue goes on the first track
in --tracks with nothing under it (current clips read live), so overlapping sounds never cut each other.
Writes <cues>_place.json next to the cues file, then calls place-rows (backup, lay, read back).
"""
import json, os, subprocess, sys
from lane import run


def dur(p):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout)


a = sys.argv[1:]; R = json.load(open(a[0]))
lo, hi = (a[a.index("--tracks") + 1] if "--tracks" in a else "A4-A7").replace("A", "").split("-"); lo, hi = int(lo), int(hi)
occ = json.loads(run('''(function(){var s=app.project.activeSequence,o=[];for(var t=%d;t<=%d;t++){var a=[];if(t<=s.audioTracks.numTracks){var tr=s.audioTracks[t-1];
 for(var i=0;i<tr.clips.numItems;i++)a.push([tr.clips[i].start.seconds,tr.clips[i].end.seconds])}o.push(a)}return JSON.stringify(o)})()''' % (lo, hi)))
rows = []
for r in sorted(R, key=lambda r: r["start"]):
    d = (r["end"] - r["start"]) if r.get("end") else dur(r["file"]) - r.get("in", 0); st = r["start"]; tk = None
    for ti in range(hi - lo + 1):
        if all(st + d <= x + 1e-3 or st >= y - 1e-3 for x, y in occ[ti]):
            tk = ti; occ[ti].append([st, st + d]); break
    if tk is None:
        print("NO FREE TRACK", r); continue
    rows.append({"file": r["file"], "track": f"A{lo + tk}", "start": st, "end": r.get("end"), "db": r["db"], "bin": "SFX", "in": r.get("in", 0)})
p = os.path.splitext(a[0])[0] + "_place.json"; json.dump(dict(remove=[], rows=rows), open(p, "w"), indent=1)
print(f"{len(rows)} cues -> {p}")
sys.exit(subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "place-rows.py"), p] + (["--dry"] if "--dry" in a else [])).returncode)
