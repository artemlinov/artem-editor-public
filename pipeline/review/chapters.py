"""chapters.py: where the sections of the finished video start, for YouTube chapters (the description skill uses it).

  .venv/bin/python pipeline/review/chapters.py [--before 8] [--all] [--pockets]
  EG_VIDEO="12 Claude + Omni UGC" .venv/bin/python pipeline/review/chapters.py      # another video than the current one

Reads the LAST READ of the timeline (work/dump.json + work/timeline.json). If Artem changed anything since, run
lanes/premiere/dump-live.py and pipeline/timeline.py build first; the header prints how old the read is.

A new story block gets a new song (rules/pacing.md), so every song start is a chapter candidate. For each one this prints
the stamp, the sentence that starts there, and the sentences spoken in the DRY stretch before it (from where the song
before ended): a section usually opens one line EARLIER than its song, on the transitional line that plays dry ("What made
me choose Fable as the winner…", then the song). Choose from these.
A boundary no song marks (the finished result being played, a demo inside a block) is not in this list: --all prints
every other sentence start too. A song cut into several clips (his own remix, pockets) counts once; --pockets lists every
clip. --before <s> is how far back to look when no song ended just before (default 12).

Stamp rule: YouTube jumps to a whole second. The stamp is the section's first frame floored to the second, so the viewer
never misses its first word; at worst they hear the last word of the line before. Only when the section starts within
0.1 s of the next second is that second used.
"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from job import J  # noqa: E402


def stamp(t):
    s = int(t) + (1 if t - int(t) >= 0.9 else 0)
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def sentences(words):
    """[(start s, first words)] for every sentence, from words [(t, w)] in time order."""
    out, cur, t0 = [], [], None
    for t, w in words:
        if t0 is None:
            t0 = t
        cur.append(w)
        if w.rstrip().endswith((".", "?", "!")):
            out.append((t0, " ".join(cur))); cur, t0 = [], None
    if cur:
        out.append((t0, " ".join(cur)))
    return out


if __name__ == "__main__":
    a = sys.argv[1:]; before = float(a[a.index("--before") + 1]) if "--before" in a else 12.0
    T = J.timeline(); D = J.dump()
    words = [(w["t"], w["w"]) for w in T["words"]]
    lv = J.w("live.json")                              # a section cut from another camera file keeps its words here (video 13)
    if os.path.exists(lv):
        L = json.load(open(lv)); words += [(L["t0"] + w["t"], w["w"]) for w in L["words"]]
    words.sort(); S = sentences(words)
    music = os.path.realpath(J.music); songs = []
    for tr in D["a"]:
        for c in tr:
            p = c.get("path") or ""
            if p and os.path.realpath(os.path.dirname(p)) == music:
                songs.append((c["start"], os.path.basename(p)))
    songs.sort()
    ends = sorted(c["end"] for tr in D["a"] for c in tr if (c.get("path") or "") and os.path.realpath(os.path.dirname(c["path"])) == music)
    if "--pockets" not in a:                           # a song he cut into pockets is still one block: keep its first clip only
        songs = [s for i, s in enumerate(songs) if i == 0 or s[1] != songs[i - 1][1]]
    age =(time.time() - os.path.getmtime(J.w("dump.json"))) / 3600
    print(f"{J.video}: {stamp(T['end'])} long ({T['end']:.2f} s); timeline read {age:.1f} h ago; {len(songs)} songs, {len(S)} sentences")
    print("first words of the video are at", stamp(S[0][0]) if S else "?", "(the first chapter is always 0:00)")
    short = lambda s: s if len(s) <= 110 else s[:107] + "…"
    used = set()
    for m, name in songs:
        here = [s for s in S if m - 0.35 <= s[0] <= m + 1.0]
        ended = max([e for e in ends if e <= m + 0.05], default=None)       # where the song before this one stopped
        dry = ended is not None and 0.3 < m - ended <= 30
        lo = (ended - 3.0) if dry else m - before      # a bed ends on a reverb tail: the dry cut is up to ~2.6 s before its end
        prev = [s for s in S if lo <= s[0] < m - 0.35]
        print(f"\n■ {stamp(m)}  song starts ({name}, {m:.2f} s)" + (f"; the song before stopped at {stamp(ended)} ({ended:.2f}), dry for {m - ended:.1f} s" if dry else ""))
        for t, s in prev:
            print(f"    {'dry    ' if dry and t >= ended - 3.0 else 'earlier'}  {stamp(t)}  ({t:7.2f})  {short(s)}"); used.add(t)
        for t, s in here:
            print(f"    HERE     {stamp(t)}  ({t:7.2f})  {short(s)}"); used.add(t)
        if not here:
            print("    (no sentence starts on the song: it starts under a line or a visual)")
    if "--all" in a:
        print("\nevery other sentence start:")
        for t, s in S:
            if t not in used:
                print(f"  {stamp(t)}  ({t:7.2f})  {short(s)}")
