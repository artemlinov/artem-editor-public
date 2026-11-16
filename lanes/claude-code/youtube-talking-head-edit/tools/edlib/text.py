"""Comparing what was said with what should have been said."""
import difflib, re

_NUM = {"zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7",
        "eight": "8", "nine": "9", "ten": "10", "twenty": "20", "fifty": "50"}
_SAY = {"gonna": "going to", "wanna": "want to", "gotta": "got to", "okay": "ok", "alright": "all right"}


def words(t):
    t = t.lower().replace("%", " percent ").replace("&", " and ").replace("$", " ")
    t = re.sub(r"(?<=\d),(?=\d)", "", t)
    t = re.sub(r"\b(\d+)\s*(k|g|m)\b", lambda m: m[1] + {"k": "000", "g": " grams", "m": " million"}[m[2]], t)
    t = re.sub(r"\b(a|one) hundred\b", "100", t)
    t = re.sub(r"\b(\d+|two|three|four|five) hundred\b", lambda m: _NUM.get(m[1], m[1]) + "00", t)
    t = re.sub(r"[^\w' ]+", " ", t)
    for k, v in _SAY.items():
        t = re.sub(rf"\b{k}\b", v, t)
    return [_NUM.get(w, w).strip("'") for w in t.split() if w.strip("'") and w not in ("dollars", "dollar")]


def same(a, b):
    return a == b or (len(a) > 3 and len(b) > 3 and difflib.SequenceMatcher(None, a, b).ratio() >= 0.8)


def diff(want, heard):
    """Word-level differences between the script line and what was heard: (missing, extra, ratio)."""
    w, h = words(want), words(heard)
    sm = difflib.SequenceMatcher(None, w, h, autojunk=False)
    missing, extra = [], []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op == "equal":
            continue
        A, B = w[a0:a1], h[b0:b1]
        if op == "replace" and len(A) == len(B) and all(same(x, y) for x, y in zip(A, B)):
            continue
        if A:
            missing.append(" ".join(A))
        if B:
            extra.append(" ".join(B))
    return missing, extra, round(sm.ratio(), 3)


def ratio(a, b):
    return difflib.SequenceMatcher(None, words(a), words(b), autojunk=False).ratio()
