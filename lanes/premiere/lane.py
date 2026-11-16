"""lane.py: the shared base of the Premiere tools that came out of video 12 (dump-live, place-rows, sfx-tracks, relay,
ripple). One import gives the current video (pipeline/job.py), the bridge runner, the project guard and the JS pieces
every write needs.

    from lane import J, run, backup, crossfade_hygiene, TRACK_JS, AROLL_ITEM_JS, FPS, TPF

Every write goes through run(), which pins the job's project AND its sequence (work/job.json "sequence") first, so a
write can never land on another open project or timeline. Lessons behind the pieces are in lab-notes.md.
"""
import json, os, shutil, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(REPO, "pipeline"))
from job import J, FPS, TPF  # noqa: E402
from pes import es  # noqa: E402
from job_guard import pin_job_project, pin_script  # noqa: E402

_pin = None


def pin():
    global _pin
    if _pin is None:
        # the video's folder, not only Claude Edit/: a project Artem made himself sits beside the footage (video 13)
        _pin = pin_job_project(es, os.path.dirname(J.root), sequence=J.cfg.get("sequence"))
    return _pin


def run(js, timeout=600000):
    """Run an ExtendScript IIFE on the pinned project and sequence; a guard refusal comes back as 'ERROR: ...'."""
    return es(pin_script(pin(), js), timeout=timeout)


def backup(label):
    """Save, then copy the .prproj to <job>/premiere/backups/<name> - <label>.prproj. Every write tool calls this first."""
    proj = json.loads(run('(function(){app.project.save();return JSON.stringify({path:app.project.path})})()'))["path"]
    time.sleep(2)
    d = os.path.join(J.premiere, "backups"); os.makedirs(d, exist_ok=True)
    dst = os.path.join(d, f"{os.path.splitext(os.path.basename(proj))[0]} - {label}.prproj")
    shutil.copy2(proj, dst); print("backup", dst)
    return dst


# s.videoTracks / s.audioTracks by name ("V2", "A1")
TRACK_JS = 'function TRK(s,n){return n.charAt(0)==="V"?s.videoTracks[+n.substr(1)-1]:s.audioTracks[+n.substr(1)-1]}'

# the camera file's project item, found by file name (the project may link it from another folder)
AROLL_ITEM_JS = ('var ITEM=null;function WALK(b){for(var i=0;i<b.children.numItems;i++){var c=b.children[i];if(c.type===2)WALK(c);'
                 'else{try{if((c.getMediaPath()||"").split("/").pop()===%s&&!ITEM)ITEM=c}catch(e){}}}}WALK(app.project.rootItem);')


def aroll_item_js():
    return AROLL_ITEM_JS % json.dumps(os.path.basename(J.cfg["aroll"]))


def crossfade_hygiene(t0=0.0):
    """A1 after any move or re-lay (lab-notes: trackItem.move strands crossfades mid-clip, Artem heard them as glitches):
    remove every crossfade from t0 on that is not centred on a cut, add a 4-frame Constant Power to every adjacent cut
    that has none. Returns the bridge's report."""
    return run('''(function(){app.enableQE();var s=app.project.activeSequence,dt=s.audioTracks[0],q=qe.project.getActiveSequence().getAudioTrackAt(0),
 tr=qe.project.getAudioTransitionByName("Constant Power"),cuts=[],rm=0,add=0,T0=%f;
 for(var k=1;k<dt.clips.numItems;k++){var c=dt.clips[k],p=dt.clips[k-1];if(Math.abs(p.end.seconds-c.start.seconds)<0.002)cuts.push(c.start.seconds)}
 for(var i=q.numTransitions-1;i>=0;i--){var t=q.getTransitionAt(i);if(!t.name)continue;var m=(t.start.secs+t.end.secs)/2;if(m<T0)continue;
  var on=false;for(var j=0;j<cuts.length;j++)if(Math.abs(cuts[j]-m)<0.05)on=true;if(!on){t.remove();rm++}}
 var X=dt.transitions;for(var j=0;j<cuts.length;j++){if(cuts[j]<T0)continue;var hit=0;
  for(var i=0;i<X.numItems;i++){var m=(X[i].start.seconds+X[i].end.seconds)/2;if(Math.abs(m-cuts[j])<0.05)hit++}
  if(!hit){for(var i=0;i<q.numItems;i++){var it=q.getItemAt(i);if(String(it.type)==="Clip"&&Math.abs(it.start.secs-cuts[j])<0.005){it.addTransition(tr,true,"4","0",0.5,false,true);add++;break}}}}
 app.project.save();return "crossfades: stranded removed "+rm+", missing added "+add+" ("+cuts.length+" cuts)"})()''' % t0, timeout=600000)
