"""retakes.py: find the takes a whole-file transcript hides (rules/takes.md; memory: retake transcription).

  .venv/bin/python pipeline/retakes.py chunks [<s0> <s1>]   # every speech island of the camera file (or a source span),
                                                            #   transcribed on its own -> work/chunks.json + printed
  .venv/bin/python pipeline/retakes.py fine <chunk> [<chunk> ...] [--gap 0.18]   # re-split those chunks at shorter pauses and
                                                            #   transcribe each part: finds a repeat hidden INSIDE one
                                                            #   island (Whisper stretches one sentence over two takes)
                                                            #   -> work/fine.json {chunk: [{a, b, text}]}
  .venv/bin/python pipeline/retakes.py runon                # for each A-roll piece in the cut: does he keep talking right
                                                            #   after its out point? If that speech repeats the piece's
                                                            #   line, it is a later take of the same line (HIDDEN?)

Whisper over a whole file merges back-to-back retakes into one sentence and drops words, so take selection reads the
islands one by one: a new island starts after >= 0.45 s below -50 dB. Times are SOURCE seconds of the camera file.
The take rule itself (last full fluent take, gaze, warm-up run-ups) lives in rules/takes.md.
"""
import difflib, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from job import J, whisper  # noqa: E402

norm = lambda t: " ".join(re.sub(r"[^a-z0-9 ]", "", t.lower()).split())


def islands(env, a, b, gap=0.45):
    e = env[int(a * 100):int(b * 100)] > -50; out = []; st = last = None
    for i, v in enumerate(e):
        t = a + i / 100
        if v:
            st = t if st is None else st; last = t
        elif st is not None and t - last > gap:
            out.append((st, last)); st = None
    if st is not None:
        out.append((st, last))
    return [(s, e_) for s, e_ in out if e_ - s >= 0.25]


def chunks(s0=None, s1=None):
    import numpy as np
    env = J.env(); A, sr = J.audio16()
    s0 = 0.0 if s0 is None else s0; s1 = len(env) / 100 if s1 is None else s1
    out = []
    for s, e in islands(env, s0, s1):
        seg = np.concatenate([np.zeros(int(sr * .3), np.float32), A[int((s - .05) * sr):int((e + .15) * sr)], np.zeros(int(sr * .3), np.float32)])
        t, ws = whisper(seg, words=True)
        out.append(dict(a=round(s, 3), b=round(e, 3), text=t,
                        words=[dict(w=w["word"].strip(), s=round(s - .05 + w["start"] - .3, 3), e=round(s - .05 + w["end"] - .3, 3)) for w in ws]))
        print(f"{s:8.2f}-{e:8.2f} | {t}", flush=True)
    f = J.w("chunks.json")
    if os.path.exists(f) and (s0 > 0 or s1 < len(env) / 100):       # a span: merge into the file's other chunks
        old = [c for c in json.load(open(f)) if c["b"] < s0 or c["a"] > s1]
        out = sorted(old + out, key=lambda c: c["a"])
    json.dump(out, open(f, "w"), indent=0)
    print(f"{len(out)} chunks -> {f}")


def fine(idx, gap=0.18):
    import numpy as np
    env = J.env(); A, sr = J.audio16(); C = json.load(open(J.w("chunks.json")))
    f = J.w("fine.json"); out = json.load(open(f)) if os.path.exists(f) else {}
    for i in idx:
        c = C[i]; parts = []
        for s, e in islands(env, c["a"] - .1, c["b"] + .2, gap):
            seg = np.concatenate([np.zeros(int(sr * .3), np.float32), A[int((s - .05) * sr):int((e + .12) * sr)], np.zeros(int(sr * .3), np.float32)])
            parts.append(dict(a=round(s, 2), b=round(e, 2), text=whisper(seg).strip()))
        out[str(i)] = parts
        print(f"#{i} " + " ".join(f"[{p['a']:.2f}-{p['b']:.2f}] {p['text']}" for p in parts), flush=True)
    json.dump(out, open(f, "w"), indent=0)


def runon():
    import numpy as np
    env = J.env(); A, sr = J.audio16(); T = J.timeline()

    def run_end(s, maxlen=14):                     # speech continuing from s until a >= 0.6 s pause
        i = int(s * 100); end = i; quiet = 0
        while i < int((s + maxlen) * 100) and i < len(env):
            if env[i] > -50:
                end = i; quiet = 0
            else:
                quiet += 1
                if quiet >= 60:
                    break
            i += 1
        return end / 100
    for p in T["v1"]:
        e = run_end(p["outP"])
        if e - p["outP"] < 0.8:
            continue
        seg = np.concatenate([np.zeros(int(sr * .3), np.float32), A[int(p["outP"] * sr):int((e + .15) * sr)], np.zeros(int(sr * .3), np.float32)])
        heard = whisper(seg)
        mine = " ".join(w["w"] for w in T["words"] if p["start"] - 1e-3 <= w["t"] < p["end"])
        sents = [x for x in re.split(r"(?<=[.!?])\s+", mine) if x] + [mine]
        r, best = max(((difflib.SequenceMatcher(None, norm(heard), norm(x)).ratio(), x) for x in sents), default=(0, ""))
        flag = "HIDDEN?" if r > .6 and len(norm(heard).split()) >= 3 else "       "   # 1-2 words is a tail, not a take
        print(f"{flag} tl {p['start']:8.2f}  after src {p['outP']:.2f}..{e:.2f}  heard: {heard[:80]}  ~ {best[:50]} ({r:.2f})", flush=True)


if __name__ == "__main__":
    a = sys.argv[1:]; cmd = a[0] if a else ""
    if cmd == "chunks":
        chunks(*(float(x) for x in a[1:3])) if len(a) >= 3 else chunks()
    elif cmd == "fine":
        g = float(a[a.index("--gap") + 1]) if "--gap" in a else 0.18
        fine([int(x) for x in a[1:] if x.lstrip("-").isdigit()], g)
    elif cmd == "runon":
        runon()
    else:
        print(__doc__)
