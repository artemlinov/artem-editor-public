"""sfxboard.py: a sound palette Artem picks from BEFORE anything goes on the timeline (his ask, video 14 pass 3: "Maybe
generate a few SFX and i'll give them a listen before you put them onto the timeline?").

  python3 pipeline/sound/sfxboard.py <palette.json> <out dir> [--board "<name>.mp4"]      # system python: needs Pillow

palette.json: {"roles": [{"key": "goodbad", "name": "Good vs bad", "where": "1:22 table cells, 3:23 Plan vs Edit",
  "options": [{"letter": "A", "desc": "generated pair", "pick": true,
               "parts": [{"file": ..., "in": s, "len": s, "pitch": semitones, "lowpass": hz, "db": 0, "at": s}, ...]}]}]}
An option is one or more parts played together (a "bad" twin = the same file with "pitch": -5, "at": 0.9 after the good
one). "pitch" changes pitch and length together, like slowing a tape: the darker twin of a sound. Every option is written
as <out>/<key>-<letter>.wav, all brought to the same loudness (loudest 50 ms at -18 dBFS) so the board compares sounds,
not levels; the board video shows the role, the letter and what it is (my pick marked) while each one plays.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SR = 48000
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FONT = os.path.join(REPO, "brand", "fonts", "EverygenNeue", "ttf")


def font(weight, size):
    for f in sorted(os.listdir(FONT)):
        if weight.lower() in f.lower() and f.lower().endswith((".otf", ".ttf")):
            return ImageFont.truetype(os.path.join(FONT, f), size)
    return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", size)


def part(p):
    """One part as float32 stereo at 48 kHz."""
    af = [f"asetrate={SR}*{2 ** (p['pitch'] / 12):.6f}", f"aresample={SR}"] if p.get("pitch") else []
    if p.get("lowpass"):
        af.append(f"lowpass=f={p['lowpass']}")
    cmd = ["ffmpeg", "-v", "error", "-ss", str(p.get("in", 0))] + (["-t", str(p["len"])] if p.get("len") else []) + ["-i", p["file"]]
    if af:
        cmd += ["-af", ",".join(af)]
    x = np.frombuffer(subprocess.run(cmd + ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout, dtype=np.float32).reshape(-1, 2).copy()
    n = min(len(x), int(.004 * SR)); x[:n] *= np.linspace(0, 1, n)[:, None]
    n = min(len(x), int(.03 * SR)); x[len(x) - n:] *= np.linspace(1, 0, n)[:, None]
    return x * 10 ** (p.get("db", 0) / 20)


def loud(x):
    m = x.mean(1); h = 2400
    return 20 * np.log10(max(np.sqrt((m[i:i + h] ** 2).mean()) for i in range(0, max(1, len(m) - h), 480)) + 1e-9)


def option(o):
    parts = [(int(p.get("at", 0) * SR), part(p)) for p in o["parts"]]
    y = np.zeros((max(a + len(x) for a, x in parts), 2), np.float32)
    for a, x in parts:
        y[a:a + len(x)] += x
    y *= 10 ** ((-18 - loud(y)) / 20)
    return np.clip(y, -1, 1)


def write(path, y):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", path], input=y.tobytes(), check=True)


def card(path, role, o, idx, n):
    W, H = 1920, 1080; im = Image.new("RGB", (W, H), (245, 246, 250)); d = ImageDraw.Draw(im)
    d.text((140, 120), f"{idx}  {role['name']}", font=font("Semibold", 64), fill=(20, 22, 30))
    d.text((140, 210), role.get("where", ""), font=font("Regular", 38), fill=(110, 115, 130))
    if o is None:
        d.text((140, 420), " / ".join(x["letter"] + (" (my pick)" if x.get("pick") else "") for x in role["options"]), font=font("Medium", 56), fill=(30, 90, 230))
    else:
        d.rounded_rectangle((140, 360, 420, 640), 40, fill=(30, 90, 230) if o.get("pick") else (255, 255, 255), outline=(30, 90, 230), width=6)
        d.text((280, 500), o["letter"], font=font("Semibold", 180), fill=(255, 255, 255) if o.get("pick") else (30, 90, 230), anchor="mm")
        d.text((490, 400), o.get("desc", ""), font=font("Medium", 54), fill=(20, 22, 30))
        if o.get("pick"):
            d.text((490, 490), "my pick", font=font("Medium", 44), fill=(30, 90, 230))
        d.text((490, 570), f"option {role['options'].index(o) + 1} of {len(role['options'])}", font=font("Regular", 36), fill=(140, 145, 160))
    d.text((140, H - 110), "Reply with the letter you want for each number, e.g. 1A 2C 3B.", font=font("Regular", 34), fill=(140, 145, 160))
    im.save(path)


def main():
    a = sys.argv[1:]
    P = json.load(open(a[0])); out = a[1]; os.makedirs(out, exist_ok=True)
    board = a[a.index("--board") + 1] if "--board" in a else "00 sounds to pick.mp4"
    tmp = tempfile.mkdtemp(); segs = []; audio = []
    for i, role in enumerate(P["roles"], 1):
        p = os.path.join(tmp, f"r{i}.png"); card(p, role, None, i, len(P["roles"])); segs.append((p, 1.6)); audio.append(np.zeros((int(1.6 * SR), 2), np.float32))
        for o in role["options"]:
            y = option(o); write(os.path.join(out, f"{role['key']}-{o['letter']}.wav"), y)
            dur = max(2.2, len(y) / SR + 1.0)
            p = os.path.join(tmp, f"r{i}{o['letter']}.png"); card(p, role, o, i, len(P["roles"]))
            segs.append((p, dur)); z = np.zeros((int(dur * SR), 2), np.float32); s = int(.35 * SR); z[s:s + len(y)] = y[:len(z) - s]; audio.append(z)
    wav = os.path.join(tmp, "a.wav"); write(wav, np.concatenate(audio))
    lst = os.path.join(tmp, "l.txt")
    with open(lst, "w") as f:
        for p, dur in segs:
            f.write(f"file '{p}'\nduration {dur:.3f}\n")
        f.write(f"file '{segs[-1][0]}'\n")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-i", wav, "-vf", "fps=30,format=yuv420p",
                    "-c:v", "libx264", "-crf", "20", "-c:a", "aac", "-b:a", "192k", "-shortest", os.path.join(out, board)], check=True)
    print("->", os.path.join(out, board), f"({sum(d for _, d in segs):.0f} s)")


if __name__ == "__main__":
    main()
