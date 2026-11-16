"""job.py: the current video's folders and files, in ONE place. Every tool imports it; no tool names a video.

  python3 pipeline/job.py                     # the current video, its folders, and which work files exist
  python3 pipeline/job.py init --aroll <camera file> [--sequence "<existing Premiere sequence>"] [--recordings <dir>]
                                               # set up the current video's job folder (work/, scripts/, graphics/_lib);
                                               # then lanes/premiere/new-project.py makes the Premiere project + sequence
  python3 pipeline/job.py prep                # A-roll audio for cutting into the cache: a16.wav, a48.wav, env_db.npy

The current video is `current_video` in config/paths.local.json (its folder name under `everygen_videos`).
For one command, EG_VIDEO="<folder name>" picks another video; EG_JOB_ROOT=<dir> points at any job folder (tests).

Where things go (the rule in CLAUDE.md):
  <job>/work/       small state a later session needs: job.json, dump.json, timeline.json, recut.json, plans, cue lists
  <job>/scripts/    one-off scripts for this video only
  <cache>/          big files any tool can regenerate: A-roll audio, extracted frames (work_cache/<video>/)
  repo              every tool used twice (pipeline/, lanes/, presets/)

    import sys, os; sys.path.insert(0, os.path.join(REPO, "pipeline")); from job import J
    J.work, J.cache, J.cfg["aroll"], J.env(), J.audio16(), J.timeline(), J.dump()
"""
import json, os, shutil, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "config"))
import paths  # noqa: E402

FPS = 30000 / 1001          # every Everygen sequence is 29.97
TPF = 8475667200            # Premiere ticks per frame at 29.97
LIB = os.path.join(REPO, "presets", "graphics", "_lib")


class Job:
    def __init__(self):
        p = paths.load()
        root = os.environ.get("EG_JOB_ROOT")
        self.video = os.path.basename(os.path.dirname(root)) if root else (os.environ.get("EG_VIDEO") or p.get("current_video"))
        if not root:
            if not self.video:
                sys.exit("No current video: set current_video in config/paths.local.json (its folder under everygen_videos).")
            # a video's job folder can live somewhere else for a while (config "job_roots": {video: path}; video 13: the
            # SSD went read-only, so new work went to a Desktop folder). The video keeps its name, so its cache stays.
            root = (p.get("job_roots") or {}).get(self.video) or os.path.join(p["everygen_videos"], self.video, p["job_subfolder"])
        self.root = root
        self.work = os.path.join(root, "work")
        self.scripts = os.path.join(root, "scripts")
        self.transcript = os.path.join(root, "transcript")
        self.graphics = os.path.join(root, "graphics")
        self.renders = os.path.join(self.graphics, "renders")
        self.music = os.path.join(root, "music")
        self.sfx = os.path.join(root, "sfx")
        self.review = os.path.join(root, "review")
        self.premiere = os.path.join(root, "premiere")
        cache_root = os.environ.get("EG_CACHE") or p.get("work_cache") or os.path.expanduser("~/Library/Caches/everygen-editor")
        self.cache = os.path.join(cache_root, self.video)
        self.aroll_dir = os.path.join(self.cache, "aroll")
        self.frames = os.path.join(self.cache, "frames")
        self.sfx_library = p.get("sfx_library")
        self._cfg = None

    # ---- the video's own settings (work/job.json)
    @property
    def cfg(self):
        if self._cfg is None:
            f = self.w("job.json")
            if not os.path.exists(f):
                sys.exit(f"{f} missing: run  python3 pipeline/job.py init --aroll <camera file>")
            self._cfg = json.load(open(f))
        return self._cfg

    def w(self, name):
        """A file in work/ (created on demand)."""
        os.makedirs(self.work, exist_ok=True)
        return os.path.join(self.work, name)

    def frames_dir(self, name, clear=False):
        d = os.path.join(self.frames, name)
        if clear:
            shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d, exist_ok=True)
        return d

    # ---- A-roll audio (from `prep`)
    def env(self):
        """10 ms RMS envelope of the A-roll in dBFS (index = source time * 100)."""
        import numpy as np
        f = os.path.join(self.aroll_dir, "env_db.npy")
        if not os.path.exists(f):
            sys.exit(f"{f} missing: run  python3 pipeline/job.py prep")
        return np.load(f)

    def audio16(self):
        """The A-roll at 16 kHz mono float32, and its rate (for Whisper)."""
        import numpy as np, wave
        f = os.path.join(self.aroll_dir, "a16.wav")
        if not os.path.exists(f):
            sys.exit(f"{f} missing: run  python3 pipeline/job.py prep")
        wf = wave.open(f)
        return np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768, wf.getframerate()

    # ---- work files
    def timeline(self, name="timeline.json"):
        f = self.w(name)
        if not os.path.exists(f):
            sys.exit(f"{f} missing: run  python3 pipeline/timeline.py build")
        return json.load(open(f))

    def dump(self, name="dump.json"):
        f = self.w(name)
        if not os.path.exists(f):
            sys.exit(f"{f} missing: run  python3 lanes/premiere/dump-live.py")
        return json.load(open(f))


J = Job()


def fr(t):
    """Seconds -> whole frames."""
    return round(t * FPS)


def tc(t):
    """Seconds -> m:ss.ff (frames), the way Artem writes timecodes."""
    f = fr(max(0.0, t)); s, ff = divmod(f, 30); m, s = divmod(s, 60)
    return f"{m}:{s:02d}:{ff:02d}"


def whisper(seg, words=False):
    """Transcribe a float32 16 kHz array with the house model; text, or (text, words) with word times."""
    import mlx_whisper
    r = mlx_whisper.transcribe(seg, path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="en",
                               condition_on_previous_text=False, word_timestamps=words, verbose=None)
    if not words:
        return r["text"].strip()
    return r["text"].strip(), [w for s in r["segments"] for w in s.get("words", [])]


# ---- CLI
def _status():
    print(f"video   {J.video}\njob     {J.root}\ncache   {J.cache}")
    for k in ("work", "scripts", "transcript", "graphics", "renders", "music", "sfx", "review", "premiere"):
        d = getattr(J, k); print(f"  {k:10} {'ok' if os.path.isdir(d) else '-'}  {d}")
    if os.path.exists(J.w("job.json")):
        for k, v in J.cfg.items():
            print(f"  job.{k:7} {v}" + ("" if not isinstance(v, str) or not v.startswith("/") or os.path.exists(v) else "  MISSING"))
    for f in ("dump.json", "timeline.json", "recut.json"):
        print(f"  work/{f:14} {'ok' if os.path.exists(J.w(f)) else '-'}")
    for f in ("a16.wav", "a48.wav", "env_db.npy"):
        print(f"  cache/{f:13} {'ok' if os.path.exists(os.path.join(J.aroll_dir, f)) else '- (run prep)'}")


def _init(argv):
    import argparse
    a = argparse.ArgumentParser(prog="job.py init"); a.add_argument("--aroll", required=True)
    a.add_argument("--sequence"); a.add_argument("--recordings")
    o = a.parse_args(argv)
    if not os.path.exists(o.aroll):
        sys.exit(f"no such file: {o.aroll}")
    for d in (J.work, J.scripts, J.transcript, J.renders, J.music, J.sfx, J.review, J.premiere, J.cache):
        os.makedirs(d, exist_ok=True)
    cfg = json.load(open(J.w("job.json"))) if os.path.exists(J.w("job.json")) else {}
    cfg["aroll"] = os.path.abspath(o.aroll)
    if o.sequence:                                   # an existing sequence; otherwise lanes/premiere/new-project.py makes one
        cfg["sequence"] = o.sequence
    rec = o.recordings or os.path.join(os.path.dirname(J.root), "Screen Recordings")
    if os.path.isdir(rec):
        cfg["recordings"] = rec
    json.dump(cfg, open(J.w("job.json"), "w"), indent=1)
    _sync_lib()
    print("job.json", cfg); _status()


def _sync_lib():
    """Copy the graphics engine into <job>/graphics/_lib (pages load ../_lib/...). Brand logos and fonts come from brand/.
    An existing _lib is left alone: a video keeps the engine it was built with (promote changes back at the end)."""
    dst = os.path.join(J.graphics, "_lib")
    if os.path.exists(os.path.join(dst, "eg.js")):
        print("graphics/_lib already there (kept)"); return
    os.makedirs(os.path.join(dst, "fonts"), exist_ok=True)
    for f in os.listdir(LIB):
        if f.endswith((".js", ".css")):
            shutil.copy2(os.path.join(LIB, f), dst)
    logos = os.path.join(REPO, "brand", "logos")
    for f in os.listdir(logos):
        shutil.copy2(os.path.join(logos, f), dst)
    w2 = os.path.join(REPO, "brand", "fonts", "EverygenNeue", "woff2")
    for f in ("EverygenNeue-Regular.woff2", "EverygenNeue-Medium.woff2", "EverygenNeue-Semibold.woff2"):
        shutil.copy2(os.path.join(w2, f), os.path.join(dst, "fonts"))
    shutil.copy2(os.path.join(REPO, "brand", "fonts", "Hedvig", "HedvigLettersSerif_14pt-Regular.ttf"), os.path.join(dst, "fonts"))
    print("graphics/_lib ->", dst)


def _prep():
    import numpy as np, wave
    src = J.cfg["aroll"]; os.makedirs(J.aroll_dir, exist_ok=True)
    a16, a48 = os.path.join(J.aroll_dir, "a16.wav"), os.path.join(J.aroll_dir, "a48.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", a16], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", a48], check=True)
    wf = wave.open(a48); sr = wf.getframerate()
    x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    hop = int(sr * 0.01); n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12))
    np.save(os.path.join(J.aroll_dir, "env_db.npy"), db.astype(np.float32))
    print(f"a16 + a48 + env_db ({n / 100:.1f} s) -> {J.aroll_dir}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    {"status": _status, "init": lambda: _init(sys.argv[2:]), "prep": _prep, "lib": _sync_lib}.get(cmd, _status)()
