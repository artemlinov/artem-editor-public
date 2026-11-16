"""relay.py: apply a re-cut plan (work/relay-plan.json from pipeline/recut.py plan) to the live timeline.

  python3 lanes/premiere/relay.py [--dry]

Only after: a fresh dump (dump-live.py) the plan was built from, a clean proof (pipeline/proof.py), and Artem's OK.
A piece may carry `path` (another camera file than the job's: video 13's live section), and the plan may carry
"remove": [[track, start_s, name_prefix], ...] for clips the re-cut makes obsolete.
Order: backup; remove; move every other clip from T0 on to its new time (moving left: earliest first, so nothing collides);
clear V1/A1 from T0; re-lay the camera file piece by piece in whole frames; crossfade hygiene on A1 (one 4-frame
Constant Power on every cut, none stranded); save. Then dump-live again and check it against the plan.
"""
import json, sys
import os
from lane import J, run, backup, crossfade_hygiene, aroll_item_js, TRACK_JS, FPS, TPF

P = json.load(open(J.w("relay-plan.json"))); fr = lambda t: round(t * FPS)
V1 = []; pos = None
for p in P["v1"]:
    k = fr(p["start"]); n = fr(p["outP"] - p["inP"])
    if pos is not None and abs(k - pos) <= 1:
        k = pos
    V1.append([k, n, fr(p["inP"]), os.path.basename(p.get("path") or J.cfg["aroll"])]); pos = k + n
moves = sorted(P["moves"], key=lambda m: (m["to"] > m["start"], m["start"] if m["to"] <= m["start"] else -m["start"]))
print(f"T0 {P['T0']:.3f}: {len(V1)} V1 pieces, {len(moves)} moves, end {P['old_end']:.2f} -> {pos / FPS:.2f}")
if "--dry" in sys.argv:
    sys.exit(0)
backup("before relay")
if P.get("remove"):
    print(run('''(function(){var s=app.project.activeSequence,X=%s,n=0,miss=[];%s
 for(var k=0;k<X.length;k++){var tr=TRK(s,X[k][0]),hit=0;
  for(var i=tr.clips.numItems-1;i>=0;i--){var c=tr.clips[i];if(Math.abs(c.start.seconds-X[k][1])<0.03&&c.name.indexOf(X[k][2])===0){c.remove(false,false);n++;hit=1;break}}
  if(!hit)miss.push(X[k][0]+"@"+X[k][1])}
 return "removed "+n+"/"+X.length+(miss.length?" MISSING "+miss.join(","):"")})()''' % (json.dumps(P["remove"]), TRACK_JS), timeout=600000))
K = [[m["track"], m["start"], m["name"][:20], m["to"] - m["start"]] for m in moves]
print(run('''(function(){var s=app.project.activeSequence,K=%s,n=0,miss=[];%s
 for(var k=0;k<K.length;k++){var tr=TRK(s,K[k][0]),hit=0;
  for(var i=0;i<tr.clips.numItems;i++){var c=tr.clips[i];if(Math.abs(c.start.seconds-K[k][1])<0.03&&c.name.indexOf(K[k][2])===0){var d=new Time();d.seconds=K[k][3];c.move(d);n++;hit=1;break}}
  if(!hit)miss.push(K[k][0]+"@"+K[k][1])}
 return "moved "+n+"/"+K.length+(miss.length?" MISSING "+miss.join(","):"")})()''' % (json.dumps(K), TRACK_JS), timeout=600000))
print(run('''(function(){var s=app.project.activeSequence,T0=%f,n=0,R=%s,TPF=%d,FPS=30000/1001;%s
 function clr(tr){for(var i=tr.clips.numItems-1;i>=0;i--){var c=tr.clips[i];if(c.start.seconds>=T0-0.002){c.remove(false,false);n++}}}
 var IT={};function WK(b){for(var i=0;i<b.children.numItems;i++){var c=b.children[i];if(c.type===2)WK(c);else{try{var nm=(c.getMediaPath()||"").split("/").pop();if(nm&&!IT[nm])IT[nm]=c}catch(e){}}}}WK(app.project.rootItem);
 for(var k=0;k<R.length;k++)if(!IT[R[k][3]])return "ERROR: "+R[k][3]+" is not in the project";
 clr(s.videoTracks[0]);clr(s.audioTracks[0]);var vt=s.videoTracks[0];
 for(var k=0;k<R.length;k++){var X=IT[R[k][3]];X.setInPoint(R[k][2]/FPS+1e-4,4);X.setOutPoint((R[k][2]+R[k][1])/FPS+1e-4,4);var t=new Time();t.ticks=String(R[k][0]*TPF);vt.overwriteClip(X,t);X.clearInPoint(4);X.clearOutPoint(4)}
 app.project.save();
 return "cleared "+n+", laid "+R.length+": V1 "+vt.clips.numItems+" A1 "+s.audioTracks[0].clips.numItems})()''' % (P["T0"], json.dumps(V1), TPF, aroll_item_js()), timeout=900000))
print(crossfade_hygiene(P["T0"] - 1))
print("now: python3 lanes/premiere/dump-live.py, and check V1 against work/relay-plan.json")
