"""sfxcues.py: turn sound cue lists (what happens, when) into rows for lanes/premiere/sfx-tracks.py, by rules/sound.md.

  .venv/bin/python pipeline/sound/sfxcues.py <cues.json> [<cues.json> ...] [--out work/sfx-cues.json]
  then: python3 lanes/premiere/sfx-tracks.py <job>/work/sfx-cues.json

A cue is {"t": timeline s, "kind": ..., "end": s (type only; or "… to 346.73" in the note), "note": "..."}. Graphics
workers write these next to their renders (work/place/<worker>-sfx.json); the lead adds the real clicks of a recording.
Which file, how loud and which slice of it is Artem's (video 12's final timeline, rules/sound.md):

  ui-pop        the Everygen notification click, -13 dB,       something appears by itself (a chip, a tick, a field)
                rotating with C02 / C06 / C03 at the same loudness
  ui-click      C12, -15 dB, rotating with C17 / C15            a small step (a switch, a small word)
  reveal        POS, as baked                                  the conclusion of a graphic (a crown, the key number)
  whoosh        W_FAST from 0.234 s, 0.77 s long, -8 dB        a full-screen cut, something sliding in
  transition    Angelic Click from 2.769 s, -20 dB             between two back-to-back full-screen animations
  mouse-click   Magic Mouse, -2 dB (a note saying "press" / "release" gets the two halves of a drag-select)
  type          Macbook typing from 1.535 s, -12 dB            cut to exactly t..end
  key           one Macbook key, first 0.4 s, -8 dB            a paste, a switch between screen scenes
  enter         Enter hard press, first 0.7 s, -5 dB           a send
  error         Epidemic "Back, Return, Negative" click, -12 dB  a subtle error (a muted or failing icon)
  sweep         SHIM, as baked                                 a light sweep across a card (chapter breaks)

Timing: the sound's own transient (its loudest 10 ms inside the slice) lands ON t. So t is the frame a UI element
becomes readable, and for a real click or key the frame of the press itself, a frame or two before what it causes.
A cue may carry "file", "db", "in", "len", "lead" to override the map (a one-off sound such as a drum roll).
"""
import json, os, re, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.dirname(HERE))
from job import J, FPS  # noqa: E402

B = lambda *p: os.path.join(REPO, "brand", "sfx", *p)
L = lambda *p: os.path.join(J.sfx_library, *p)
MAP = {  # kind: (file, dB, in, len)
    "ui-pop": (B("ES_User Interface, Click, Digital, Video Game, Select, Positive, Notification 03 - Epidemic Sound.wav"), -10, 0, None),
    "ui-click": (B("set", "C12.wav"), -12, 0, None),
    "reveal": (B("set", "POS.wav"), 0, 0, None),
    "whoosh": (B("set", "W_FAST.wav"), -8, .234, .77),
    "transition": (B("Angelic Click.wav"), -20, 2.769, None),
    "mouse-click": (L("Main SFX", "Clicks", "Magic Mouse.wav"), -2, 0, None),
    "mouse-press": (L("Main SFX", "Clicks", "Magic Mouse.wav"), -2, 0, .234),
    "mouse-release": (L("Main SFX", "Clicks", "Magic Mouse.wav"), -2, .234, None),
    "type": (L("Epidemic Sound", "Keyboard, Macbook Pro 2017, Typing, Fast.wav"), -12, 1.535, None),
    "key": (L("Epidemic Sound", "Keyboard, Macbook Pro 2017, Various, Characters, Single.wav"), -8, 0, .4),
    "enter": (L("Artlist", "Computer Keyboard Enter Button Hard Press.wav"), -5, 0, .7),
    # video 14 pass 2: "a subtle error sound" on a muted / failing icon; the light sweep across a chapter card
    "error": (L("Epidemic Sound", "ES_Button Press Click, Tap, Video Game, Back, Return, Negative - Epidemic Sound.wav"), -12, 0, None),
    "sweep": (B("set", "SHIM.wav"), 0, 0, None),
}
# Artem, video 13 pass 2: "You're overusing this specific click throughout the video and it is also a bit too loud.
# I would decrease it by maybe 3 dB", and alternate it with similar ones. So a pop or a click rotates through a few
# sounds of the same family, each brought to the loudness of the first one at its (3 dB lower) level.
VARIANTS = {
    "ui-pop": [(MAP["ui-pop"][0], -13), (B("set", "C02.wav"), None), (B("set", "C06.wav"), None), (B("set", "C03.wav"), None)],
    "ui-click": [(MAP["ui-click"][0], -15), (B("set", "C17.wav"), None), (B("set", "C15.wav"), None)],
}
_peak = {}; _loud = {}; _turn = {}


def _pcm(f, a=0, n=None):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-ss", str(a)] + (["-t", str(n)] if n else []) + ["-i", f, "-ac", "1", "-ar", "48000",
                                        "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32)


def loud(f):
    """dB of the file's loudest 50 ms (how loud a short click reads)."""
    if f not in _loud:
        x = _pcm(f); h = 2400; _loud[f] = 20 * np.log10(max(np.sqrt((x[i:i + h] ** 2).mean()) for i in range(0, max(1, len(x) - h), 480)) + 1e-9)
    return _loud[f]


def variant(kind):
    """The next sound for this kind, with its level: variants are matched to the first one's loudness."""
    V = VARIANTS[kind]; k = _turn.get(kind, 0); _turn[kind] = k + 1; f, db = V[k % len(V)]
    if db is None:
        db = float(round(float((loud(V[0][0]) + V[0][1]) - loud(f)), 1))
    return f, db


def peak(f, a, n):
    """Seconds from the slice start to its loudest 10 ms."""
    k = (f, a, n)
    if k not in _peak:
        x = _pcm(f, a, n or 2.0); h = 480; e = [np.abs(x[i:i + h]).max() for i in range(0, len(x) - h, h)]
        _peak[k] = (int(np.argmax(e)) + .5) * h / 48000 if e else 0.0
    return _peak[k]


def rows(cues):
    out = []; snap = lambda t: round(round(t * FPS) / FPS, 4)
    for c in cues:
        kind = c["kind"]; note = c.get("note", "")
        if kind == "mouse-click" and re.search(r"\bpress\b", note):
            kind = "mouse-press"
        elif kind == "mouse-click" and re.search(r"\brelease\b", note):
            kind = "mouse-release"
        if kind not in MAP and "file" not in c:
            print("no sound for", c); continue
        f, db, a, n = MAP.get(kind, (None, 0, 0, None))
        if kind in VARIANTS and "file" not in c:
            f, db = variant(kind)
        f, db, a, n = c.get("file", f), c.get("db", db), c.get("in", a), c.get("len", n)
        if kind == "type":
            end = c.get("end") or next((float(x) for x in re.findall(r"to (?:the cut at )?(\d+\.\d+)", note)), None)
            if not end:
                print("typing cue without an end:", c); continue
            out.append(dict(file=f, start=snap(c["t"]), end=snap(end), db=db, **{"in": a}))
            continue
        if "end" in c:                                 # a one-off sound that runs for a span (a rewind): starts on t, cut at end
            out.append(dict(file=f, start=snap(c["t"]), end=snap(c["end"]), db=db, **{"in": a})); continue
        lead = c["lead"] if "lead" in c else peak(f, a, n)
        st = snap(c["t"] - lead)
        out.append(dict(file=f, start=st, end=snap(st + n) if n else None, db=db, **{"in": a}))
    return out


if __name__ == "__main__":
    a = sys.argv[1:]; outp = a[a.index("--out") + 1] if "--out" in a else J.w("sfx-cues.json")
    files = [x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or a[i - 1] != "--out")]
    cues = [c for f in files for c in json.load(open(f))]
    R = rows(cues)
    import shutil                                      # the project's media stays inside the video's folder: copy what is used
    dst = os.path.realpath(J.sfx); os.makedirs(dst, exist_ok=True)
    for r in R:
        if os.path.realpath(os.path.dirname(r["file"])) != dst:
            q = os.path.join(dst, os.path.basename(r["file"]))
            if not os.path.exists(q):
                shutil.copy2(r["file"], q)
            r["file"] = q
    json.dump(R, open(outp, "w"), indent=0)
    print(f"{len(R)} sounds from {len(cues)} cues -> {outp}")
