#!/usr/bin/env python
"""lease.py: the Premiere lease for a batch of parallel edits. One job drives Premiere at a time, in its own project.

    uv run lanes/premiere/lease.py take projects/<job> [--wait <s>] [--ttl <min>] [--front]  # queue, make it active
    uv run lanes/premiere/lease.py release projects/<job>                           # save its project, free Premiere
    uv run lanes/premiere/lease.py offline projects/<job> -- <command ...>          # close it, run, reopen (holder)
    uv run lanes/premiere/lease.py hold [--ttl <min>] [--wait <s>]                  # the creator reviews: writers wait
    uv run lanes/premiere/lease.py unhold
    uv run lanes/premiere/lease.py status

Why (2026-10-19): Premiere has ONE active timeline across every open project (`activeSequence` is global: lab-notes.md
§ The active project is checked before every write), so ten sessions editing ten videos can never write at once,
however the videos are laid out. Ten sequences in one project change nothing, and one shared project would put every
job's footage, graphics and saves in one file that takes the whole batch down together. So each job keeps its OWN
project (projects/<job>/premiere/<job>.prproj, as on a single edit) and the sessions take turns: `take` queues for
workflows/slots.py's `premiere` lease, makes the job's project active (the ONE sanctioned switch of the active
project: every writer's guard still refuses, never picks) and reads the guard back before it returns. The lease holds
30 min past its last renewal; `take` renews it and so does every guarded writer of the holding job (job_guard.py).
`release` saves the job's project and hands Premiere to the next job in the queue.

The switch is lab-notes.md § Switch the active project: an OPEN project is activated by
app.projects[j].openSequence(<its sequence named after the job, else VE_SEQUENCE's, else its first>), never by
app.openDocument of an open project (that moves app.project and leaves the old timeline focused); a project that is
not open is opened with app.openDocument(path). The job's project is projects/<job>/premiere/<job>.prproj, else the
newest .prproj directly in projects/<job>/premiere/, else directly in projects/<job>/: never a backup or an auto-save
in a subfolder (2026-10-22: a recursive search made a job's archived backup its active project).

`hold` is the creator's own: while he reviews in Premiere the lease is his (workflows/slots.py `@creator`, 60 min,
renewed by holding again), so no session takes Premiere from under him and every guarded write refuses, whichever
project he clicks into (job_guard.py). Held while a job is mid-stretch, it queues FIRST and waits (an hour unless
--wait says otherwise; run it in the background): the job finishes its stretch, nothing new starts, and it is his. Sessions laying his notes queue and run when he says `unhold`, or when the hold
lapses. `--front` queues a take ahead of every plain waiter: work he is waiting on live.

`offline` is for a tool that rewrites the job's .prproj on disk (grade-lut.py apply): it needs the job to hold the
lease, saves and closes ONLY the job's project (Premiere and every other job's project stay open), runs the command,
then reopens the project and makes it active again through the guard. The batch's route for the grade (2026-10-21:
grade-lut.py's own route quits Premiere, which a batch never does, so all nine sessions improvised this by hand).
When the job's project is the ONLY one open, `offline` closes nothing and runs nothing (exit 1): with no project open
Premiere drops the CEP panel and the bridge dies for every session. It names the single-edit route instead
(premiere-up.sh --quit, the command, premiere-up.sh <prproj>), run still holding the lease.

Exit 0 = the job holds Premiere (take), released it, or `offline` ran its command and reopened the project (else the
command's own exit code). 1 = Premiere would not show the job's project (the guard's refusal is printed, and the lease
is given back), or `offline` refused the only open project (the lease stays held). 3 = another job (or the creator's
hold) still holds it after --wait. 4 = `offline` without the lease.
"""
import argparse, importlib.util, json, os, re, shlex, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from job_guard import require_job_project, job_root   # noqa: E402
from pes import es, es_lit                            # noqa: E402

_spec = importlib.util.spec_from_file_location('ve_slots', HERE.parents[1] / 'workflows' / 'slots.py')
slots = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(slots)

ACTIVATE_ES = r"""(function(){
var P = @PATH@, WANT = @SEQ@, B = String.fromCharCode(92);
function norm(x) { return String(x).split(B).join("/").toLowerCase(); }
function find() { for (var i = 0; i < app.projects.numProjects; i++) if (norm(app.projects[i].path) === norm(P)) return app.projects[i]; return null; }
var proj = find(), opened = false;
if (!proj) { app.openDocument(P, true, true, true); proj = find(); opened = true; }
if (!proj) return "ERROR: Premiere did not open " + P;
var seq = null;
for (var s = 0; s < proj.sequences.numSequences; s++) if (String(proj.sequences[s].name) === WANT) seq = proj.sequences[s];
if (!seq && proj.sequences.numSequences) seq = proj.sequences[0];
if (seq) proj.openSequence(seq.sequenceID);
return JSON.stringify({opened: opened, seq: seq ? String(seq.name) : "", active: app.project ? String(app.project.path) : ""});
})()"""

SAVE_ES = r"""(function(){
var P = @PATH@, B = String.fromCharCode(92);
function norm(x) { return String(x).split(B).join("/").toLowerCase(); }
for (var i = 0; i < app.projects.numProjects; i++) if (norm(app.projects[i].path) === norm(P)) { app.projects[i].save(); return "saved"; }
return "not open";
})()"""


def job_project(job):
    """The job's .prproj: premiere/<job>.prproj, else the newest directly in premiere/, else directly in the job
    folder. Never a subfolder (archive/, backups, Adobe's Auto-Save) and never a name marked as a copy."""
    own = job / 'premiere' / f'{job.name}.prproj'
    if own.is_file():
        return own
    for top in (job / 'premiere', job):
        found = [p for p in top.glob('*.prproj') if not re.search(r'auto-save|backup|\.pre-|\bcopy\b', p.name, re.I)] \
            if top.is_dir() else []
        if found:
            return max(found, key=lambda p: p.stat().st_mtime)
    return None


def take(job, wait, ttl, front=False):
    got = slots.lease_take('premiere', job, ttl, wait, front=front)
    if got is None:
        o = slots.lease_owner('premiere')
        print(f"busy: Premiere is leased to {o['name'] if o else 'the job queued ahead'}"
              + (f" until {slots._clock(o['renewed'] + o['ttl_min'] * 60)}" if o else "")
              + ". Queue with --wait <s>, in the background: you are told when it is yours.")
        return 3
    o = slots.lease_owner('premiere')
    until = slots._clock(o['renewed'] + o['ttl_min'] * 60)
    prproj = job_project(job)
    if prproj is None:
        print(f"{got}: Premiere is {job.name}'s until {until}. No project yet: create it "
              f"(premiere-pro § Create the project) and it is the active one.")
        return 0
    want = os.environ.get('VE_SEQUENCE') or job.name
    try:
        r = json.loads(es(ACTIVATE_ES.replace('@PATH@', es_lit(str(prproj))).replace('@SEQ@', es_lit(want))))
        require_job_project(es, job)
    except SystemExit as e:
        slots.lease_release('premiere', job)
        print(f"{e.code}\nThe lease is given back: Premiere could not show {job.name}'s project.", file=sys.stderr)
        return 1
    print(f"{got}: Premiere is {job.name}'s until {until}; {prproj.name} active on {r['seq'] or 'no sequence'}"
          + (" (opened)" if r['opened'] else ""))
    return 0


CLOSE_ES = r"""(function(){
var P = @PATH@, B = String.fromCharCode(92);
function norm(x) { return String(x).split(B).join("/").toLowerCase(); }
for (var i = 0; i < app.projects.numProjects; i++) if (norm(app.projects[i].path) === norm(P)) {
  if (app.projects.numProjects < 2) return "alone";
  app.projects[i].save(); app.projects[i].closeDocument(1, 0); return "closed"; }
return "not open";
})()"""


def offline(job, cmd):
    """Close only the job's project, run `cmd`, reopen it active. Needs the job's lease."""
    if slots.lease_check('premiere', job)[0] != 'ours':
        print(f"offline needs the Premiere lease: `uv run lanes/premiere/lease.py take projects/{job.name} --wait 14400`"
              " first (in the background)", file=sys.stderr)
        return 4
    prproj = job_project(job)
    if prproj is None:
        print(f"no project under {job}/premiere/", file=sys.stderr)
        return 1
    closed = es(CLOSE_ES.replace('@PATH@', es_lit(str(prproj))))
    print(f"offline: {prproj.name} {closed}", flush=True)
    if closed.strip() == 'alone':                   # closing the last project drops the CEP panel: the bridge dies
        print(f"offline: {prproj.name} is the only open project, and with no project open Premiere drops the CEP panel "
              "(lab-notes.md § Every step), so nothing is closed and nothing runs. No other job's project is open, so "
              "take the single-edit route, still holding the lease: ./lanes/premiere/premiere-up.sh --quit, then the "
              f"command, then ./lanes/premiere/premiere-up.sh {shlex.quote(str(prproj))}", file=sys.stderr)
        return 1
    if closed.strip() != 'closed':
        print("offline: Premiere did not close the project, so nothing runs (a rewrite under an open project is lost at "
              "its next save)", file=sys.stderr)
        take(job, 0, None)
        return 1
    try:
        rc = subprocess.run(cmd).returncode
    finally:
        back = take(job, 0, None)           # ours: renews, reopens and re-activates through the guard
    return rc or back


def release(job):
    prproj = job_project(job)
    state, _ = slots.lease_check('premiere', job)
    if state != 'ours':
        print("Premiere was not this job's: nothing released")
        return 0
    saved = es(SAVE_ES.replace('@PATH@', es_lit(str(prproj)))) if prproj else "no project"
    slots.lease_release('premiere', job)
    print(f"released ({saved})")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument('action', choices=('take', 'release', 'offline', 'hold', 'unhold', 'status'))
    ap.add_argument('job', nargs='?')
    ap.add_argument('--wait', type=float, default=0.0, help='seconds to queue for Premiere (0: answer now)')
    ap.add_argument('--ttl', type=float, help='minutes the lease holds after this take (default 30; a hold: 60)')
    ap.add_argument('--front', action='store_true', help='queue ahead of every plain waiter (the creator waits on it)')
    argv = sys.argv[1:] if argv is None else list(argv)
    cmd = argv[argv.index('--') + 1:] if '--' in argv else []
    a = ap.parse_args(argv[:argv.index('--')] if '--' in argv else argv)
    if a.action == 'status':
        o, q = slots.lease_owner('premiere'), slots.queue('premiere')
        print(f"Premiere: {o['name'] + ' until ' + slots._clock(o['renewed'] + o['ttl_min'] * 60) if o else 'free'}"
              + (f" · queued: {', '.join(w['name'] for w in q)}" if q else ""))
        return 0
    if a.action == 'hold':
        o = slots.lease_owner('premiere')
        if o and o['job'] != slots.CREATOR and not a.wait:
            print(f"queued first: Premiere is the creator's once {o['name']} ends its stretch (by "
                  f"{slots._clock(o['renewed'] + o['ttl_min'] * 60)} at the latest); no new stretch starts meanwhile",
                  flush=True)
        got = slots.lease_take('premiere', slots.CREATOR, a.ttl, a.wait or 3600)
        o = slots.lease_owner('premiere')
        if got is None:
            print(f"busy: Premiere is {o['name'] if o else 'the next job'}'s; the hold queues first with --wait <s>")
            return 3
        print(f"{got}: Premiere is held for the creator until {slots._clock(o['renewed'] + o['ttl_min'] * 60)};"
              " sessions queue and every guarded write refuses until `unhold`")
        return 0
    if a.action == 'unhold':
        print("released: sessions take Premiere in queue order" if slots.lease_release('premiere', slots.CREATOR)
              else "Premiere was not held for the creator")
        return 0
    if not a.job:
        ap.error(f'{a.action} needs projects/<job>')
    job = job_root(a.job)
    if not job.is_dir():
        ap.error(f'no job folder at {a.job}')
    if a.action == 'offline':
        if not cmd:
            ap.error('offline needs a command after --')
        return offline(job, cmd)
    return take(job, a.wait, a.ttl, a.front) if a.action == 'take' else release(job)


if __name__ == '__main__':
    sys.exit(main())
