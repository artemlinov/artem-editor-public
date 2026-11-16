"""The job folder, ffmpeg, and reading the footage.

A job lives in the toolkit's cache folder on the computer's own disk (never next to the footage, which may sit in a
synced folder): ~/Library/Caches/everygen-edit/jobs/<name> on a Mac, %LOCALAPPDATA%\\everygen-edit\\jobs\\<name> on
Windows. `ed init` makes one and marks it current; every other command works on the current job unless --job is given.
"""
import json, os, re, shutil, subprocess, sys
from fractions import Fraction


def base():
    if sys.platform == "darwin":
        b = os.path.expanduser("~/Library/Caches/everygen-edit")
    elif os.name == "nt":
        b = os.path.join(os.environ.get("LOCALAPPDATA") or os.path.expanduser("~"), "everygen-edit")
    else:
        b = os.path.join(os.environ.get("XDG_CACHE_HOME") or os.path.expanduser("~/.cache"), "everygen-edit")
    os.makedirs(b, exist_ok=True)
    return b


_FF = None


def ffmpeg():
    """The ffmpeg binary: the system's if there is one, else the one bundled with imageio-ffmpeg."""
    global _FF
    if _FF is None:
        _FF = shutil.which("ffmpeg")
        if not _FF:
            import imageio_ffmpeg
            _FF = imageio_ffmpeg.get_ffmpeg_exe()
    return _FF


def hwdec():
    return ["-hwaccel", "videotoolbox"] if sys.platform == "darwin" else []


def run(args, **kw):
    return subprocess.run([ffmpeg(), "-hide_banner", "-nostdin", "-v", "error"] + args, check=True, **kw)


_COMMON_RATES = {23.976: Fraction(24000, 1001), 29.97: Fraction(30000, 1001), 59.94: Fraction(60000, 1001),
                 47.952: Fraction(48000, 1001), 119.88: Fraction(120000, 1001)}


def _rate(txt):
    v = float(txt)
    for k, f in _COMMON_RATES.items():
        if abs(v - k) < 0.01:
            return f
    return Fraction(v).limit_denominator(1001)


def probe(path):
    """Size, frame rate, duration, audio, rotation of a media file, read from ffmpeg's own report (no ffprobe needed)."""
    r = subprocess.run([ffmpeg(), "-hide_banner", "-nostdin", "-i", path], capture_output=True, text=True, errors="replace")
    t = r.stderr
    info = {"path": os.path.abspath(path), "duration": None, "width": None, "height": None, "fps": None,
            "audio": False, "rotation": 0}
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", t)
    if m:
        info["duration"] = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    for line in t.splitlines():
        if "Video:" in line and info["width"] is None:
            m = re.search(r", (\d{2,5})x(\d{2,5})", line)
            if m:
                info["width"], info["height"] = int(m[1]), int(m[2])
            m = re.search(r"([\d.]+) fps", line) or re.search(r"([\d.]+) tbr", line)
            if m:
                f = _rate(m[1])
                info["fps"] = [f.numerator, f.denominator]
        if "Audio:" in line:
            info["audio"] = True
        m = re.search(r"rotation of (-?[\d.]+) degrees", line)
        if m:
            info["rotation"] = int(round(float(m[1])))
    if info["rotation"] in (90, -90, 270, -270) and info["width"]:
        info["width"], info["height"] = info["height"], info["width"]
    return info


class Job:
    def __init__(self, path):
        self.dir = path
        self.meta = json.load(open(self.p("job.json")))
        f = self.meta["footage"]["fps"]
        self.fps = Fraction(f[0], f[1])
        self.W, self.H = self.meta["footage"]["width"], self.meta["footage"]["height"]

    def p(self, *parts):
        return os.path.join(self.dir, *parts)

    def d(self, *parts):
        q = self.p(*parts)
        os.makedirs(q, exist_ok=True)
        return q

    @property
    def footage(self):
        return self.meta["footage"]["path"]

    def save(self):
        json.dump(self.meta, open(self.p("job.json"), "w"), indent=1)

    def f2s(self, f):
        return float(f / self.fps)

    def s2f(self, s):
        return int(round(s * self.fps))


def create(footage, name=None):
    info = probe(footage)
    if not info["width"] or not info["fps"]:
        raise SystemExit(f"Could not read a video stream from {footage}")
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", os.path.splitext(os.path.basename(footage))[0]).strip("-") or "edit"
    name = name or stem
    path = os.path.join(base(), "jobs", name)
    os.makedirs(path, exist_ok=True)
    meta = {"name": name, "footage": info}
    json.dump(meta, open(os.path.join(path, "job.json"), "w"), indent=1)
    open(os.path.join(base(), "current"), "w").write(path)
    return Job(path)


def current(arg=None):
    path = arg or os.environ.get("ED_JOB")
    if not path:
        cur = os.path.join(base(), "current")
        if not os.path.exists(cur):
            raise SystemExit("No job yet: run `ed init <footage>` first.")
        path = open(cur).read().strip()
    if not os.path.exists(os.path.join(path, "job.json")):
        raise SystemExit(f"Not a job folder: {path}")
    return Job(path)


def tc(s):
    m, s = divmod(max(0.0, s), 60)
    return f"{int(m):02d}:{s:05.2f}"
