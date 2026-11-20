"""dump-diff.py: what Artem changed on the timeline between two dump-live reads (his fixes are the lesson).

  python3 lanes/premiere/dump-diff.py <old dump> <new dump> [--from s] [--to s] [--tracks A4-A7,V1]

Both paths are relative to the video's work/ folder (or absolute). Per track it lists clips he removed, added, moved or
trimmed, switched on/off, the level he set (in dB, through clip_level.v_lvl), and every effect or keyframe he added or
changed (a pitch shifter, a Level ramp, a Scale key). A clip is matched by name and start (within 0.02 s), else by name and
in point (a moved clip).
"""
import json, os, sys
from lane import J
from clip_level import v_lvl

a = sys.argv[1:]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
pos = [x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or not a[i - 1].startswith("--"))]
T0, T1 = float(opt("--from", -1)), float(opt("--to", 1e9))
want = None
if opt("--tracks"):
    want = set()
    for part in opt("--tracks").split(","):
        if "-" in part:
            k, x, y = part[0], int(part[1:].split("-")[0]), int(part.split("-")[1][1:])
            want |= {f"{k}{n}" for n in range(x, y + 1)}
        else:
            want.add(part)
load = lambda p: json.load(open(p if os.path.isabs(p) else J.w(p)))
O, N = load(pos[0]), load(pos[1])


def db(v):
    try:
        return round(v_lvl(v), 1)
    except Exception:
        return v


def props(c):
    """{component/property: value or keys}, levels in dB."""
    out = {}
    for cp in c.get("comps", []):
        if cp["n"] == "Channel Volume":
            continue
        for p in cp["p"]:
            if not p.get("n"):
                continue
            k = f'{cp["n"]}/{p["n"]}'
            if "keys" in p:
                v = [[round(t, 3), db(x) if p["n"] == "Level" else x] for t, x in p["keys"]]
            else:
                v = db(p.get("v")) if p["n"] == "Level" else p.get("v")
            out[k] = v
    return out


def fmt(v):
    s = json.dumps(v)
    return s if len(s) < 120 else s[:117] + "..."


# His ripples: V1 clips matched by name and in point (or out point, a trimmed head) give the shift from each old time on,
# so a clip that only rode a ripple is not reported as moved.
RIP = []
for c in O["v"][0]:
    d = next((d for d in N["v"][0] if d["name"] == c["name"] and (abs(d["inP"] - c["inP"]) < .02 or abs(d["outP"] - c["outP"]) < .02)
              and abs(d["start"] - c["start"]) < 30), None)
    if d:
        RIP.append((c["end"] if abs(d["inP"] - c["inP"]) >= .02 else c["start"], round(d["end"] - c["end"] if abs(d["inP"] - c["inP"]) >= .02 else d["start"] - c["start"], 4)))
RIP.sort()
shift = lambda t: next((s for t0, s in reversed(RIP) if t0 <= t + .001), 0.0)
last = 0.0
for t0, s in RIP:
    if abs(s - last) > .005:
        print(f"RIPPLE: from {t0:.3f} (old time) everything moved {s - last:+.3f} s (total {s:+.3f})")
        last = s


for kd in ("v", "a"):
    for k in range(max(len(O[kd]), len(N[kd]))):
        tn = f"{kd.upper()}{k + 1}"
        if want and tn not in want:
            continue
        old = [c for c in (O[kd][k] if k < len(O[kd]) else []) if c["end"] > T0 and c["start"] < T1]
        new = [c for c in (N[kd][k] if k < len(N[kd]) else []) if c["end"] > T0 and c["start"] < T1]
        used, lines = set(), []
        for c in old:
            s0, s1 = shift(c["start"]), shift(c["end"] - .001)
            m = next((j for j, d in enumerate(new) if j not in used and d["name"] == c["name"] and abs(d["start"] - c["start"] - s0) < .02), None)
            if m is None:
                m = next((j for j, d in enumerate(new) if j not in used and d["name"] == c["name"] and abs(d["start"] - c["start"]) < .02), None)
            if m is None:
                m = next((j for j, d in enumerate(new) if j not in used and d["name"] == c["name"] and abs(d["inP"] - c["inP"]) < .02
                          and abs(d["start"] - c["start"] - s0) < 3), None)
            if m is None:
                lines.append(f'  - removed  {c["start"]:9.3f}-{c["end"]:9.3f}  {c["name"]}')
                continue
            used.add(m); d = new[m]; ch = []
            if abs(d["start"] - c["start"] - s0) > .02 or abs(d["end"] - c["end"] - s1) > .02:
                ch.append(f'time {c["start"]:.3f}-{c["end"]:.3f} -> {d["start"]:.3f}-{d["end"]:.3f}')
            if abs(d["inP"] - c["inP"]) > .02 and abs(d["start"] - c["start"] - s0) < .02:
                ch.append(f'in {c["inP"]:.3f} -> {d["inP"]:.3f}')
            if d.get("dis") != c.get("dis"):
                ch.append("switched " + ("OFF" if d.get("dis") else "ON"))
            if d.get("speed") != c.get("speed"):
                ch.append(f'speed {c.get("speed")} -> {d.get("speed")}')
            po, pn = props(c), props(d)
            for key in sorted(set(po) | set(pn)):
                if key not in po:
                    ch.append(f"ADDED {key} = {fmt(pn[key])}")
                elif key not in pn:
                    ch.append(f"removed {key}")
                elif po[key] != pn[key]:
                    ch.append(f"{key}: {fmt(po[key])} -> {fmt(pn[key])}")
            if ch:
                lines.append(f'  ~ {d["start"]:9.3f}-{d["end"]:9.3f}  {d["name"]}\n      ' + "\n      ".join(ch))
        for j, d in enumerate(new):
            if j not in used:
                extra = {k2: v for k2, v in props(d).items() if not k2.startswith(("Opacity/Blend", "Motion/Anti", "Motion/Crop", "Motion/Uniform", "Motion/Rotation", "Motion/Scale Width"))}
                lines.append(f'  + added    {d["start"]:9.3f}-{d["end"]:9.3f}  {d["name"]}  (in {d["inP"]:.3f}{", OFF" if d.get("dis") else ""})  {fmt(extra)}')
        if lines:
            print(tn); print("\n".join(lines))
