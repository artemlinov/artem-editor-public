"""place-pass.py: lay a revision round's finished graphics workers on the live timeline (video 14's passes 2 and 3).

  python3 lanes/premiere/place-pass.py <pass> <worker> [<worker> ...] [--with-cues] [--dry]
  e.g.  python3 lanes/premiere/place-pass.py p3 hookvs table        # reads work/place/p3-hookvs.json, p3-table.json

Each worker of a round writes work/place/<pass>-<worker>.json ({"replaces"|"remove": [[track, start, file]], "rows": [...]})
and work/place/<pass>-<worker>-sfx.json ({"remove_sfx": [[t0, t1]], "cues": [...]} or a plain cue list).
Order: a fresh dump-live (he may have edited), the replaced clips out plus every A4-A7 sound STARTING inside a remove_sfx
span, the new rows in (place-rows: backup, lay, read back). With --with-cues the workers' sound cues go on too, through
pipeline/sound/sfxcues.py (UI sounds thinned: real mouse and keyboard sounds always stay, UI sounds keep their distance)
and sfx-tracks.py; without it the cues wait for a sound pass over the whole video (how pass 3 worked).
Writes work/<pass>/place-<workers>.json and sfx-<workers>.json (what was sent).
"""
import collections, json, os, shutil, subprocess, sys
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, REPO + "/pipeline"); sys.path.insert(0, REPO + "/pipeline/sound")
from job import J  # noqa: E402
import sfxcues as S  # noqa: E402

a = sys.argv[1:]; DRY = "--dry" in a; CUES = "--with-cues" in a; A = [x for x in a if not x.startswith("--")]
if len(A) < 2:
    sys.exit(__doc__)
PASS, W = A[0], A[1:]
P = J.w("place")
tag = "-".join(W)
subprocess.run(["python3", REPO + "/lanes/premiere/dump-live.py", "--out", f"dump-live-{PASS}.json"], check=True, capture_output=True)
D = json.load(open(J.w(f"dump-live-{PASS}.json")))
remove, rows, cues, spans = [], [], [], []
for w in W:
    g = json.load(open(f"{P}/{PASS}-{w}.json")) if os.path.exists(f"{P}/{PASS}-{w}.json") else {}
    remove += [[r[0], r[1], r[2]] for r in g.get("replaces", []) + g.get("remove", [])]
    rows += g.get("rows", [])
    sf = f"{P}/{PASS}-{w}-sfx.json"
    if os.path.exists(sf):
        s = json.load(open(sf))
        if isinstance(s, dict):
            spans += s.get("remove_sfx", []); cs = s.get("cues", [])
        else:
            cs = s
        for c in cs:
            c = dict(c); c["note"] = f"[{w}] " + c.get("note", "")
            if CUES and "optional" not in c["note"].lower():
                cues.append(c)
for k in range(3, 7):                                    # A4-A7: old sounds inside a remove_sfx span
    for c in D["a"][k]:
        if any(t0 - 1e-3 <= c["start"] <= t1 + 1e-3 for t0, t1 in spans):
            remove.append([f"A{k + 1}", round(c["start"], 4), c["name"]])
# a replaced clip must exist (start within 0.03 s); report the ones that don't
live = {(f"{kd.upper()}{k + 1}", c["name"]): [] for kd in ("v", "a") for k, tr in enumerate(D[kd]) for c in tr}
for kd in ("v", "a"):
    for k, tr in enumerate(D[kd]):
        for c in tr:
            live[(f"{kd.upper()}{k + 1}", c["name"])].append(c["start"])
miss = [r for r in remove if not any(abs(s - r[1]) < .03 for s in live.get((r[0], r[2] if r[2].count(".") else r[2] + ".wav"), live.get((r[0], r[2]), [])))]
for r in remove:
    if not r[2].lower().endswith((".mp4", ".mov", ".wav", ".png", ".mp3")):
        hits = [n for (t, n) in live if t == r[0] and n.startswith(r[2])]
        if hits:
            r[2] = hits[0]
print(f"{tag}: remove {len(remove)} ({len(spans)} sound spans), lay {len(rows)} rows, {len(cues)} sound cues; not found to remove: {miss}")
# sounds: thin UI sounds like pass 1
PRI = {"reveal": (5, .5), "whoosh": (4, .6), "ui-pop": (3, 1.5), "ui-click": (2, 2.5), "transition": (1, 2.5), "sweep": (4, .6), "error": (5, .5)}
real = [c for c in cues if c["kind"] not in PRI]; ui = [c for c in cues if c["kind"] in PRI]; took = []
for c in sorted(ui, key=lambda c: (-PRI[c["kind"]][0], c["t"])):
    if all(abs(c["t"] - k["t"]) >= max(PRI[c["kind"]][1], PRI[k["kind"]][1] if PRI[k["kind"]][0] < PRI[c["kind"]][0] else 0) for k in took):
        took.append(c)
kept = sorted(real + took, key=lambda c: c["t"])
print("UI sounds dropped for sparseness:", len(ui) - len(took), "of", len(ui), dict(collections.Counter(c["kind"] for c in kept)))
R = []
for c in kept:
    R += S.rows([c])
dst = os.path.realpath(J.sfx); os.makedirs(dst, exist_ok=True)
for r in R:
    if os.path.realpath(os.path.dirname(r["file"])) != dst:
        q = os.path.join(dst, os.path.basename(r["file"]))
        if not os.path.exists(q):
            shutil.copy2(r["file"], q)
        r["file"] = q
pf = J.w(f"{PASS}/place-{tag}.json"); sfxf = J.w(f"{PASS}/sfx-{tag}.json")
os.makedirs(J.w(PASS), exist_ok=True)
json.dump({"remove": remove, "rows": rows}, open(pf, "w"), indent=1); json.dump(R, open(sfxf, "w"), indent=0)
if DRY:
    print("dry:", pf, sfxf); sys.exit(0)
r1 = subprocess.run(["python3", REPO + "/lanes/premiere/place-rows.py", pf], capture_output=True, text=True); print(r1.stdout[-700:], r1.stderr[-400:])
if R:
    r2 = subprocess.run(["python3", REPO + "/lanes/premiere/sfx-tracks.py", sfxf, "--tracks", "A4-A7"], capture_output=True, text=True); print(r2.stdout[-500:], r2.stderr[-400:])
