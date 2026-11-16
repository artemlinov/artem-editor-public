"""recut.py: breath-aware re-tightening of the A-roll cut (rules/pacing.md, "Cutting"). Reads, never writes Premiere.

  .venv/bin/python pipeline/recut.py analyze --from <T0> [--to <T1>] [--skip 12,40] [--room 27:0.2,31:0.2]
                                                                                        # -> work/recut.json + a report
  .venv/bin/python pipeline/recut.py plan                                               # -> work/relay-plan.json
  then: proof (pipeline/proof.py), Artem's OK, and lanes/premiere/relay.py applies the plan.

Speech = A-roll level >= -40 dB; a blob shorter than 0.14 s that never reaches -32 dB is a breath or click, not speech.
Every quiet run >= MINGAP inside a clip, and every head and tail, is tightened to LEAD/TRAIL around speech, walking out
through each word's attack and decay (and a last consonant that comes after a dip: timeline.line_end) so no soft word edge is clipped. A run that sits inside a word the
transcript knows (work/timeline.json) is never cut. A clip head or tail that starts or ends inside speech stays exactly.
The numbers below are the ones Artem approved on video 12 (2026-11-10).
Skip a clip on purpose (a hold you timed by hand, a reaction shot) with --skip <clip index in the dump's V1>.
--room <clip>:<s> gives a line that has to sink in (rules/pacing.md: impactful, transitional, a joke) that much more
silence after it, taken from the room tone that follows it in the camera file; it stops short of any breath or speech.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from job import J, FPS, fr  # noqa: E402
import timeline as TL  # noqa: E402

LEAD, TRAIL, MINGAP, GAP = 0.03, 0.08, 0.25, 0.10     # s: before an onset, after a decay, shortest gap cut, gap left
MAXCLIP = 20.0                                       # longer clips are holds/plays, never re-cut automatically


def speech_mask(env, a, b):
    e = env[int(round(a * 100)):int(round(b * 100))]; sp = e >= -40
    i, n = 0, len(sp)
    while i < n:                                     # short quiet blobs (breath/click) are not speech
        if sp[i]:
            j = i
            while j < n and sp[j]:
                j += 1
            if (j - i) < 14 and e[i:j].max() < -32:
                sp[i:j] = False
            i = j
        else:
            i += 1
    return e, sp


def analyze(T0, T1=1e9, skip=(), room=None):
    room = room or {}
    env = J.env(); D = J.dump(); T = TL.load()
    words = [(w["src"] + .06, w["src"] + w["d"] - .06) for w in T["words"] if w["d"] > .15]
    aroll = os.path.basename(J.cfg["aroll"])
    clips, report = [], []
    for idx, c in enumerate(D["v"][0]):
        a, b = c["inP"], c["inP"] + (c["end"] - c["start"])
        mine = os.path.basename(c.get("path") or c["name"]) == aroll
        if not mine or c["start"] < T0 or c["start"] >= T1 or (c["end"] - c["start"]) > MAXCLIP or idx in skip:
            clips.append(dict(idx=idx, parts=[(a, b)], keep=True)); continue
        e, sp = speech_mask(env, a, b)
        if not sp.any():
            clips.append(dict(idx=idx, parts=[(a, b)], keep=True)); continue
        on = [k for k in range(len(sp)) if sp[k]]

        def back(k):                                 # from a -40 onset back through the attack (>= -50)
            while k > 0 and e[k - 1] >= -50:
                k -= 1
            return k

        def fwd(k):                                  # from a -40 offset forward to the last sounding frame of that word:
            i0 = int(round(a * 100))                 # through the decay AND a final consonant after a dip (TL.line_end)
            return min(len(e) - 1, max(k, int(round(TL.line_end(env, (i0 + k) / 100) * 100)) - 1 - i0))
        keep_in = env[int(round(a * 100))] > -40; keep_out = env[int(round(b * 100)) - 1] > -40
        s0 = a if keep_in else max(a, a + back(on[0]) / 100 - LEAD)          # never reach past the clip's own media
        s1 = b if keep_out else min(b, a + (fwd(on[-1]) + 1) / 100 + TRAIL)
        # a line's last word can trail off under -40 dB ("edi-tor" at -45, video 13): never cut before the transcript's
        # last word in this clip has ended and decayed
        last = max([w["src"] + w["d"] for w in T["words"] if a - .01 <= w["src"] < b], default=None)
        if last is not None and not keep_out and last + TRAIL > s1:
            k = min(len(e) - 1, int(round((last - a) * 100)))
            s1 = min(b, a + (fwd(k) + 1) / 100 + TRAIL)
        runs = []; k = on[0]
        while k <= on[-1]:
            if not sp[k]:
                j = k
                while j <= on[-1] and not sp[j]:
                    j += 1
                g0 = fwd(k - 1) + 1; g1 = back(j)      # the quiet between one word's decay and the next one's attack
                if (g1 - g0) / 100 >= MINGAP and not any(w0 < a + g1 / 100 - .02 and w1 > a + g0 / 100 + .02 for w0, w1 in words):
                    runs.append((a + g0 / 100, a + g1 / 100))
                k = j
            else:
                k += 1
        parts = []; cur = s0
        for r0, r1 in runs:
            parts.append((cur, r0 + GAP * .6)); cur = r1 - GAP * .4
        if idx in room:                                # extra room after the line: only real silence, never a breath
            k = int(round(s1 * 100)); n = 0
            while k < len(env) and env[k] >= -50 and k < int(round(s1 * 100)) + 30:      # let the word finish decaying first
                k += 1
            while n < int(room[idx] * 100) and k + n < len(env) and env[k + n] < -44:     # room noise ticks reach -45; a breath is louder
                n += 1
            s1 = max(s1, (k + n) / 100)
        parts.append((cur, s1))
        cut = (b - a) - sum(y - x for x, y in parts)
        clips.append(dict(idx=idx, parts=parts, keep=False, cut=round(cut, 3)))
        if cut > .05:
            report.append(f"clip {idx:3d}  tl {c['start']:8.2f}  cut {cut:5.2f} s  gaps {[(round(x - a, 2), round(y - x, 2)) for x, y in runs]}")
    json.dump(dict(T0=T0, T1=T1, clips=clips), open(J.w("recut.json"), "w"), indent=0)
    print("\n".join(report))
    print(f"total cut {sum(c.get('cut', 0) for c in clips):.2f} s over {sum(1 for c in clips if c.get('cut', 0) > .05)} clips -> {J.w('recut.json')}")


def plan():
    """New V1 pieces (whole frames, contiguous except real gaps) + where every other clip from T0 on moves to."""
    D = J.dump(); R = json.load(open(J.w("recut.json"))); T0 = R["T0"]; V = D["v"][0]
    old = TL.build(D, []); aroll = os.path.basename(J.cfg["aroll"])
    pieces, cur, prev_end = [], None, None
    for c, r in zip(V, R["clips"]):
        if c["start"] < T0:
            continue
        if cur is None:
            cur = fr(c["start"]); prev_end = c["start"]
        cur += fr(c["start"] - prev_end)           # a real gap in V1 (a full-screen hold) keeps its length
        prev_end = c["end"]
        if os.path.basename(c.get("path") or c["name"]) != aroll:
            sys.exit(f"V1 clip {r['idx']} at {c['start']:.2f} is not the A-roll ({c['name']}): plan only handles A-roll on V1")
        for x, y in r["parts"]:
            n = fr(y - x) if not r["keep"] else fr(c["end"] - c["start"])
            ip = fr(x if not r["keep"] else c["inP"]) / FPS       # whole source frames, exactly what relay.py lays
            pieces.append(dict(start=round(cur / FPS, 4), end=round((cur + n) / FPS, 4), inP=round(ip, 4), outP=round(ip + n / FPS, 4), path=c.get("path")))
            cur += n
    new = dict(v1=[p for p in old["v1"] if p["start"] < T0] + pieces, words=[])
    M = TL.TimeMap(old, new)
    moves = []
    for kind in ("v", "a"):
        for ti, tr in enumerate(D[kind]):
            if ti == 0:
                continue                              # V1/A1 are re-laid from the pieces
            for c in tr:
                if c["start"] >= T0 - 1e-3:
                    to = round(fr(M(c["start"])) / FPS, 4)
                    if abs(to - c["start"]) > 1e-3:
                        moves.append(dict(track=f"{kind.upper()}{ti + 1}", start=round(c["start"], 4), name=c["name"], to=to))
    v1_end = max(c["end"] for c in V)                 # the A-roll's end (the sequence end also counts music and SFX)
    P = dict(T0=T0, v1=pieces, moves=moves, old_end=round(v1_end, 4), new_end=pieces[-1]["end"] if pieces else round(v1_end, 4))
    json.dump(P, open(J.w("relay-plan.json"), "w"), indent=0)
    print(f"{len(pieces)} V1 pieces from {T0:.2f}; {len(moves)} other clips move; A-roll ends {P['old_end']:.2f} -> {P['new_end']:.2f} -> {J.w('relay-plan.json')}")


if __name__ == "__main__":
    a = sys.argv[1:]; cmd = a[0] if a else ""
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if cmd == "analyze":
        analyze(float(opt("--from", 0)), float(opt("--to", 1e9)), {int(x) for x in opt("--skip", "").split(",") if x},
                {int(x.split(":")[0]): float(x.split(":")[1]) for x in opt("--room", "").split(",") if x})
    elif cmd == "plan":
        plan()
    else:
        print(__doc__)
