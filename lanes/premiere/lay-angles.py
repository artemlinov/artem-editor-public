#!/usr/bin/env python3
"""lay-angles.py: lay a two-camera job's other angles onto V1, over the cut the replay laid, from transcript/angles.json.

  uv run lanes/premiere/lay-angles.py projects/<job>             # dry run: what each segment shows and what would be laid
  uv run lanes/premiere/lay-angles.py projects/<job> --apply     # lay every planned angle-B (C...) segment
  uv run lanes/premiere/lay-angles.py projects/<job> --verify    # read V1 back against the plan (exit 1 on drift)

WHERE IT RUNS: right after `premiere-bridge.mjs replay`, before anything else touches V1 (the opening zoom-out and the
push-ins key V1 clips, and a clip laid over keeps none of them). The replay lays the AUDIO cut from angle A (V1 + A1,
every segment); this lays each segment the plan gives another angle as a video-only, hard-boundary subclip of that
camera's clip over the segment's own V1 clip, exactly its span, through `premiere-bridge.mjs lay` (the sanctioned
one-row write: it saves first, counts the track before and after, removes the remnant, reads the length back). A1 is
never touched: every word still plays from angle A's mic.

THE PLAN is workflows/multicam-sync.py --plan's (transcript/angles.json, THE ANGLE RULE in presets/youtube/default/
README.md § Two cameras); this refuses a plan whose `cut_rev` is not the current cuts.json or whose `multicam_rev`
is not the current multicam.json (re-run --plan), and a V1 that is not the replay of that cut (a clip count or a
media that does not match segment by segment). Re-running is safe: a segment already showing its planned camera is
skipped. A segment the plan now gives angle A that shows another camera is refused, not repaired: re-lay the cut
(`replay <cuts.json> <clip> --clear`, then this).

THE CAMERA CLIPS are imported into a bin named `Angles` (by file path; workflows/multicam-sync.py refuses an angle
clip named like an angle-A take, so the replay's lookup by name can never pick the wrong camera). Each laid subclip
carries the colour label of the angle-A item under it (premiere-pro § colour labels). No A/V slip is applied to them:
transcript/av-slip.json is angle A's own camera, and the other camera is synced to A's audio by its OWN audio.

READING IT BACK: live-edl.py maps an angle subclip on V1 through the A1 clip under it (the audio cut), so a creator's
trim that moves V1 and A1 together reads as an EDL edit; a trim of only one of them is refused by name.

Exit: 0 laid / verified / dry run · 1 --verify found drift · 2 refused (stale plan, V1 not the replay, the job guard,
a bridge failure).
"""
import argparse, hashlib, json, os, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from job_guard import pin_job_project, pin_js   # lanes/premiere/job_guard.py: the active project must be this job's

for _s in (sys.stdout, sys.stderr):  # Windows pipes default to cp1252, which cannot encode the status glyphs
    try:
        if (getattr(_s, "encoding", "") or "").lower().replace("-", "") != "utf8":
            _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO = Path(__file__).resolve().parents[2]
TPS = 254016000000
BIN = 'Angles'

READ_ES = r"""var s = app.project.activeSequence, o = {frame: 0, v1: [], a1: []};
try { o.frame = Number(s.timebase); } catch (e) {}
function rd(tr) { var r = [];
  for (var i = 0; tr && i < tr.clips.numItems; i++) { var c = tr.clips[i], pi = c.projectItem, lab = -1, p = "", n = "";
    try { lab = Number(pi.getColorLabel()); } catch (e) {}
    try { p = String(pi.getMediaPath() || ""); n = String(pi.name); } catch (e) {}
    r.push({start: String(c.start.ticks), end: String(c.end.ticks), inp: String(c.inPoint.ticks), item: n, path: p, label: lab}); }
  return r; }
o.v1 = rd(s.videoTracks[0]); o.a1 = rd(s.audioTracks.numTracks ? s.audioTracks[0] : null);
return JSON.stringify(o);"""

IMPORT_ES = r"""var PATHS = @PATHS@, BIN = @BIN@, root = app.project.rootItem, bin = null, have = {}, got = [];
function walk(b) { for (var i = 0; i < b.children.numItems; i++) { var c = b.children[i];
  if (c.type === ProjectItemType.BIN) walk(c);
  else { try { var mp = String(c.getMediaPath()), nm = String(c.name);
    if (!have[mp] && !/^(VID|AUD) .+ @[0-9.]+s$/.test(nm)) have[mp] = nm; } catch (e) {} } } }
walk(root);
var need = [];
for (var k = 0; k < PATHS.length; k++) if (!have[PATHS[k]]) need.push(PATHS[k]);
if (need.length) {
  for (var j = 0; j < root.children.numItems; j++) if (root.children[j].type === ProjectItemType.BIN && root.children[j].name === BIN) bin = root.children[j];
  if (!bin) bin = root.createBin(BIN);
  app.project.importFiles(need, true, bin, false);
  have = {}; walk(root);
}
for (var m = 0; m < PATHS.length; m++) got.push(have[PATHS[m]] || "");
return JSON.stringify({imported: need.length, names: got});"""


def bridge(*args, timeout=300):
    r = subprocess.run(['node', 'lanes/premiere/premiere-bridge.mjs', *args], cwd=REPO, capture_output=True, text=True,
                       timeout=timeout)
    return r.returncode, '\n'.join(l for l in r.stdout.splitlines() if '[INFO]' not in l), r.stderr


def base(p):
    return str(p or '').replace('\\', '/').rstrip('/').rsplit('/', 1)[-1]


def rev(p):
    return hashlib.sha1(Path(p).read_bytes()).hexdigest()[:12]


def cam_in(a_in_ticks, slip_frames, frame_ticks, m):
    """THE IN-POINT of the other camera's subclip, in that camera's media seconds: where angle A actually LANDED (its
    live V1 in-point, less the A/V slip the replay put on V1), carried through the sync's drift line. Never the plan's
    cam_start: the two cameras' frames sit a fraction of a frame apart, and rounding each side on its own put the B
    picture a frame late on the first live run (2026-10-29: segment 1 showed B#10 where A's audio sat on B#9)."""
    a_in = (a_in_ticks - slip_frames * frame_ticks) / TPS
    return a_in - (m['lag_s'] + a_in * m['drift_ppm'] / 1e6)


class Job:
    def __init__(self, path):
        self.dir = Path(path).resolve()
        self.rel = os.path.relpath(self.dir, REPO)
        t = self.dir / 'transcript'
        for p in (t / 'cuts.json', t / 'multicam.json', t / 'angles.json'):
            if not p.exists():
                sys.exit(f'✗ refused: no {p}. Sync and plan first: `uv run workflows/multicam-sync.py {self.rel}` '
                         f'then `--plan` (after the cut). Nothing touched.')
        self.plan = json.loads((t / 'angles.json').read_text(encoding='utf-8'))
        stale = [f'cut_rev {self.plan.get("cut_rev")} is not cuts.json\'s {rev(t / "cuts.json")}'
                 for _ in [0] if self.plan.get('cut_rev') != rev(t / 'cuts.json')]
        stale += [f'multicam_rev {self.plan.get("multicam_rev")} is not multicam.json\'s {rev(t / "multicam.json")}'
                  for _ in [0] if self.plan.get('multicam_rev') != rev(t / 'multicam.json')]
        if stale:
            sys.exit(f'✗ refused: transcript/angles.json is stale ({"; ".join(stale)}): the cut or the sync moved under '
                     f'it. Re-run `uv run workflows/multicam-sync.py {self.rel} --plan --keep`. Nothing touched.')
        self.segs = self.plan['segments']
        self.mc = json.loads((t / 'multicam.json').read_text(encoding='utf-8'))['clips']
        sp = t / 'av-slip.json'
        self.slip = int(json.loads(sp.read_text(encoding='utf-8')).get('v1_frames', 0) or 0) if sp.exists() else 0
        self.pin = None

    def _es(self, script, timeout=300):
        code, out, err = bridge('es', '--job', self.rel, script, timeout=timeout)
        if code != 0:
            sys.exit(f'✗ ES failed (exit 2): {out} {err[-400:]}')
        return out.strip().splitlines()[-1] if out.strip() else ''

    def guard(self):
        if self.pin is None:
            self.pin = pin_job_project(self._es, self.dir)
        return self.pin

    def es(self, script):
        out = self._es('(function(){ ' + pin_js(self.guard()) + script + ' })()')
        if out.strip('"').startswith('ERROR'):
            sys.exit(f'✗ refused (exit 2): {out}')
        return out

    def read(self):
        return self._parse(self.es(READ_ES))

    @staticmethod
    def _parse(out):
        v = json.loads(out)
        return json.loads(v) if isinstance(v, str) else v

    def cams(self):
        return {base(s['cam_clip']): s['cam_clip'] for s in self.segs if s.get('cam_clip')}

    def check_v1(self, o):
        """V1 and A1 must be the replay of the plan's cut, segment by segment. Returns the V1 rows."""
        v1, a1, cams = o['v1'], o['a1'], self.cams()
        why = []
        if len(v1) != len(self.segs) or len(a1) != len(self.segs):
            why.append(f'V1/A1 hold {len(v1)}/{len(a1)} clips, the cut has {len(self.segs)} segments')
        for s, v, a in zip(self.segs, v1, a1):
            vb, ab = base(v['path']), base(a['path'])
            if ab != s['clip']:
                why.append(f'A1 clip {s["i"]} is {ab!r}, the cut says {s["clip"]!r}')
            if v['start'] != a['start'] or v['end'] != a['end']:
                why.append(f'V1 clip {s["i"]} ({vb}) and the A1 clip under it do not share a span')
            if vb != s['clip'] and vb not in cams:
                why.append(f'V1 clip {s["i"]} is {vb!r}, neither the cut\'s {s["clip"]!r} nor a planned camera clip')
            elif vb in cams and (s['angle'] == 'a' or base(s.get('cam_clip')) != vb):
                why.append(f'V1 clip {s["i"]} shows {vb!r} but the plan gives it '
                           + ('angle A' if s['angle'] == 'a' else base(s['cam_clip']))
                           + ': re-lay the cut (`premiere-bridge.mjs replay <cuts.json> <clip> --clear`), then --apply')
        if why:
            sys.exit('✗ refused, nothing touched: V1 is not the replay of transcript/cuts.json under this plan:\n  '
                     + '\n  '.join(why[:12]) + (f'\n  ... and {len(why) - 12} more' if len(why) > 12 else ''))
        return v1

    def report(self, v1, frame):
        n = {}
        for s, v in zip(self.segs, v1):
            shows = 'a' if base(v['path']) == s['clip'] else s['angle']
            n.setdefault((s['angle'], shows), 0)
            n[(s['angle'], shows)] += 1
        todo = sum(c for (want, shows), c in n.items() if want != shows)
        print(f'{len(self.segs)} segments: ' + ', '.join(f'{c} planned {w.upper()}' + ('' if w == sh else ' (still showing A)')
                                                          for (w, sh), c in sorted(n.items())))
        return todo

    def apply(self):
        o = self.read()
        v1 = self.check_v1(o)
        frame = int(float(o.get('frame') or 0))
        if self.report(v1, frame) == 0:
            print('✓ every segment already shows its planned angle: nothing to lay')
            return 0
        paths = sorted({str((self.dir / 'raw' / rel).resolve()) for rel in self.cams().values()})
        imp = self._parse(self.es(IMPORT_ES.replace('@PATHS@', json.dumps(paths)).replace('@BIN@', json.dumps(BIN))))
        name = dict(zip(paths, imp['names']))
        if not all(imp['names']):
            sys.exit(f'✗ refused: could not import {[p for p in paths if not name[p]]}. Nothing laid.')
        if imp['imported']:
            print(f'imported {imp["imported"]} camera clip(s) into the {BIN!r} bin')
        laid = 0
        for s, v in zip(self.segs, v1):
            if s['angle'] == 'a' or base(v['path']) != s['clip']:
                continue
            item = name[str((self.dir / 'raw' / s['cam_clip']).resolve())]
            st, en = int(v['start']), int(v['end'])
            b_in = cam_in(int(v['inp']), self.slip, frame, self.mc[s['cam_clip']])
            opts = {'job': self.rel, 'item': item, 'track': 'V1', 'in': b_in,
                    'out': b_in + (en - st) / TPS, 'at': st / TPS, 'pin': self.guard()}
            if v.get('label', -1) >= 0:
                opts['label'] = v['label']
            code, out, err = bridge('lay', json.dumps(opts))
            last = ((out or err).strip().splitlines() or [''])[-1]
            if code != 0:
                sys.exit(f'✗ segment {s["i"]} ({item} over {st / TPS:.3f}s): lay failed (exit {code}), stopping. '
                         f'{laid} laid before it, each saved.\n  {(err or out)[-600:]}')
            r = next((json.loads(l) for l in reversed(out.splitlines()) if l.startswith('{"track"')), {})
            laid += 1
            print(f'  #{s["i"]:>3} {st / TPS:8.3f}s  angle {s["angle"].upper()}  {item} @{b_in:.3f}s  '
                  f'{r.get("frames_laid", "?")}f')
        print(f'✓ laid {laid} angle segment(s) on V1; A1 untouched')
        return self.verify()

    def verify(self):
        o = self.read()
        v1 = self.check_v1(o)
        drift = [s for s, v in zip(self.segs, v1)
                 if base(v['path']) != (s['clip'] if s['angle'] == 'a' else base(s['cam_clip']))]
        self.report(v1, int(float(o.get('frame') or 0)))
        if drift:
            print(f'✗ {len(drift)} segment(s) do not show their planned angle: '
                  + ', '.join(f'#{s["i"]}' for s in drift[:20]))
            return 1
        print('✓ every segment shows its planned angle; V1 and A1 share every span')
        return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('job')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--apply', action='store_true')
    g.add_argument('--verify', action='store_true')
    a = ap.parse_args(argv)
    j = Job(a.job)
    if a.apply:
        return j.apply()
    if a.verify:
        return j.verify()
    o = j.read()
    j.report(j.check_v1(o), int(float(o.get('frame') or 0)))
    for s in j.segs:
        print(f'  #{s["i"]:>3} {s["clip"]} {s["start"]:.3f}-{s["end"]:.3f}  angle {s["angle"].upper()}'
              + (f'  <- {s["cam_clip"]} @{s["cam_start"]:.3f}s' if s.get('cam_clip') else ''))
    print('dry run: --apply lays them')
    return 0


if __name__ == '__main__':
    sys.exit(main())
