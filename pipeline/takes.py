"""takes.py: from take picks to the first A-roll cut (rules/takes.md decides WHICH take; this finds exactly where it is).

  .venv/bin/python pipeline/takes.py find  [work/picks.json]     # -> work/cut.json + a report to read
  .venv/bin/python pipeline/takes.py plan  --at <T0>             # -> work/relay-plan.json; lanes/premiere/relay.py lays it

picks.json: [{"id": "R04", "a": 158.75, "b": 170.40, "text": "But I wouldn't use Fable blindly ... exactly why.",
              "end": "island" (default: the take runs to b) | "phrase" (it ends on the last words of `text`),
              "hold": true (keep its inner pauses: recut must skip it)}]
a..b is the stretch of the camera file (SOURCE seconds, from retakes.py chunks / fine) that holds the take, usually with
earlier takes and warm-ups before it. `text` is the line as he says it in that take.

How the last take is found: Whisper merges back-to-back repeats and stretches one sentence over two takes, so word
times inside an island can't be trusted. Instead every speech onset in a..b (after >= 50 ms below -45 dB) is a candidate
start; from the LATEST one backwards, the audio from the candidate to the end is transcribed on its own, and the first
candidate that reads as the whole line, first word included, is the last full take. Edges: in = onset - 30 ms, out = decay to -50 dB + 80 ms,
snapped outward to whole frames so the lay can't clip a word. Flags to read in the report:
  LONG?  the take is much slower than his pace: an earlier repeat may still be inside (listen, or narrow a..b)
  WEAK   the best candidate reads less like the line than expected (a different wording, or a mis-hear)
"""
import difflib, json, math, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from job import J, FPS, whisper  # noqa: E402

LEAD, TRAIL, PACE = 0.03, 0.08, 3.3            # s, s, words per second (his reading pace)
norm = lambda t: re.sub(r"[^a-z0-9 ]", "", t.lower().replace("-", " ").replace("%", " percent")).split()
sim = lambda x, y: difflib.SequenceMatcher(None, " ".join(x), " ".join(y)).ratio()


def onsets(env, a, b):
    """Speech onsets in a..b: the first loud frame after a quiet run (>= 5 frames under -45 dB), plus a itself."""
    out = [a]; q = 0
    for i in range(int(a * 100), int(b * 100)):
        if env[i] < -45:
            q += 1
        else:
            if q >= 5 and i / 100 - a > 0.08:
                out.append(i / 100)
            q = 0
    return out


def decay(env, t, limit):
    """From t (inside or just after the last word) to where that word is really over (its decay and a last consonant
    after a dip: timeline.line_end), never past limit."""
    from timeline import line_end
    return min(line_end(env, t), limit)


def find(picks):
    import numpy as np
    env = J.env(); A, sr = J.audio16(); pad = np.zeros(int(sr * .3), np.float32); out = []
    for p in picks:
        want = norm(p["text"]); a, b = p["a"], p["b"]; best = None
        for c in sorted(onsets(env, a - .05, b), reverse=True):
            if b - c < max(0.4, len(want) / PACE * 0.45):
                continue
            seg = np.concatenate([pad, A[int((c - .05) * sr):int((b + .15) * sr)], pad])
            text, ws = whisper(seg, words=True); heard = norm(text); te = b
            if p.get("end") == "phrase" and ws:                 # the take stops on the last words of the line
                tail = want[-3:]; hw = [norm(w["word"]) for w in ws]; flat = [(x, k) for k, h in enumerate(hw) for x in h]
                hit = None
                for k in range(len(flat) - len(tail) + 1):
                    if sim([x for x, _ in flat[k:k + len(tail)]], tail) >= .8 and k + len(tail) >= len(want) * .7:
                        hit = flat[k + len(tail) - 1][1]; break
                if hit is None:
                    continue
                te = c - .05 - .3 + ws[hit]["end"]; heard = [x for h in hw[:hit + 1] for x in h]
            r = sim(heard, want)
            if best is None or r > best[0] + 1e-6:
                best = (r, c, te, " ".join(heard))
            # the whole line AND its first word: an onset after a short first word ("But | I wouldn't...") reads almost as well
            if r >= .86 and heard and difflib.SequenceMatcher(None, heard[0], want[0]).ratio() >= .75 and sim(heard[:4], want[:4]) >= .7:
                best = (r, c, te, " ".join(heard)); break
        if best is None:
            print("MISSING", p["id"], p["text"][:60]); continue
        r, c, te, heard = best
        nxt = min([o for o in onsets(env, te + .02, min(len(env) / 100 - .01, te + 3)) if o > te + .05] or [te + 3])
        if p.get("end") == "phrase":
            te = decay(env, te - .03, nxt)
        i = int(c * 100)                                   # a soft first consonant sits between -50 and -45 dB: keep it
        while i > int(c * 100) - 25 and env[i - 1] > -50:
            i -= 1
        c = i / 100
        # a first word can sit before a short dip, as its own small blob ("Wha|t made me", "The other", "At API"): take it
        # in when it is at speech level and the line reads as well, or when the line reads better with it. A breath
        # is quieter and changes nothing, so it stays out (video 13).
        j = i; q = 0
        while j > 0 and env[j - 1] <= -50 and q < 14:
            j -= 1; q += 1
        k = j
        while k > 0 and env[k - 1] > -50 and j - k < 30:
            k -= 1
        if 0 < q < 14 and 3 <= j - k < 30 and k / 100 >= a - .3:
            seg = np.concatenate([pad, A[int((k / 100 - .05) * sr):int((te + .15) * sr)], pad]); h2 = norm(whisper(seg))
            loud = env[k:j].max() >= -32          # speech level; a breath stays under it (recut.py's own line)
            if len(h2) <= len(want) + 1 and ((loud and sim(h2, want) >= r - 1e-6) or sim(h2, want) > r + .004):
                c = k / 100; r = sim(h2, want); heard = " ".join(h2)
        inP = math.floor((c - LEAD) * FPS) / FPS; outP = math.ceil(min(te + TRAIL, nxt - .02) * FPS) / FPS
        d = outP - inP; flags = []
        if d > 1.45 * len(want) / PACE + .8:
            flags.append("LONG?")
        if r < .86:
            flags.append("WEAK")
        out.append(dict(id=p["id"], inP=round(inP, 4), outP=round(outP, 4), text=p["text"], heard=heard, ratio=round(r, 3), hold=bool(p.get("hold")), flags=flags))
        print(f"{p['id']:5s} {inP:8.2f}-{outP:8.2f} {d:5.1f}s {r:.2f} {' '.join(flags):12s} {heard[:110]}", flush=True)
    json.dump(out, open(J.w("cut.json"), "w"), indent=0)
    print(f"{len(out)} pieces, {sum(x['outP'] - x['inP'] for x in out):.1f} s -> {J.w('cut.json')}")


def plan(T0):
    C = json.load(open(J.w("cut.json"))); t = round(T0 * FPS) / FPS; v1 = []
    for c in C:
        n = round((c["outP"] - c["inP"]) * FPS)
        v1.append(dict(id=c["id"], start=round(t, 4), inP=c["inP"], outP=round(c["inP"] + n / FPS, 4))); t += n / FPS
    json.dump(dict(T0=T0, v1=v1, moves=[], old_end=T0), open(J.w("relay-plan.json"), "w"), indent=0)
    print(f"{len(v1)} pieces from {T0:.3f} to {t:.3f} -> {J.w('relay-plan.json')}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["find"]:
        find(json.load(open(a[1] if len(a) > 1 else J.w("picks.json"))))
    elif a[:1] == ["plan"] and "--at" in a:
        plan(float(a[a.index("--at") + 1]))
    else:
        print(__doc__)
