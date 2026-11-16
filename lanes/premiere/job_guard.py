"""The active-project guard every Premiere lane writer runs before its first readback or write.

Every lane script reads and writes `app.project.activeSequence`, which is whatever project the operator last
clicked. With two versions of one job open (v1 active, v2 behind it, 2026-09-13) the graphics placer laid all
37 of the v2 job's graphics over the v1 timeline, splitting v1's own graphics underneath; the damage never
reached disk only because the run was interrupted before its save, and v1 was reverted by closing without
saving. So the ACTIVE project must be THIS job's before anything is read or written: a .prproj under
`projects/<job>/` (the lane keeps it in `projects/<job>/premiere/`), or one named after the job folder. The
guard refuses, it never picks a project: making the right one active is the operator's click.

The right PROJECT is not enough (2026-09-22): `app.project.path` was one job's .prproj while
`app.project.activeSequence` was another open project's timeline, and a project holding a job's organic
sequence beside its AD clone takes the organic plans onto the AD whenever the AD is active. So after the
project check, the SEQUENCE RULE (the same rule premiere-bridge.mjs runs), with S = app.project.activeSequence:
  (a) no S: refuse.
  (b) S is not one of app.project.sequences: refuse, it belongs to another open project. Proved by the
      sequenceID AND by the project file S's own projectItem.treePath names (`\\<file>.prproj\\...`): a
      Save-As copy keeps every sequenceID (live 2026-09-23), so the ID alone passed the original's timeline
      with the copy active. Another open project of the SAME file name holding S (a Finder copy) is
      ambiguous and refuses too: close the other copy.
  (c) a requested name (`sequence`, else env VE_SEQUENCE): S.name must equal it, else refuse naming both.
  (d) otherwise, if the project holds a sequence named exactly the job folder and S.name differs: refuse,
      and name VE_SEQUENCE='<S.name>' as the way to target S deliberately.
  (e) otherwise pass.

    from job_guard import require_job_project
    require_job_project(es, job)          # es = the script's own bridge runner (script -> result string)

Passing ONCE is not enough (2026-10-22): during a batch of parallel edits place-graphics.py for one job laid four
graphics onto ANOTHER job's V3, because the active project switched mid-run (a click into the other timeline while
reviewing) after the startup guard had passed. So a writer PINS what the guard passed and re-confirms it before every
write: `pin_job_project` is the guard returning the pin (the job, the project path, the active sequence's ID and name),
`pin_js(pin)` folds the check into the top of a write script's own function body (the check and the writes are one
ExtendScript evaluation, so no click lands between them; `pin_script(pin, iife)` does it to a whole IIFE), and
`still_job_project(es, pin)` is the same check as its own
round-trip, before a write that is not a script of ours (a bridge `save_project`). Any change refuses: another project,
another sequence (by sequenceID), or a sequence whose treePath no longer names the pinned project's file. The words
come from PIN_FN, ExtendScript shared character for character with premiere-bridge.mjs (bridge-lib.mjs PIN_FN), so the
two lanes' refusals cannot drift.

    pin = pin_job_project(es, job)
    es(pin_script(pin, '(function(){ ...the writes... })()'))
    still_job_project(es, pin)            # then the save

Owner of the rule: lanes/premiere/lab-notes.md § The active project is checked before every write.

A SECTION sub-job's plan carries `timeline_offset`: where the section starts on the shared sequence. A creator's
ripple earlier in the sequence moves the whole section and nothing rewrites the plan, so a placer that trusts the
offset lays every row at the section's OLD position (2026-09-28: all 23 outro graphics duplicated on V3). So
`section_moved` reads the live V1 before the first write: the section is the LONGEST run of adjacent V1 clips of
its own media (the EDL's `clip` / `media` names and the files in its raw/), so a cold-open hook cut from the same
footage earlier on V1 is not taken for it, and that run must start at the offset, and at the EDL's first
`_timeline` when it carries one, within half a sequence frame.
"""
import importlib.util, json, os, re, shlex, sys
from pathlib import Path

TICKS = 254016000000     # Premiere ticks per second

# The longest run of adjacent V1 clips whose media basename is one of NAMES (another clip, or a gap of more than half a
# frame, ends a run), how many runs there were, and the sequence's frame in ticks. One small answer however long V1 is,
# so it is never paged. `%s` = the caller's prelude (`var seq` and its sequence refusal), then NAMES, then the fallback
# frame in seconds for a sequence whose timebase cannot be read.
SECTION_ES = r"""(function(){ %s
  var NAMES = %s, FB = %s, fr = 0, runs = 0, cur = null, best = null, tr = seq.videoTracks.numTracks ? seq.videoTracks[0] : null;
  try { fr = Number(seq.timebase); } catch (e) {}
  var tol = (fr > 0 ? fr / 254016000000 : FB) / 2, all = [];
  for (var i = 0; tr && i < tr.clips.numItems; i++) { var c = tr.clips[i];
    all.push({s: c.start.seconds, e: c.end.seconds, b: String(c.projectItem ? c.projectItem.getMediaPath() : "").split(/[\/\\]/).pop() || ""}); }
  all.sort(function (x, y) { return x.s - y.s; });
  for (var j = 0; j < all.length; j++) { var a = all[j];
    if (!NAMES.hasOwnProperty(a.b)) { cur = null; continue; }
    if (cur && a.s - cur.end <= tol) cur.end = a.e;
    else { cur = {start: a.s, end: a.e, name: a.b}; runs++; }
    if (best === null || cur.end - cur.start > best.end - best.start) best = cur; }
  return JSON.stringify({first: best, runs: runs, frame: fr > 0 ? fr : 0, seq: String(seq.name)});
})()"""

GUARD_ES = r"""(function(){ var o = {path: app.project ? app.project.path : "", open: [], active: null, activeInProject: false, sequences: [], ambiguous: []};
  var B = String.fromCharCode(92);
  function fileOf(x) { x = String(x); return x.substring(Math.max(x.lastIndexOf("/"), x.lastIndexOf(B)) + 1); }
  try { for (var i = 0; i < app.projects.numProjects; i++) o.open.push(app.projects[i].path); } catch (e) {}
  if (app.project) { var s = app.project.activeSequence, file = fileOf(o.path), own = false;
    if (s) { o.active = {name: s.name, sequenceID: s.sequenceID};
      try { own = String(s.projectItem.treePath).indexOf(B + file + B) === 0; } catch (e) {} }
    for (var j = 0; j < app.project.sequences.numSequences; j++) { var q = app.project.sequences[j];
      o.sequences.push(q.name);
      if (s && own && q.sequenceID === s.sequenceID) o.activeInProject = true; }
    if (o.activeInProject) { try { for (var k = 0; k < app.projects.numProjects; k++) { var p = app.projects[k];
        if (p.path === o.path || fileOf(p.path) !== file) continue;
        for (var m = 0; m < p.sequences.numSequences; m++) if (p.sequences[m].sequenceID === s.sequenceID) { o.ambiguous.push(p.path); break; } } }
      catch (e) { o.ambiguous.push("an open project whose sequences could not be read"); } } }
  return JSON.stringify(o); })()"""

# THE PIN CHECK, identical to bridge-lib.mjs's PIN_FN (no backslash: B is char 92, as in GUARD_ES): "" while the
# active project and sequence are still the pin's, else the refusal, one line. The treePath test is GUARD_ES's own
# (the sequence's owning project file), so a Save-As copy's timeline, which keeps every sequenceID, still refuses. A
# function EXPRESSION, never a declaration: the bridge's `es` runs a script inside `try { }`, where ES3 has no
# function declarations.
PIN_FN = r"""var jobMoved = function (PIN) { var B = String.fromCharCode(92), p = app.project, s = p ? p.activeSequence : null;
  var path = p ? String(p.path) : "", tree = "", file = PIN.path.substring(Math.max(PIN.path.lastIndexOf("/"), PIN.path.lastIndexOf(B)) + 1);
  if (s) { try { tree = String(s.projectItem.treePath); } catch (e) {} }
  if (path === PIN.path && s && String(s.sequenceID) === PIN.id && tree.indexOf(B + file + B) === 0) return "";
  return "the active timeline changed mid-run: " + (s ? s.name : "no sequence") + " in " + (path || "no project") + " is in front, not "
    + PIN.name + " in " + PIN.path + ", the one the guard passed for " + PIN.job + " when this run started: nothing touched by this step. "
    + "Click " + PIN.name + " (or close the other project) and re-run; what this run wrote before this point is on " + PIN.name + "."; };"""


def es_lit(v):
    """pes.es_lit, copied rather than imported: this module is also loaded alone, by path, with lanes/premiere off
    sys.path (workflows/test_premiere_bridge.py). `v` as a script literal, every '.', '(' and '_' inside a string a
    \\u escape, so the panel's script filter never matches a name or path."""
    return re.sub(r'"(?:[^"\\]|\\.)*"', lambda m: re.sub(r'[._(]', lambda c: '\\u%04x' % ord(c.group()), m.group()),
                  json.dumps(v))


def job_root(job):
    """The `projects/<job>` folder that owns a path: a section sub-job (`projects/<job>/sections/<s>`, the
    multi-section pattern) shares its parent's .prproj, so the guard walks up to the child of `projects/`."""
    job = Path(job).resolve()
    for anc in [job, *job.parents]:
        if anc.parent.name == 'projects':
            return anc
    return job


def batch_lease(job, ttl=None):
    """The batch's Premiere lease (workflows/slots.py, lanes/premiere/lease.py; 2026-10-19): every guarded write of the
    job holding it renews it (`ttl`: the minutes it then holds, for a write that outlives the lease's own TTL; else
    the TTL is unchanged), and a refusal while another job holds it says so on stderr, BEFORE the refusal, whose
    words stay the bridge guard's word for word (workflows/test_premiere_bridge.py). Never takes one: a single edit
    has none. No slots.py, or any error in it: nothing, the guard itself is unchanged. While another job, or the
    creator's own hold, owns the lease, pin_job_project refuses the write even when this job's project is the active
    one (2026-10-22: the creator clicked through every timeline while he reviewed, so a job's project could be active
    without its lease, and its writes landed while he watched)."""
    try:
        spec = importlib.util.spec_from_file_location('ve_slots', Path(__file__).resolve().parents[2] / 'workflows' / 'slots.py')
        slots = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(slots)
        state, o = slots.lease_check('premiere', job)
        if state == 'ours':
            slots.lease_take('premiere', job, ttl)
        if state != 'other':
            return ""
        if o.get('job') == slots.CREATOR:
            return ("Premiere is held by the creator (reviewing): `uv run lanes/premiere/lease.py take projects/"
                    f"{job.name} --wait 14400` (in the background) queues for it; it is yours once the hold ends.")
        return (f"Premiere is leased to {o['name']} (a batch): `uv run lanes/premiere/lease.py take projects/{job.name}"
                " --wait 14400` (in the background) queues for it and makes this job's project active.")
    except Exception:
        return ""


def require_job_project(es, job, sequence=None):
    return pin_job_project(es, job, sequence)['path']


def pin_job_project(es, job, sequence=None):
    """The guard (one GUARD_ES round-trip, the refusals below), returning the PIN it passed: {job, path, id, name},
    the job folder's name, the active project's path and the active sequence's ID and name. pin_js and
    still_job_project hold every later write to it."""
    job = job_root(job)
    leased = batch_lease(job)
    o = json.loads(es(GUARD_ES))
    p = Path(o.get('path') or '')
    if not o.get('path') or not (str(p.resolve()).startswith(str(job) + os.sep) or p.stem == job.name):
        if leased:
            print(leased, file=sys.stderr)
        sys.exit(f"the ACTIVE Premiere project is {o.get('path') or 'none'}, not this job's ({job.name}/premiere/*.prproj): nothing touched.\n"
                 f"  open projects: {', '.join(o.get('open') or []) or 'none'}\n"
                 "  Make the job's project active (click its timeline, or close the other) and re-run.")
    s, want, names = o.get('active'), sequence or os.environ.get('VE_SEQUENCE') or None, o.get('sequences') or []
    if not s:
        sys.exit(f"there is no active sequence in {o['path']}: nothing touched.\n"
                 "  Open the job's timeline and re-run.")
    if not o.get('activeInProject'):
        sys.exit(f"the active sequence {s['name']} belongs to another open project, not {o['path']}: nothing touched.\n"
                 f"  open projects: {', '.join(o.get('open') or []) or 'none'}\n"
                 "  Click this job's timeline (or close the other project) and re-run.")
    if o.get('ambiguous'):
        sys.exit(f"the active sequence {s['name']} is also in {', '.join(o['ambiguous'])}, another open project with the same file name,"
                 " so which copy it belongs to cannot be proven: nothing touched.\n"
                 "  Close the other copy and re-run.")
    if leased:
        sys.exit(f"{leased}\nThis job does not hold the Premiere lease, so nothing is written although its project is"
                 " active: nothing touched.")
    if want and s['name'] != want:
        sys.exit(f"the active sequence is {s['name']}, not the requested {want}: nothing touched.\n"
                 f"  sequences in this project: {', '.join(names) or 'none'}\n"
                 "  Open the requested sequence (or change VE_SEQUENCE) and re-run.")
    if not want and job.name in names and s['name'] != job.name:
        sys.exit(f"the active sequence is {s['name']}, not the job's own sequence {job.name}: nothing touched.\n"
                 f"  To target {s['name']} deliberately, set VE_SEQUENCE='{s['name']}' and re-run.")
    return {'job': job.name, 'path': o['path'], 'id': str(s.get('sequenceID')), 'name': s['name']}


def pin_js(pin):
    """ES statements for the TOP of a write script's function body: the whole script returns "ERROR: <refusal>" before
    its first write unless the active project and sequence are still `pin`'s. The check and the writes are one
    evaluation, so nothing lands between them. No pin (a test's stubbed guard) folds nothing."""
    if not pin:
        return ''
    return PIN_FN + ' var JOB_MOVED = jobMoved(' + es_lit(pin) + '); if (JOB_MOVED) return "ERROR: " + JOB_MOVED; '


def pin_script(pin, script):
    """`script`, an IIFE, with pin_js(pin) as the first statement of its function body; no pin, the script unchanged."""
    if not pin:
        return script
    s = script.lstrip()
    if not s.startswith('(function(){'):
        raise ValueError(f'not an IIFE, so the pin cannot open it: {s[:40]!r}')
    return '(function(){ ' + pin_js(pin) + s[len('(function(){'):]


def still_job_project(es, pin):
    """The pin check as its own round-trip, before a write that is not a script of ours (a bridge `save_project`):
    exits with PIN_FN's refusal when the active project or sequence is no longer `pin`'s."""
    if not pin:
        return
    got = es('(function(){ %s return jobMoved(%s) || "pinned"; })()' % (PIN_FN, es_lit(pin)))
    if got != 'pinned':
        sys.exit(got)


def foreign_job(path, job):
    """The name of ANOTHER job whose folder holds media `path` (a clip under projects/<other>/ beside this job's), else
    None: another job's media on this job's timeline is a write that went to the wrong project (2026-10-22)."""
    if not path:
        return None
    root = job_root(job)
    norm = lambda x: os.path.normcase(os.path.realpath(str(x)))     # job_root resolves: a /tmp-style link must too
    p, projects = norm(path), norm(root.parent) + os.sep
    if not p.startswith(projects) or p.startswith(norm(root) + os.sep):
        return None
    return p[len(projects):].split(os.sep, 1)[0]


def section_moved(es, prelude, job, offset, frame, cuts_p, plan_name):
    """None when a SECTION sub-job sits on the live V1 where its plan says, else the message naming the live start,
    the plan's offset, the difference and the fix. `prelude` declares `var seq` with the caller's sequence refusal,
    `frame` (seconds) stands in when the sequence's own timebase cannot be read. The caller refuses or reports."""
    job, cuts_p = Path(job), Path(cuts_p)
    segs = json.loads(cuts_p.read_text(encoding='utf-8')).get('segments', []) if cuts_p.exists() else []
    names = {str(s[k]).replace('\\', '/').rsplit('/', 1)[-1] for s in segs for k in ('clip', 'media') if s.get(k)}
    if (job / 'raw').is_dir():
        names |= {p.name for p in (job / 'raw').iterdir() if p.is_file()}
        # a two-camera job's other angles sit on V1 inside the section's run (lanes/premiere/lay-angles.py)
        names |= {p.name for d in (job / 'raw').glob('angle-*') if d.is_dir() for p in d.iterdir() if p.is_file()}
    got =json.loads(es(SECTION_ES % (prelude, json.dumps(dict.fromkeys(sorted(names), 1)), frame)))
    if not got.get('first'):
        return (f"✗ no V1 clip of this section's media ({', '.join(sorted(names)) or 'none'}) is on {got.get('seq')}: nothing "
                f"proves the section starts at {plan_name}'s timeline_offset {offset:.6f}s.\n"
                f"  Open the sequence that carries the section and re-run.")
    F = got['frame'] / TICKS if got.get('frame') else frame
    live, first = float(got['first']['start']), got['first']['name']
    tl = segs[0].get('_timeline') if segs else None
    bad = []
    if abs(live - offset) > F / 2:
        bad.append(f"{plan_name}'s timeline_offset is {offset:.6f}s: {live - offset:+.4f}s ({(live - offset) / F:+.1f} frames)")
    if isinstance(tl, list) and tl and abs(float(tl[0]) - live) > F / 2:
        bad.append(f"{cuts_p.name}'s first segment _timeline[0] is {float(tl[0]):.6f}s: {live - float(tl[0]):+.4f}s "
                   f"({(live - float(tl[0])) / F:+.1f} frames)")
    if not bad:
        return None
    edl, to = ('', '') if cuts_p.name == 'cuts.json' else (f' --edl transcript/{cuts_p.name}', f' --to transcript/{cuts_p.name}')
    # the fix commands are pasted into a shell: repo-relative and forward-slashed (Git Bash drops a backslash path's
    # separators, C:\Users\...\outro -> C:Users...outro), quoted for a space
    root = Path(__file__).resolve().parents[2]
    job = shlex.quote((job.relative_to(root) if job.is_relative_to(root) else job).as_posix())
    runs = f" (the longest of {got['runs']} runs of its media on V1)" if (got.get('runs') or 0) > 1 else ''
    return (f"✗ THE SECTION MOVED: it starts at {live:.6f}s on {got.get('seq')} ({first}){runs}, but "
            + ' and '.join(bad) + ": every row would be placed against where the section WAS.\n"
            f"  The timeline moved under the plan (a ripple earlier in the sequence). Re-read it, then re-time:\n"
            f"    1. uv run lanes/premiere/live-edl.py {job}{edl} --write   (the live cut and its _timeline into {cuts_p.name}; "
            f"the old one is backed up as {cuts_p.stem}.pre-live-<stamp>.json)\n"
            f"    2. uv run workflows/ripple-cut.py {job} --from transcript/{cuts_p.stem}.pre-live-<stamp>.json{to} --apply   "
            f"(moves {plan_name}'s timeline_offset to {live:.6f} and the SFX cues with it, re-stamps cut_rev)\n"
            f"  then re-run this.")
