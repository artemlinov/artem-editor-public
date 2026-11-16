"""proof.py: transcription-proof a re-cut before it touches Premiere (rules/pacing.md: "transcription-proof every changed clip").

  .venv/bin/python pipeline/proof.py [--min 0.05]      # every clip work/recut.json shortens by more than --min seconds

Each changed clip is transcribed twice, as it is now and as the re-cut would play it (its parts joined with 60 ms of
silence), and the two texts are compared. OK = the same words (similarity >= 0.97). DIFF prints both texts: look at it,
because a DIFF is either a clipped word (fix the cut) or Whisper hearing the same audio two ways (fine).
Writes work/proof.json.
"""
import difflib, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from job import J, whisper  # noqa: E402

norm = lambda t: [x for x in re.sub(r"[^a-z0-9 ]", " ", t.lower().replace("'", "")).split() if x]


def main(minimum=0.05):
    import numpy as np
    A, sr = J.audio16(); D = J.dump()["v"][0]; R = json.load(open(J.w("recut.json")))["clips"]
    pad = lambda x: np.concatenate([np.zeros(int(sr * .3), np.float32), x, np.zeros(int(sr * .3), np.float32)])
    out = []; bad = 0
    for c in R:
        if c.get("keep") or c.get("cut", 0) <= minimum:
            continue
        v = D[c["idx"]]; a = v["inP"]; b = a + (v["end"] - v["start"])
        old = whisper(pad(A[int(a * sr):int(b * sr)]))
        new = whisper(pad(np.concatenate(sum([[A[int(x * sr):int(y * sr)], np.zeros(int(sr * .06), np.float32)] for x, y in c["parts"]], []))))
        r = difflib.SequenceMatcher(None, norm(old), norm(new)).ratio(); ok = r >= .97; bad += not ok
        out.append(dict(idx=c["idx"], tl=round(v["start"], 3), old=old, new=new, ratio=round(r, 3), ok=ok))
        print(("OK  " if ok else "DIFF"), c["idx"], f"tl {v['start']:.2f}", round(r, 3), "" if ok else f"\n   NOW: {old}\n   CUT: {new}", flush=True)
    json.dump(out, open(J.w("proof.json"), "w"), indent=1)
    print(f"{len(out) - bad} OK, {bad} DIFF -> {J.w('proof.json')}")


if __name__ == "__main__":
    a = sys.argv[1:]
    main(float(a[a.index("--min") + 1]) if "--min" in a else 0.05)
