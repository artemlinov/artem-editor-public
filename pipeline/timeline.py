"""timeline.py: the cut as data. One model every tool reads: work/timeline.json

  {"note", "end", "v1": [{clip, start, end, inP, outP, path}],      # A-roll pieces on the timeline (seconds)
   "words": [{w, t, d, src}]}                                       # every transcript word that is in the cut

  python3 pipeline/timeline.py build [--dump dump.json] [--out timeline.json] [--words pieces|transcript]
                                                    # from the live dump's V1; words: every piece re-transcribed (cached)
  python3 pipeline/timeline.py words <t0> <t1>      # words in a span with their acoustic onset (where a cut or a visual lands)
  python3 pipeline/timeline.py joints <t0> <t1>     # speech joints: sentence starts (‖) and internal pauses (|) — rules/pacing.md
  python3 pipeline/timeline.py map <old.json> <new.json> <t> [<t> ...]   # where an old timeline time lands after a cut change

Library (from timeline import ...): load, src, tl, onset, wend, line_end, TimeMap.
Words are in SOURCE time first (each V1 piece transcribed on its own, cached in work/piece_words.json), then placed.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from job import J, fr, tc, FPS  # noqa: E402


def load(name="timeline.json"):
    return J.timeline(name)


def build(dump, words, note=""):
    """V1 pieces of the A-roll (track 1, clips whose media is the job's camera file) + the transcript mapped onto them."""
    aroll = os.path.basename(J.cfg["aroll"])
    v1 = []
    for i, c in enumerate(dump["v"][0]):
        if os.path.basename(c.get("path") or c["name"]) != aroll:
            continue
        # the out point comes from the clip's length: Premiere keeps a STALE outPoint after a clip's end is extended (ripple.py tail)
        v1.append(dict(clip=i, start=round(c["start"], 4), end=round(c["end"], 4), inP=c["inP"],
                       outP=round(c["inP"] + (c["end"] - c["start"]) * abs(c.get("speed") or 1), 4), path=c.get("path")))
    out = []
    for w in words:
        s, d = w["s"], max(0.0, w["e"] - w["s"])
        m = s + min(d, 0.6) / 2                       # a word is in the cut when its middle is (Whisper starts run early)
        for p in v1:
            if p["inP"] <= m < p["outP"]:
                out.append(dict(w=w["w"], t=round(p["start"] + max(0.0, s - p["inP"]), 3), d=round(d, 3), src=s))
    out.sort(key=lambda w: w["t"])
    return dict(note=note, end=round(dump["info"]["end"], 4), v1=v1, words=out)


def piece_words(v1, cache_file=None):
    """Source-time words for exactly the audio in the cut: every V1 piece transcribed on its own (padded 0.3 s), cached
    by source range in work/piece_words.json so a rebuild only transcribes pieces that changed. This is the reliable
    path: a whole-file or chunk transcript drops sentences and hides back-to-back retakes (memory: retake transcription)."""
    import numpy as np
    from job import whisper
    cache_file = cache_file or J.w("piece_words.json")
    cache = json.load(open(cache_file)) if os.path.exists(cache_file) else {}
    A = sr = None; words = []; new = 0
    for p in v1:
        key = f"{p['inP']:.3f}-{p['outP']:.3f}"
        if key not in cache:
            if A is None:
                A, sr = J.audio16()
            pad = np.zeros(int(sr * .3), np.float32)
            seg = np.concatenate([pad, A[int(p["inP"] * sr):int(p["outP"] * sr)], pad])
            _, ws = whisper(seg, words=True)
            cache[key] = [dict(w=w["word"].strip(), s=round(min(p["outP"], max(p["inP"], p["inP"] + w["start"] - .3)), 3),
                               e=round(min(p["outP"], p["inP"] + w["end"] - .3), 3)) for w in ws]
            new += 1
        words += cache[key]
    if new:
        json.dump(cache, open(cache_file, "w"))
    print(f"piece words: {new} transcribed, {len(v1) - new} from cache", file=sys.stderr)
    return words


def src(T, t):
    """Timeline time -> source time of the A-roll under it (None in a gap)."""
    for c in T["v1"]:
        if c["start"] - 1e-6 <= t < c["end"]:
            return c["inP"] + (t - c["start"])
    return None


def tl(T, s, near=None):
    """Source time -> timeline time (the occurrence nearest `near` if the source is used twice)."""
    best = None
    for c in T["v1"]:
        if c["inP"] - 1e-6 <= s < c["outP"]:
            t = c["start"] + (s - c["inP"])
            if best is None or (near is not None and abs(t - near) < abs(best - near)):
                best = t
    return best


def onset(T, env, t, back=0.12, fwd=0.40):
    """First speech onset (after >= 40 ms below -50 dB) within [t-back, t+fwd]; falls back to t+0.06."""
    s = src(T, t)
    if s is None:
        return t
    lo, hi = int((s - back) * 100), int((s + fwd) * 100); q = 0
    for k in range(lo - 6, hi):
        if env[k] <= -50:
            q += 1
        else:
            if q >= 4 and k >= lo:
                return round(t + (k / 100 - s), 3)
            q = 0
    return round(t + .06, 3)


def wend(T, env, t, maxs=3.0):
    """End of the speech that runs on from t, before the next >= 80 ms pause."""
    s = src(T, t)
    if s is None:
        return t
    k = int(s * 100); q = 0
    while k < int((s + maxs) * 100):
        q = q + 1 if env[k] <= -50 else 0
        if q >= 8:
            return round(t + ((k - q) / 100 - s) + .01, 3)
        k += 1
    return t


def line_end(env, t, quiet=-55, hold=0.10, reach=0.25):
    """Where the word sounding at (or just before) SOURCE time t is really over, in source seconds.
    Walk through its decay to the first dip under -50 dB, then on through a final consonant that comes AFTER that dip:
    the "-ts" of "cents" and the "-f" of "myself" sit 60-90 ms after it at about -40 dB, and a cut in the dip swallows
    them (Artem, video 13: "we still can't hear 'cents' properly"). The word is over where the level then stays under
    `quiet` for `hold` s. Sound that goes on for more than `reach` s past the dip is not this word (a breath, the next
    line): then the first dip is the end."""
    n = len(env); k = min(n - 1, max(0, int(round(t * 100)))); H = int(hold * 100); R = int(reach * 100)
    while k < n - 1 and env[k + 1] >= -50:
        k += 1
    j = k
    while j < n - 1 - H and j < k + R and env[j + 1:j + 1 + H].max() >= quiet:
        j += 1
    return ((j if j < k + R else k) + 1) / 100


class TimeMap:
    """Old timeline -> new timeline, matched through the A-roll's source time (so it survives any re-cut, take swap or
    ripple). A time inside removed speech lands on its cut point; a real V1 gap (a full-screen hold) keeps its length."""

    def __init__(self, old, new):
        self.seg = []                       # [old_t0, old_t1, new_t0]
        j0 = 0
        for o in old["v1"]:
            for k in range(j0, len(new["v1"])):
                n = new["v1"][k]
                if n.get("path") and o.get("path") and os.path.basename(n["path"]) != os.path.basename(o["path"]):
                    continue
                a, b = max(o["inP"], n["inP"]), min(o["outP"], n["outP"])
                if b - a > 1e-3:
                    self.seg.append([o["start"] + (a - o["inP"]), o["start"] + (b - o["inP"]), n["start"] + (a - n["inP"])])
                    j0 = k
        self.seg.sort()
        self.old = old

    def __call__(self, t):
        prev = None
        for o0, o1, n0 in self.seg:                   # a time exactly on a cut belongs to the piece that STARTS there
            if abs(t - o0) < 1e-3:                    # (video 13: a scene starting on a line whose previous line was re-taken
                return n0                             #  landed 10 frames early, inside the old line's mapping)
        for o0, o1, n0 in self.seg:
            if o0 - 1e-6 <= t <= o1 + 1e-6:
                return n0 + (t - o0)
            if t < o0:
                if prev is not None and src(self.old, t) is None:       # a real gap in the old V1: keep its length
                    return prev[2] + (prev[1] - prev[0]) + (t - prev[1])
                return n0                                            # removed speech: its cut point
            prev = (o0, o1, n0)
        return prev[2] + (prev[1] - prev[0]) + (t - prev[1]) if prev else t

    def pieces(self, t0, t1):
        """[new_t0, new_t1, old_t0] pieces of the new timeline that come from old [t0, t1] (for retiming a page)."""
        out = []
        for o0, o1, n0 in self.seg:
            a, b = max(o0, t0), min(o1, t1)
            if b - a > 1e-3:
                out.append([n0 + (a - o0), n0 + (b - o0), a])
        return out


def joints(T, t0, t1, pause=0.15):
    lines = []; cur = []; prev = None
    for w in [w for w in T["words"] if t0 <= w["t"] <= t1]:
        mark = ""
        if prev is not None:
            gap = w["t"] - (prev["t"] + prev["d"])
            if prev["w"].rstrip().endswith((".", "?", "!")):
                mark = "‖"
            elif gap >= pause or prev["w"].rstrip().endswith((",", ";", ":")):
                mark = "|"
        if mark == "‖" and cur:
            lines.append(" ".join(cur)); cur = []
        cur.append((f"{mark} " if mark else "") + f"[{tc(w['t'])}] {w['w']}" if mark or not cur else w["w"])
        prev = w
    if cur:
        lines.append(" ".join(cur))
    return lines


if __name__ == "__main__":
    a = sys.argv[1:]
    cmd = a[0] if a else ""
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if cmd == "build":
        dump = json.load(open(opt("--dump", J.w("dump.json"))))
        how = opt("--words", "pieces")
        if how == "transcript":                     # fast, rough: the whole-file transcript
            words = json.load(open(os.path.join(J.transcript, "words.json")))
        else:
            v1 = build(dump, [])["v1"]
            words = piece_words(v1)
        T = build(dump, words, note=f"{dump['info'].get('name', '')}: live V1 + per-piece words ({how}). t = timeline seconds.")
        out = opt("--out", J.w("timeline.json")); json.dump(T, open(out, "w"), indent=0)
        print(f"{len(T['v1'])} V1 pieces, {len(T['words'])} words, end {T['end']:.3f} s -> {out}")
    elif cmd == "words":
        T, env = load(), J.env(); t0, t1 = float(a[1]), float(a[2])
        for w in [w for w in T["words"] if t0 <= w["t"] <= t1]:
            print(f"{w['t']:9.3f}  {tc(w['t'])}  onset {onset(T, env, w['t'], .06, .25):9.3f}  f{fr(w['t'])}  {w['w']}")
    elif cmd == "joints":
        print("\n".join(joints(load(), float(a[1]), float(a[2]))))
    elif cmd == "map":
        M = TimeMap(json.load(open(a[1])), json.load(open(a[2])))
        for t in map(float, a[3:]):
            print(f"{t:9.3f} -> {M(t):9.3f}")
    else:
        print(__doc__)
