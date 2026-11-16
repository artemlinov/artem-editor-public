"""swap-take.py: replace ONE A-roll clip on a finished timeline with another stretch of the camera file (another take,
or the same take with other edges), rippling what follows. Nothing else on V1/A1 is re-laid, so Artem's own clip
settings (scales, zoom keys, levels) stay as they are. Use it instead of relay.py once he has worked on the timeline.

  python3 lanes/premiere/swap-take.py <T>:<srcIn>:<srcOut> [<T>:<srcIn>:<srcOut> ...] [--dry]

<T> = timeline seconds where the V1 clip to replace starts; srcIn/srcOut = camera-file seconds, snapped to whole frames.
For each swap (applied last first, so earlier times stay valid): the V1 and A1 clips at T are removed; every clip on
every track that starts at or after the old clip's end moves by the length difference (left: earliest first, right:
latest first); the new stretch is overwritten at T; A1 crossfade hygiene; save.
Clips that SPAN the old clip's end (a song, a graphic over the join) do not move: they are listed, re-time them.
"""
import json, sys
from lane import run, backup, crossfade_hygiene, aroll_item_js, FPS, TPF

a = sys.argv[1:]; SW = []
for x in [x for x in a if ":" in x]:
    T, i, o = (float(v) for v in x.split(":"))
    inF = round(i * FPS); n = round(o * FPS) - inF
    if n <= 0:
        sys.exit(f"bad swap {x}")
    SW.append([T, inF, n])
SW.sort(key=lambda s: -s[0])
print("swaps (last first): " + "; ".join(f"at {T:.3f}: source {i / FPS:.3f}-{(i + n) / FPS:.3f} ({n} frames)" for T, i, n in SW))
if "--dry" in a or not SW:
    sys.exit(0)
backup("before swap-take")
print(run('''(function(){var s=app.project.activeSequence,TPF=%d,FPS=30000/1001,SW=%s,log=[];%s
 if(!ITEM)return "ERROR: the camera file is not in the project";
 function each(f){for(var t=0;t<s.videoTracks.numTracks;t++)f(s.videoTracks[t],"V"+(t+1));for(var t=0;t<s.audioTracks.numTracks;t++)f(s.audioTracks[t],"A"+(t+1))}
 var v=s.videoTracks[0],au=s.audioTracks[0];
 for(var k=0;k<SW.length;k++){var T=SW[k][0],inF=SW[k][1],N=SW[k][2],ov=null,oa=null;
  for(var i=0;i<v.clips.numItems;i++)if(Math.abs(v.clips[i].start.seconds-T)<0.02)ov=v.clips[i];
  for(var i=0;i<au.clips.numItems;i++)if(Math.abs(au.clips[i].start.seconds-T)<0.1)oa=au.clips[i];
  if(!ov||!oa){log.push("MISS at "+T);continue}
  var sF=Math.round(ov.start.seconds*FPS),eF=Math.round(ov.end.seconds*FPS),E=ov.end.seconds,D=N-(eF-sF),span=[],L=[];
  if(Math.abs(oa.end.seconds-E)>0.002||Math.abs(oa.start.seconds-ov.start.seconds)>0.002){log.push("STOP at "+T+": picture and sound of this clip are cut apart ("+oa.start.seconds+"-"+oa.end.seconds+"); do it by hand");continue}
  ov.remove(false,false);oa.remove(false,false);
  each(function(tr,nm){for(var i=0;i<tr.clips.numItems;i++){var c=tr.clips[i];if(c.start.seconds>=E-0.002)L.push(c);else if(c.end.seconds>E+0.002)span.push(nm+" "+c.name+" "+c.start.seconds.toFixed(3)+"-"+c.end.seconds.toFixed(3))}});
  L.sort(function(x,y){return D<0?x.start.seconds-y.start.seconds:y.start.seconds-x.start.seconds});
  if(D!==0){var d=new Time();d.ticks=String(D*TPF);for(var j=0;j<L.length;j++)L[j].move(d)}
  ITEM.setInPoint(inF/FPS+1e-4,4);ITEM.setOutPoint((inF+N)/FPS+1e-4,4);var t0=new Time();t0.ticks=String(sF*TPF);v.overwriteClip(ITEM,t0);ITEM.clearInPoint(4);ITEM.clearOutPoint(4);
  log.push("at "+T+": "+(eF-sF)+" -> "+N+" frames, "+L.length+" clips moved "+D+" frames"+(span.length?"; SPANNING (not moved): "+span.join(", "):""))}
 app.project.save();return log.join("\\n")})()''' % (TPF, json.dumps(SW), aroll_item_js()), timeout=900000))
print(crossfade_hygiene(min(s[0] for s in SW) - 1))
print("now: python3 lanes/premiere/dump-live.py, and check the new clip and what follows it")
