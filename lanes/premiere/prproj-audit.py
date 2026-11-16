"""prproj-audit.py: read clips' Clip Gain and every transition straight from a saved .prproj (no Premiere needed).

  python3 lanes/premiere/prproj-audit.py [<project.prproj>] [--json]    # default: the newest .prproj in <job>/premiere/

Clip Gain is not visible to the scripting API, and transitions only partly, so this is how to see what Artem set by hand
(his gain moves on the music beds) and to audit crossfades after a ripple. --json also writes work/prproj-audit.json
({"gain": [[track, start, end, name, dB]], "transitions": [[track, start, end, name]]}), which pipeline/review/reviewmix.py reads.
"""
import glob, gzip, json, math, os, sys
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "pipeline"))
from job import J  # noqa: E402

a = [x for x in sys.argv[1:] if not x.startswith("--")]
# the video's project: Claude Edit/premiere/ when Claude made it, beside the footage when Artem did
proj = a[0] if a else max(glob.glob(os.path.join(J.premiere, "*.prproj")) + glob.glob(os.path.join(os.path.dirname(J.root), "*.prproj")), key=os.path.getmtime)
raw = open(proj, "rb").read()
r = ET.fromstring(gzip.decompress(raw) if raw[:2] == b"\x1f\x8b" else raw); TPS = 254016000000
byid = {e.get("ObjectID"): e for e in r.iter() if e.get("ObjectID")}; byuid = {e.get("ObjectUID"): e for e in r.iter() if e.get("ObjectUID")}
def ref(e):
    if e is None:
        return None
    x = byid.get(e.get("ObjectRef"))
    return x if x is not None else byuid.get(e.get("ObjectURef"))
tt = lambda tri: (int(tri.findtext("Start") or 0) / TPS, int(tri.findtext("End") or 0) / TPS)
out = dict(project=proj, gain=[], transitions=[])
for kind in ("Audio", "Video"):
    for tr in r.iter(f"{kind}ClipTrack"):
        ct = tr.find("ClipTrack"); key = f"{kind[0]}{int(tr.findtext('ClipTrack/Track/Index')) + 1}"
        ti = ct.find("TransitionItems/TrackItems")
        for x in (ti if ti is not None else []):
            t = ref(x); s, e = tt(t.find(".//TrackItem")); out["transitions"].append([key, round(s, 3), round(e, 3), t.findtext(".//DisplayName")])
        ci_ = ct.find("ClipItems/TrackItems")
        for x in (ci_ if ci_ is not None else []):
            t = ref(x)
            if t is None or not t.tag.endswith("ClipTrackItem"):
                continue
            ci = t.find("ClipTrackItem"); s, e = tt(ci.find("TrackItem")); sc = ref(ci.find("SubClip")); cl = ref(sc.find("Clip")) if sc is not None else None
            g = cl.findtext("Gain") if cl is not None else None
            if g and float(g) > 0:
                out["gain"].append([key, round(s, 3), round(e, 3), sc.findtext("Name"), round(20 * math.log10(float(g)), 2)])
print("project", proj)
for k, s, e, n, db in out["gain"]:
    if abs(db) > .05:
        print(f"{k} GAIN  {s:9.3f}-{e:9.3f}  {db:+.1f} dB  {n}")
print(f"{len(out['transitions'])} transitions, {sum(1 for g in out['gain'] if abs(g[4]) > .05)} clips with gain")
if "--json" in sys.argv:
    json.dump(out, open(J.w("prproj-audit.json"), "w"), indent=0); print("->", J.w("prproj-audit.json"))
