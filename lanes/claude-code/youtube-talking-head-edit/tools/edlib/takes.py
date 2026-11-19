"""Transcription island by island (so retakes can't hide), and assembling the cut from the takes Claude picked.

The take choice stays with Claude. These tools only do the mechanics: find clean in and out points on the audio
level, cut dead air inside a take, assemble the voice with crossfades, and prove every line by transcribing it again.
"""
import json, os, concurrent.futures as cf
import numpy as np
from . import job as J, audio as A, stt, text as T

PAD = 0.3


# ---------------------------------------------------------------- transcription

def transcribe(jb, prompt=None, gap=0.45):
    lv = A.extract(jb)
    e = A.env(jb)
    dur = len(e) * A.HOP
    isl = A.islands(e, 0, dur, lv["in"], gap=gap)
    out_f = jb.p("islands.json")
    done = {(round(i["a"], 3), round(i["b"], 3)): i for i in json.load(open(out_f))} if os.path.exists(out_f) else {}
    lang = jb.meta.get("language")
    if not lang:                                     # detect once on the first ~30 s of speech, then keep it fixed
        x = np.concatenate([A.clip16(jb, a, b, 0.1) for a, b in isl[:40]])[:16000 * 30]
        _, _, lang = stt.transcribe(x, words=False)
        jb.meta["language"] = lang
        jb.save()
    res = []
    for n, (a, b) in enumerate(isl):
        key = (round(a, 3), round(b, 3))
        if key in done:
            res.append(done[key]); continue
        a0 = max(0.0, a - 0.05)
        clip = A.clip16(jb, a0, b + 0.15, PAD)
        txt, ws, _ = stt.transcribe(clip, language=lang, prompt=prompt if b - a >= 1.5 else None)
        if _garbled(txt, b - a):                     # a hallucination on a noise or a loop: try once without the prompt
            txt, ws, _ = stt.transcribe(clip, language=lang)
            if _garbled(txt, b - a):
                txt, ws = "(unclear)", []
        res.append({"a": key[0], "b": key[1], "text": txt,
                    "words": [{"w": w["w"], "s": round(a0 + w["s"] - PAD, 3), "e": round(a0 + w["e"] - PAD, 3)} for w in ws]})
        if n % 25 == 0:
            json.dump(res, open(out_f, "w"))
            print(f"  {n + 1}/{len(isl)} islands  {J.tc(a)}", flush=True)
    json.dump(res, open(out_f, "w"))
    with open(jb.p("islands.txt"), "w") as f:
        for n, i in enumerate(res):
            f.write(f"#{n:<4} {J.tc(i['a'])}-{J.tc(i['b'])}  ({i['b'] - i['a']:4.1f}s)  {i['text']}\n")
    print(f"{len(res)} speech islands ({lang}) -> {jb.p('islands.txt')}")


def _garbled(txt, dur):
    """Speech runs at about 15 characters a second; far more, or the same few words over and over, is Whisper
    inventing text (it does on noise and on its own prompt)."""
    if len(txt) > 40 * max(dur, 0.5) + 20:
        return True
    w = T.words(txt)
    if len(w) >= 12:
        grams = [" ".join(w[i:i + 3]) for i in range(len(w) - 2)]
        top = max(grams.count(g) for g in set(grams))
        if top >= 4 and top * 3 > len(w) * 0.5:
            return True
    return False


def fine(jb, ns, gap=0.18):
    """Re-split islands at shorter pauses: finds a repeat hidden inside one island."""
    lv = jb.meta["levels"]; e = A.env(jb); isl = json.load(open(jb.p("islands.json")))
    lang = jb.meta.get("language")
    for n in ns:
        i = isl[n]; parts = []
        for a, b in A.islands(e, i["a"] - 0.1, i["b"] + 0.2, lv["in"], gap=gap, minlen=0.1):
            txt, _, _ = stt.transcribe(A.clip16(jb, max(0, a - 0.04), b + 0.12, PAD), language=lang, words=False)
            parts.append(f"[{J.tc(a)}-{J.tc(b)}] {txt}")
        print(f"#{n}  " + "  ".join(parts), flush=True)


# ---------------------------------------------------------------- edges

def _active(e, i, thr):
    return 0 <= i < len(e) and e[i] > thr


def edges(e, a, b, lv, nxt_on=None):
    """Clean in and out points (seconds) for the speech between rough a and b."""
    H = A.HOP; ti, to = lv["in"], lv["out"]; runon = False
    i = int(a / H)
    if _active(e, i, ti):                            # inside sound: back up to the word's attack, but only a little:
        k = i; quiet = 0                             # sound further back is the end of an earlier attempt
        while k > i - int(0.12 / H) and k > 0:
            k -= 1
            quiet = quiet + 1 if not _active(e, k, ti) else 0
            if quiet * H >= 0.04:
                break
        on = (k + quiet) * H if quiet * H >= 0.04 else a - 0.03
    else:                                            # in silence: forward to the first sound
        k = i
        while k < i + int(0.35 / H) and not _active(e, k, ti):
            k += 1
        on = k * H
    j = int(b / H)
    if _active(e, j, ti):                            # still sounding at b: the last word's own decay, at most 0.15 s
        k = j; quiet = 0
        while k < j + int(0.15 / H):
            k += 1
            quiet = quiet + 1 if not _active(e, k, ti) else 0
            if quiet * H >= 0.04:
                break
        if quiet * H >= 0.04:
            last = (k - quiet + 1) * H
        else:                                        # no dip at all: he runs straight on into more words
            last = b; runon = True
    else:                                            # already quiet: back to the last sound
        k = j
        while k > j - int(0.35 / H) and not _active(e, k, ti):
            k -= 1
        last = (k + 1) * H
    end = int(last / H)
    if not runon:                                    # a soft last consonant after the dip (the -ts of "cents"):
        k = end; quiet = 0                           # carry on above the out level, dips under 0.1 s, at most 0.25 s
        while k < int((last + 0.25) / H):
            if _active(e, k, to):
                end = k; quiet = 0
            else:
                quiet += 1
                if quiet * H >= 0.1:
                    break
            k += 1
        if k >= int((last + 0.25) / H) and quiet * H < 0.1:
            end = int(last / H)                      # never went quiet: that was a breath or the next line, not a consonant
    off = end * H + 3 / 30 if not runon else last + 2 / 30
    if nxt_on is not None and off > nxt_on - 0.04:
        off = max(last, nxt_on - 0.04)
    return on, off, runon


def in_point(jb, e, lv, on, off, text, lang=None):
    """`on` moved past a click or breath before the first word, kept only if the first word is still heard there."""
    on2 = _skip_blips(e, on, lv["in"], lv.get("speech"), off)
    if on2 - on < 1.5 / float(jb.fps) or not text:
        return on2
    h, _, _ = stt.transcribe(A.clip16(jb, on2, min(on2 + 1.6, off), PAD), language=lang, words=False)
    got, want = T.words(h), T.words(text)
    import difflib
    if got and want and difflib.SequenceMatcher(None, got[0], want[0]).ratio() >= 0.75:
        return on2
    return on


def _skip_blips(e, on, thr, speech, limit, within=0.6):
    """The in point at the first word, not at a mouth click or breath before it. The word starts where the sound stays
    within 20 dB of the speech level for 30 ms; walking back from there, sound joined to it (a soft s, h or f) stays,
    and so does a sound of 60 ms or more just before a short stop (the s of "step"); anything before a gap is dropped."""
    H = A.HOP; i = int(on / H); stop = min(int((on + within) / H), int(limit / H), len(e) - 6)
    strong = (speech if speech is not None else -22) - 20
    k = i
    while k < stop and e[k:k + 6].min() < strong:
        k += 1
    if k >= stop:
        return on
    runs, s = [], None                                 # sound runs from the in point up to the word
    for x in range(i, k + 1):
        act = x == k or e[x] > thr
        if act and s is None:
            s = x
        elif not act and s is not None:
            runs.append((s, x)); s = None
    runs.append((s, k + 1))
    keep = runs[-1][0]
    for r0, r1 in reversed(runs[:-1]):
        gap, length = (keep - r1) * H, (r1 - r0) * H
        if gap < 0.02 or (length >= 0.06 and gap < 0.08):
            keep = r0
        else:
            break
    return max(on, keep * H)


# ---------------------------------------------------------------- in and out points from the line's own words
# The rough times in takes.json come from the transcript and are often 0.1-0.4 s off. Where the speaker runs straight
# from one attempt into the next, a cut placed from them lands inside a word: the tail of the attempt before plays at
# the start of the line, or the line's last word is cut short. So each edge is found from the line's own first and last
# word, located in a fresh word-timed transcript of that moment, then placed exactly on the sound.

def _raw(s):
    import re
    return re.findall(r"[a-z0-9']+", s.lower().replace("\u2019", "'"))


def _words_in(jb, x0, x1, lang):
    """Verbatim word times (source seconds) in x0..x1: [(word, start, end)], each word as raw lowercase tokens."""
    x0 = max(0.0, x0)
    _, ws, _ = stt.transcribe(A.clip16(jb, x0, x1, PAD), language=lang)
    out = []
    for w in ws:
        for n in _raw(w["w"]):
            out.append((n, x0 + w["s"] - PAD, x0 + w["e"] - PAD))
    return out


def _find(W, tw, at, first):
    """Index in W of the line's first (or last) word near `at`. Among the places where the line's opening (closing)
    words are said, the one that goes on (came before) with most of the line wins, so a restart is skipped."""
    best = None
    for k in range(len(W)):
        if not T.same(W[k][0], tw[0 if first else -1]):
            continue
        n = 0
        while n < min(4, len(tw)):
            i, j = (k + n, n) if first else (k - n, len(tw) - 1 - n)
            if 0 <= i < len(W) and T.same(W[i][0], tw[j]):
                n += 1
            else:
                break
        if n < min(2, len(tw)):
            continue
        d = abs(W[k][1 if first else 2] - at)
        if d <= 0.9 and (best is None or (n, -d) > best[0]):
            best = ((n, -d), k)
    return None if best is None else best[1]


def _anchor(jb, a, b, text, lang):
    """((first word start, first word end, end of the word before or None), (last word start, last word end, start of
    the word after or None)), either None where that word can't be found near the rough time."""
    tw = _raw(text)
    if not tw:
        return None, None
    W = _words_in(jb, a - 1.2, a + 1.8, lang)
    k = _find(W, tw, a, True)
    head = None if k is None else (W[k][1], W[k][2], W[k - 1][2] if k > 0 else None)
    W = _words_in(jb, b - 1.8, b + 1.2, lang)
    m = _find(W, tw, b, False)
    tail = None if m is None else (W[m][1], W[m][2], W[m + 1][1] if m + 1 < len(W) else None)
    return head, tail


def _dip(e, a0, a1, last):
    """Where two words run together, the dip between them: scanning away from the word being kept (from the left for
    an out point, from the right for an in point), the first dip at least 10 dB under that word's level, cut in the
    middle of its bottom. The short silences inside the next word (the tt of "better") come later in the scan."""
    a0, a1 = max(0, a0), min(len(e), a1)
    if a1 - a0 < 3:
        return a0
    sm = np.convolve(e[a0:a1], np.ones(3) / 3, mode="same")
    n = len(sm)
    for i in (range(n - 2, 0, -1) if last else range(1, n - 1)):
        if sm[i] <= sm[i - 1] and sm[i] <= sm[i + 1]:
            ref = sm[i + 1:].max() if last else sm[:i].max()
            if ref - sm[i] >= 10:
                j0 = i
                while j0 > 0 and sm[j0 - 1] <= sm[i] + 3:
                    j0 -= 1
                j1 = i
                while j1 < n - 1 and sm[j1 + 1] <= sm[i] + 3:
                    j1 += 1
                return a0 + (j0 + j1) // 2
    return a0 + int(np.argmin(sm))


def _in_at(e, lv, ws, w0e, pe):
    """In point: the attack of the first word. Its voiced part is found (20 ms within 20 dB of the speech level), after
    the first real gap past the word before if there is one, then the in point walks back through the sound joined to
    it. After silence, a soft start, or a longer sound just before a short stop (the s of "step"), stays; a click or
    breath before a gap goes. Right after another word, any gap is the boundary, and with no gap at all the cut goes
    in the last dip before the word."""
    H = A.HOP; thr = lv["in"]
    near = pe is not None and ws - pe < 0.6
    lo = max(0, int(((pe - 0.08) if pe is not None else ws - 0.6) / H))
    k = max(lo, int(max(ws - 0.1, 0.0) / H))
    if pe is not None:                               # past the word before: after its first real gap, if any
        g, q = int((pe - 0.05) / H), 0
        while g < int((ws + 0.35) / H) and g < len(e):   # the transcript often starts the word too early
            q = q + 1 if e[g] <= thr else 0
            if q * H >= 0.015:
                while g < len(e) and e[g] <= thr:
                    g += 1
                k = max(k, g)
                break
            g += 1
        else:
            k = max(k, int((pe + 0.02) / H))
    stop = min(len(e) - 4, int((w0e + 0.15) / H))
    if k >= stop:
        return None
    strong = (lv.get("speech") if lv.get("speech") is not None else -22) - 20
    while k < stop and e[k:k + 4].min() < strong:      # 20 ms within 20 dB of the speech level: a short, quiet
        k += 1                                        # first word ("It") counts; a breath or click doesn't
    if k >= stop:
        return None
    runs, s = [], None
    for x in range(lo, k + 1):
        act = x == k or e[x] > thr
        if act and s is None:
            s = x
        elif not act and s is not None:
            runs.append((s, x)); s = None
    runs.append((s, k + 1))
    keep = runs[-1][0]
    for r0, r1 in reversed(runs[:-1]):
        gap, length = (keep - r1) * H, (r1 - r0) * H
        if gap < 0.015 or (not near and length >= 0.06 and gap < 0.08):
            keep = r0
        else:
            break
    if near and k > lo and (keep <= lo + 1 or keep * H < pe - 0.03):
        keep = _dip(e, lo, k, last=True)              # walked back into the word before: cut between the two
    return keep * H


def _out_at(e, lv, wls, we, ns):
    """Out point after the last word: past its decay and any soft last consonant (the release of a final t or k after
    its short silence), never into the next word. With no pause before the next word, the cut goes in the dip between
    them. Returns (seconds, ran on)."""
    H = A.HOP; ti, to = lv["in"], lv["out"]
    lim = min(len(e) - 1, int((max(ns - 0.02, we + 0.15) if ns is not None else we + 0.5) / H))
    j = int(we / H)
    if _active(e, j, ti):
        k = j; quiet = 0
        while k < lim:
            k += 1
            quiet = quiet + 1 if not _active(e, k, ti) else 0
            if quiet * H >= 0.04:
                break
        if quiet * H < 0.04:
            a0 = int((we - 0.05) / H)
            a1 = min(len(e), int(((ns + 0.2) if ns is not None else we + 0.3) / H))
            return (_dip(e, a0, a1, last=False) * H if a1 > a0 else we), True
        last = (k - quiet + 1) * H
    else:
        k = j
        while k > int(wls / H) and not _active(e, k, ti):
            k -= 1
        last = (k + 1) * H
    end = int(last / H); k = end; quiet = 0; stop = min(int((last + 0.25) / H), max(lim, end + 1))
    while k < stop:
        if _active(e, k, to):
            end = k; quiet = 0
        else:
            quiet += 1
            if quiet * H >= 0.1:
                break
        k += 1
    if k >= int((last + 0.25) / H) and quiet * H < 0.1:
        end = int(last / H)                          # never went quiet: a breath or the next line, not a consonant
    off = end * H + 3 / 30
    if ns is not None:
        off = min(off, max(last, ns - 0.04))
    return off, False


def _repeats(text, heard):
    """Words of the line heard more times than the line says them (a stutter, a restart, or the end of another attempt
    leaking in at an edge), or None. A word only spelled differently ("Claude2" for "Claude too") isn't a repeat."""
    tw, hw = T.words(text), T.words(heard)
    for chunk in T.diff(text, heard)[1]:
        for w in chunk.split():
            if len(w) < 3 or not any(T.same(w, t) for t in tw):
                continue
            if sum(T.same(w, h) for h in hw) > sum(T.same(w, t) for t in tw):
                return chunk
    return None


def next_onset(e, t, thr, within=1.0):
    H = A.HOP; k = int(t / H)
    while k < int((t + within) / H) and k < len(e):
        if e[k] > thr:
            return k * H
        k += 1
    return None


def dead_air(e, a, b, thr, gap=0.45, keep=0.07):
    """Silences of >= gap inside a..b, as (cut_from, cut_to) leaving `keep` seconds on each side."""
    out = []
    for s, t in _quiet_runs(e, a, b, thr):
        if t - s >= gap:
            out.append((s + keep, t - keep))
    return out


def _quiet_runs(e, a, b, thr):
    H = A.HOP; i0, i1 = int(a / H), int(b / H)
    q = e[i0:i1] <= thr
    runs, st = [], None
    for i, v in enumerate(q):
        if v and st is None:
            st = i
        elif not v and st is not None:
            runs.append(((i0 + st) * H, (i0 + i) * H)); st = None
    return runs


def subtract(span, cuts):
    a, b = span; pieces = [(a, b)]
    for c0, c1 in sorted(cuts):
        nxt = []
        for p0, p1 in pieces:
            if c1 <= p0 or c0 >= p1:
                nxt.append((p0, p1)); continue
            if c0 > p0:
                nxt.append((p0, c0))
            if c1 < p1:
                nxt.append((c1, p1))
        pieces = nxt
    return [(p0, p1) for p0, p1 in pieces if p1 - p0 > 0.04]


# ---------------------------------------------------------------- the cut

def cut(jb, takes_path, prompt=None):
    spec = json.load(open(takes_path))
    lines = spec["lines"] if isinstance(spec, dict) else spec
    lv = jb.meta.get("levels") or A.extract(jb)
    e = A.env(jb); fps = jb.fps; lang = jb.meta.get("language")
    xf = 2                                            # crossfade frames on each side of a join (4 in all)
    items, report, tl, carry = [], [], 0, 0.0
    for ln in lines:
        lid = ln["id"]
        if ln.get("clip"):                            # a played clip with its own picture and sound
            info = J.probe(ln["clip"])
            a, b = ln.get("src", [0, info["duration"]])
            n = int(round((b - a) * fps))
            items.append({"id": lid, "kind": "clip", "file": os.path.abspath(ln["clip"]), "src_s": [a, b],
                          "tl": [tl, tl + n], "audio": info["audio"]})
            report.append(f"{lid:6} clip  {n} frames  {os.path.basename(ln['clip'])}")
            tl += n; carry = 0.0; continue
        a, b = ln["src"]
        text = ln.get("text", "")
        nxt = next_onset(e, b + 0.12, lv["in"], 1.2)
        on0, off0, run0 = edges(e, a, b, lv, nxt)    # from the sound alone: used where a word can't be found
        head, tail = _anchor(jb, a, b, text, lang) if text else (None, None)
        x = _in_at(e, lv, *head) if head else None
        on = x if x is not None else in_point(jb, e, lv, on0, off0, text, lang)
        off, runon = _out_at(e, lv, *tail) if tail else (off0, run0)
        notes = []
        if off - on < 0.2:
            on, off, runon = on0, off0, run0
            notes.append("its first and last word weren't found where src says: check src")
        if runon:
            notes.append("no pause after the last word: cut in the dip before the next one")
        if carry:                                     # room the line before couldn't get: as silence before this one
            k = int(on / A.HOP); q = 0
            while q * A.HOP < carry and k - q - 1 > 0 and e[k - q - 1] <= lv["in"]:
                q += 1
            on -= max(0.0, q * A.HOP - 0.02)
            carry = 0.0
        cuts = dead_air(e, on, off, lv["in"]) + [tuple(d) for d in ln.get("drop", [])]
        pieces = subtract((on, off), cuts)
        room = float(ln.get("room", 0))
        if room:
            nx = next_onset(e, pieces[-1][1], lv["in"], room + 0.3)
            ext = room if nx is None else max(0.0, min(room, nx - pieces[-1][1] - 0.05))
            if ext < room - 0.02:
                carry = room - ext
                notes.append(f"room: {ext:.2f}s after it (speech follows), the rest before the next line")
            pieces[-1] = (pieces[-1][0], pieces[-1][1] + ext)
        fr = []
        for s0, s1 in pieces:
            S0, S1 = int(np.floor(s0 * fps)), int(np.ceil(s1 * fps))
            if fr and S0 <= fr[-1]["src"][1]:
                fr[-1]["src"][1] = max(fr[-1]["src"][1], S1)
            else:
                fr.append({"src": [S0, S1]})
        prev = items[-1] if items and items[-1]["kind"] == "aroll" else None
        if prev:                                      # said in one go with the line before: that line ends exactly
            lp = prev["pieces"][-1]                   # where this one starts, so no sound plays twice
            if lp["src"][0] < fr[0]["src"][0] < lp["src"][1]:
                d = lp["src"][1] - fr[0]["src"][0]
                lp["src"][1] -= d; lp["tl"][1] -= d; prev["tl"][1] -= d; tl -= d
        t0 = tl
        for p in fr:
            n = p["src"][1] - p["src"][0]
            p["tl"] = [tl, tl + n]; tl += n
        items.append({"id": lid, "kind": "aroll", "text": ln.get("text", ""), "tl": [t0, tl], "pieces": fr,
                      "room": room, "notes": notes, "pic_lead": int(ln.get("pic_lead", 0))})
    total = tl
    # verify every line: transcribe exactly what the cut plays
    def check(it):
        if it["kind"] != "aroll":
            return it
        x16 = A.load16(jb)
        x = np.concatenate([x16[int(p["src"][0] / fps * 16000):int(p["src"][1] / fps * 16000)] for p in it["pieces"]])
        z = np.zeros(int(PAD * 16000), np.float32)
        heard, ws, _ = stt.transcribe(np.concatenate([z, x, z]), language=lang, prompt=prompt)
        if _garbled(heard, len(x) / 16000):
            heard, ws, _ = stt.transcribe(np.concatenate([z, x, z]), language=lang)
        it["heard"] = heard
        it["words"] = _onsets(it, ws, e, lv["in"], fps)
        if it["text"]:
            miss, extra, r = T.diff(it["text"], heard)
            it["check"] = {"missing": miss, "extra": extra, "ratio": r}
            # the names prompt makes the speech model tidy up repeats; listen again without it for stutters and
            # restarts, and for the end of another attempt leaking in at either edge
            verb, _, _ = stt.transcribe(np.concatenate([z, x, z]), language=lang, words=False)
            rep = _repeats(it["text"], verb)
            if rep:
                it["notes"].append(f"SAID TWICE? \"{rep}\" in: \"{verb[:100]}\"")
        # a later take hiding right after the out point?
        last_src = it["pieces"][-1]["src"][1] / fps
        on = next_onset(e, float(last_src), lv["in"], 0.6)
        if on is not None and it["text"]:
            end = on; quiet = 0; k = int(on / A.HOP)
            while k < int((on + 12) / A.HOP) and k < len(e):
                quiet = quiet + 1 if e[k] <= lv["in"] else 0
                if quiet * A.HOP >= 0.6:
                    break
                end = k * A.HOP; k += 1
            if end - on > 0.6:
                h2, _, _ = stt.transcribe(A.clip16(jb, on - 0.04, end + 0.1, PAD), language=lang, words=False)
                tw, hw = T.words(it["text"]), T.words(h2)
                if len(hw) >= 3 and (T.ratio(it["text"], h2) > 0.55 or hw[:3] == tw[:3]):
                    it["notes"].append(f"LATER TAKE? at {J.tc(on)}: \"{h2[:90]}\"")
        return it
    with cf.ThreadPoolExecutor(1) as ex:             # the speech model is not thread-safe; keep one
        items = list(ex.map(check, items))
    meta = {"fps": [fps.numerator, fps.denominator], "width": jb.W, "height": jb.H, "total": total, "items": items}
    json.dump(meta, open(jb.p("cut.json"), "w"), indent=1)
    _voice(jb, items, total, xf)
    _timeline_txt(jb, items)
    _gaze_sheets(jb, items)
    for it in items:
        if it["kind"] != "aroll":
            continue
        c = it.get("check") or {}
        flag = "OK   " if not (c.get("missing") or c.get("extra") or
                                  any(n.startswith(("LATER", "SAID TWICE")) for n in it["notes"])) else "CHECK"
        bits = []
        if c.get("missing"):
            bits.append("missing: " + " / ".join(c["missing"]))
        if c.get("extra"):
            bits.append("extra: " + " / ".join(c["extra"]))
        bits += it["notes"]
        report.append(f"{it['id']:6} {flag} {J.tc(jb.f2s(it['tl'][0]))} {len(it['pieces'])}pc  " +
                      ("; ".join(bits) if bits else it["heard"][:70]))
    open(jb.p("cut_report.txt"), "w").write("\n".join(report) + "\n")
    print("\n".join(report))
    print(f"cut: {len(items)} items, {J.tc(jb.f2s(total))} -> {jb.p('cut.json')}, {jb.p('timeline.txt')}, "
          f"gaze sheets in {jb.p('review')}")


def _onsets(it, ws, e, thr, fps):
    """Words on the output timeline, each start moved to where its sound actually begins (Whisper often starts a
    word early, the first one most of all)."""
    segs, cum = [], 0.0                              # (line-local start, source start, length) per piece
    for p in it["pieces"]:
        n = (p["src"][1] - p["src"][0]) / fps
        segs.append((cum, p["src"][0] / fps, n)); cum += n

    def src(t):
        for c0, s0, n in segs:
            if t < c0 + n:
                return float(s0 + max(0.0, t - c0))
        c0, s0, n = segs[-1]
        return float(s0 + n)
    out, f_line = [], it["tl"][0]
    for w in ws:
        s, en = max(0.0, w["s"] - PAD), max(0.0, w["e"] - PAD)
        ss = src(s); k = int(ss / A.HOP); lim = int(min(src(en), ss + 0.4) / A.HOP)
        while k < lim and k < len(e) and e[k] <= thr:
            k += 1
        s2 = s + (k * A.HOP - ss) if k < lim else s
        f0 = f_line + int(round(s2 * fps)); f1 = max(f0 + 1, f_line + int(round(en * fps)))
        out.append({"w": w["w"], "f0": max(f_line, f0), "f1": f1})
    return out


def _cp_fade(n):
    t = np.linspace(0, 1, n, dtype=np.float32)
    return np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)


def _voice(jb, items, total, xf):
    """voice.wav: the cut's A-roll sound, each join a constant-power crossfade. clips.wav: played clips' own sound."""
    import soundfile as sf
    SR = 48000; fps = jb.fps
    n = int(total / fps * SR) + SR
    v = np.zeros((n, 2), np.float32); c = np.zeros((n, 2), np.float32)
    src = A.load48(jb)
    if src.ndim == 1:
        src = np.stack([src, src], 1)
    ov = int(xf / fps * SR)
    fin, fout = _cp_fade(2 * ov)
    seq = []                                          # A-roll pieces in timeline order; None where a clip breaks them
    for it in items:
        if it["kind"] == "clip":
            seq.append(None)
            if it.get("audio"):
                a, b = it["src_s"]
                raw = J.subprocess.run([J.ffmpeg(), "-v", "error", "-ss", str(a), "-t", str(b - a), "-i", it["file"], "-vn",
                                        "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
                y = np.frombuffer(raw, np.float32).reshape(-1, 2)
                t0 = int(it["tl"][0] / fps * SR)
                m = min(len(y), n - t0); c[t0:t0 + m] += y[:m]
        else:
            seq.extend(it["pieces"])

    def joined(p, q):                                 # q follows p on the timeline and in the recording: one sound
        return p is not None and q is not None and p["src"][1] == q["src"][0] and p["tl"][1] == q["tl"][0]
    e = A.env(jb); thr = jb.meta.get("levels", {}).get("in", -50)

    def quiet(t0, t1):                                # the crossfade may reach past a cut only into silence
        i0, i1 = int(max(0.0, t0) / A.HOP), int(t1 / A.HOP) + 1
        return i1 <= i0 or float(e[i0:i1].max()) <= thr
    nf = int(0.008 * SR); sin_, sout = _cp_fade(nf)  # where it can't: a short fade inside the line, no click
    for k, p in enumerate(seq):
        if p is None:
            continue
        a_s, b_s = p["src"][0] / fps, p["src"][1] / fps
        lo = 0 if k > 0 and joined(seq[k - 1], p) else ov            # no crossfade where the sound simply continues
        hi = 0 if k + 1 < len(seq) and joined(p, seq[k + 1]) else ov
        short_in = short_out = False
        if lo and not quiet(a_s - ov / SR, a_s):
            lo, short_in = 0, True
        if hi and not quiet(b_s, b_s + ov / SR):
            hi, short_out = 0, True
        s0 = int(a_s * SR) - lo; s1 = int(b_s * SR) + hi
        y = src[max(0, s0):s1].copy()
        if s0 < 0:
            y = np.concatenate([np.zeros((-s0, 2), np.float32), y])
        if len(y) > 4 * ov:
            if lo:
                y[:2 * ov] *= fin[:, None]
            elif short_in:
                y[:nf] *= sin_[:, None]
            if hi:
                y[-2 * ov:] *= fout[:, None]
            elif short_out:
                y[-nf:] *= sout[:, None]
        t0 = int(p["tl"][0] / fps * SR) - lo
        if t0 < 0:
            y = y[-t0:]; t0 = 0
        m = min(len(y), n - t0); v[t0:t0 + m] += y[:m]
    end = int(total / fps * SR)
    sf.write(jb.p("voice.wav"), v[:end], SR, subtype="FLOAT")
    sf.write(jb.p("clips.wav"), c[:end], SR, subtype="FLOAT")


def _timeline_txt(jb, items):
    """Every line on the final timeline with its words and joints (‖ line start, | pause), in output frames."""
    fps = jb.fps; out = []; joints = []
    for it in items:
        f0, f1 = it["tl"]
        if it["kind"] == "clip":
            out.append(f"{it['id']:6} ‖{f0:>6}-{f1:<6} {J.tc(jb.f2s(f0))}  [clip {os.path.basename(it['file'])}]")
            joints.append({"f": f0, "kind": "line", "line": it["id"]}); continue
        ws = it.get("words") or []
        last = ws[-1]["f1"] if ws else f1
        parts = []; prev = None
        for w in ws:
            mark = ""
            if prev is not None and (w["f0"] - prev["f1"] >= int(0.12 * fps) or prev["w"][-1:] in ",;:—"):
                mark = "|"; joints.append({"f": w["f0"], "kind": "pause", "line": it["id"]})
            parts.append(f"{mark}{w['w']}@{w['f0']}")
            prev = w
        joints.append({"f": f0, "kind": "line", "line": it["id"], "words_end": last})
        out.append(f"{it['id']:6} ‖{f0:>6}-{f1:<6} {J.tc(jb.f2s(f0))}  ends {last}  " + " ".join(parts))
    open(jb.p("timeline.txt"), "w").write("\n".join(out) + "\n")
    json.dump(sorted(joints, key=lambda j: j["f"]), open(jb.p("joints.json"), "w"), indent=0)
    allw = [dict(w, line=it["id"]) for it in items for w in it.get("words", [])]
    json.dump(allw, open(jb.p("words.json"), "w"), indent=0)


def _gaze_sheets(jb, items):
    """A frame from the middle of every chosen take, labelled, for the gaze check."""
    from PIL import Image, ImageDraw
    rv = jb.d("review"); fps = jb.fps
    todo = []
    for it in items:
        if it["kind"] != "aroll":
            continue
        p = max(it["pieces"], key=lambda p: p["src"][1] - p["src"][0])
        todo.append((it["id"], float((p["src"][0] + p["src"][1]) / 2 / fps)))

    def grab(t):
        r = J.subprocess.run([J.ffmpeg(), "-v", "error", "-ss", f"{t:.3f}", "-i", jb.footage, "-frames:v", "1",
                              "-vf", "scale=480:-2", "-f", "image2pipe", "-c:v", "png", "-"], capture_output=True)
        import io
        return Image.open(io.BytesIO(r.stdout)).convert("RGB") if r.stdout else Image.new("RGB", (480, 270))
    with cf.ThreadPoolExecutor(4) as ex:
        ims = list(ex.map(lambda x: grab(x[1]), todo))
    for k in range(0, len(todo), 24):
        grp = list(zip(todo[k:k + 24], ims[k:k + 24]))
        w, h = grp[0][1].size
        sheet = Image.new("RGB", (w * 6, h * ((len(grp) + 5) // 6)), "white"); d = ImageDraw.Draw(sheet)
        for i, ((lid, _), im) in enumerate(grp):
            x, y = (i % 6) * w, (i // 6) * h
            sheet.paste(im, (x, y)); d.rectangle([x, y, x + 70, y + 18], fill="black"); d.text((x + 4, y + 3), lid, fill="yellow")
        sheet.save(os.path.join(rv, f"gaze_{k // 24 + 1}.jpg"), quality=82)
