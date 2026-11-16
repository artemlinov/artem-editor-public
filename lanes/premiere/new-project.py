"""new-project.py: the current video's Premiere project and sequence, made by Claude (nobody clicks File > New).

  python3 lanes/premiere/new-project.py [--name "V13 Fable Editing"] [--sequence "V13 Cut 1"] [--keep-raw]

Needs work/job.json (pipeline/job.py init --aroll <camera file>). Steps:
  1. Premiere up: if the bridge is not answering, launch Premiere (premiere-up.sh) on a throwaway copy of a template
     project, because a Premiere with no project open has no panel to talk to (lab-notes).
  2. app.newProject(<job>/premiere/<name>.prproj); refuses if that file already exists (never overwrites a project).
  3. Imports the camera file into an "A-roll" bin and makes the sequence from it, so it takes the footage's own size and
     rate (4K, 29.97); empties the tracks (the cut is laid by the pipeline) unless --keep-raw; adds tracks up to
     V6 / A8 (graphics on V2-V4, ad audio A2, music A3, SFX A4-A7, as on video 12).
  4. Closes the throwaway host, saves, reads the project and sequence back, and writes the sequence name into job.json.
Names default from the video folder: "13 Fable 5.2 Editing" -> project "V13 Fable 5.2 Editing", sequence "V13 Cut 1".
"""
import json, os, re, shutil, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(REPO, "pipeline"))
from job import J  # noqa: E402

a = sys.argv[1:]
opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
m = re.match(r"(\d+)\s+(.*)", J.video or "")
num, title = (m.group(1), m.group(2)) if m else ("", J.video or "Video")
NAME = opt("--name") or re.sub(r"\s+", " ", f"V{num} " + re.sub(r"[^\w .,'-]", " ", title)).strip()
SEQ = opt("--sequence") or (f"V{num} Cut 1" if num else "Cut 1")
PROJ = os.path.join(J.premiere, f"{NAME}.prproj"); CAM = J.cfg["aroll"]
if os.path.exists(PROJ):
    sys.exit(f"{PROJ} already exists: nothing touched (open it, or pass --name for a new one)")
os.makedirs(J.premiere, exist_ok=True)


def es(script, timeout=600000):
    from pes import es as _es
    return _es(script, timeout=timeout)


def bridge_up():
    try:
        return bool(json.loads(es('(function(){return JSON.stringify({p:app.project?String(app.project.path):""})})()', 15000)))
    except BaseException:
        return False


host = None
if not bridge_up():
    host = os.path.join(J.cache, "premiere-host.prproj"); os.makedirs(J.cache, exist_ok=True)
    shutil.copy2(os.path.join(HERE, "premiere-templates", "adjustment-layer.prproj"), host)
    print("starting Premiere on a throwaway host project ...", flush=True)
    r = subprocess.run([os.path.join(HERE, "premiere-up.sh"), host])
    if r.returncode != 0 or not bridge_up():
        sys.exit("Premiere did not come up with its bridge (see premiere-up.sh output above)")
lit = json.dumps
made = json.loads(es('(function(){var made=app.newProject(%s);return JSON.stringify({made:!!made,path:app.project?String(app.project.path):""})})()' % lit(PROJ)))
time.sleep(1)
if os.path.realpath(made["path"]) != os.path.realpath(PROJ):
    sys.exit(f"app.newProject did not make {PROJ} the active project (active: {made['path']}): stopped before any import")
r = es(r'''(function(){var P=%s,CAM=%s,NAME=%s,KEEP=%s;
 if(String(app.project.path)!==P)return "ERROR: the active project is "+app.project.path;
 var root=app.project.rootItem,bin=root.createBin("A-roll");
 if(!app.project.importFiles([CAM],true,bin,false))return "ERROR: import failed for "+CAM;
 var base=CAM.replace(/^.*[\\\/]/,""),item=null;for(var i=0;i<bin.children.numItems;i++)if(bin.children[i].name===base)item=bin.children[i];
 if(!item)return "ERROR: "+base+" is not in the A-roll bin after the import";
 var seq=app.project.createNewSequenceFromClips(NAME,[item],root);if(!seq)return "ERROR: createNewSequenceFromClips returned nothing";
 app.project.openSequence(seq.sequenceID);seq=app.project.activeSequence;
 if(!KEEP){var L=[seq.videoTracks,seq.audioTracks];for(var l=0;l<2;l++)for(var t=0;t<L[l].numTracks;t++)for(var k=L[l][t].clips.numItems-1;k>=0;k--)L[l][t].clips[k].remove(false,false)}
 app.enableQE();var q=qe.project.getActiveSequence(),nv=Math.max(0,6-seq.videoTracks.numTracks),na=Math.max(0,8-seq.audioTracks.numTracks);
 if(nv||na)q.addTracks(nv,seq.videoTracks.numTracks,na,1,seq.audioTracks.numTracks,0,0,0);
 seq=app.project.activeSequence;var st=seq.getSettings();app.project.save();
 return JSON.stringify({seq:String(seq.name),w:Number(st.videoFrameWidth),h:Number(st.videoFrameHeight),fps:Math.round(254016000000/Number(seq.timebase)*1000)/1000,
  v:seq.videoTracks.numTracks,a:seq.audioTracks.numTracks,v1:seq.videoTracks[0].clips.numItems})})()''' % (lit(PROJ), lit(CAM), lit(SEQ), "true" if "--keep-raw" in a else "false"))
if r.startswith("ERROR"):
    sys.exit(r)
info = json.loads(r); print("sequence", info)
if host:
    es('(function(){for(var i=0;i<app.projects.numProjects;i++)if(String(app.projects[i].path)===%s){app.projects[i].closeDocument(0,0);break}'
       'for(var j=0;j<app.projects.numProjects;j++)if(String(app.projects[j].path)===%s){var p=app.projects[j];for(var k=0;k<p.sequences.numSequences;k++)'
       'if(String(p.sequences[k].name)===%s)p.openSequence(p.sequences[k].sequenceID)}return "ok"})()' % (lit(host), lit(PROJ), lit(SEQ)))
back = json.loads(es('(function(){var o=[];for(var i=0;i<app.projects.numProjects;i++)o.push(String(app.projects[i].path));'
                     'return JSON.stringify({active:String(app.project.path),seq:app.project.activeSequence?String(app.project.activeSequence.name):"",open:o})})()'))
print("now open:", back)
if os.path.realpath(back["active"]) != os.path.realpath(PROJ) or back["seq"] != SEQ:
    sys.exit("the new project or sequence is not the active one: check Premiere")
cfg = json.load(open(J.w("job.json"))); cfg["sequence"] = SEQ; cfg["project"] = PROJ
json.dump(cfg, open(J.w("job.json"), "w"), indent=1)
print(f"project {PROJ}\nsequence {SEQ} ({info['w']}x{info['h']} @ {info['fps']} fps, V1-V{info['v']}, A1-A{info['a']}) -> job.json")
