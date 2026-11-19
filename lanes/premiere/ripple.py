"""ripple.py: give a line more (or less) room on the live timeline without breaking anything after it.

  python3 lanes/premiere/ripple.py <T>:<frames>:tail|head [<T>:<frames>:tail|head ...] [--dry]
  python3 lanes/premiere/ripple.py --hygiene [--from <s>]        # only the A1 crossfade check-and-fix
  python3 lanes/premiere/ripple.py --close <T>                   # close the hole on V1 that ends at T: every clip on every
                                                                 # track starting at/after T moves left by the hole's length
  python3 lanes/premiere/ripple.py --tighten <T>:<frames> [--dry] # shorten the hole on V1 that ends at T by <frames> (a chapter
                                                                 # gap landing on a music beat): a clip ending inside the removed
                                                                 # window is trimmed to its new end, everything at/after T moves
                                                                 # left; refuses if a moved clip would land on a clip that stays

For each change (applied last first, so earlier times stay valid): every clip on every track that starts at/after T moves
by <frames> (latest first), then the A-roll gets the room: `tail` = the V1/A1 clip ENDING at T plays <frames> more of its
source (the pause after a line, rules/pacing.md: transitional and mistake lines, +6 frames ~ 0.2 s); `head` = the V1/A1
clip that now starts at T+frames is re-laid at T with <frames> more source before it (use it when the tail ends in a breath).
Positive frames only (more room); to remove time, re-cut (pipeline/recut.py).
Then crossfade hygiene on A1. Ends are set from TIMELINE values in whole frames, never from a clip's outPoint (lab-notes:
a stale outPoint after c.end undid a trim and overwrote the next clip's head on video 12).
"""
import json, sys
from lane import run, backup, crossfade_hygiene, aroll_item_js, FPS, TPF

a = sys.argv[1:]
if "--hygiene" in a:
    print(crossfade_hygiene(float(a[a.index("--from") + 1]) if "--from" in a else 0.0)); sys.exit(0)
if "--close" in a:
    T = float(a[a.index("--close") + 1]); backup("before closing a gap")
    print(run('''(function(){var s=app.project.activeSequence,TPF=%d,FPS=30000/1001,T=%f,v=s.videoTracks[0],prev=-1,L=[];
 for(var i=0;i<v.clips.numItems;i++){var e=v.clips[i].end.seconds;if(e<=T+0.002&&e>prev)prev=e}
 var D=Math.round(prev*FPS)-Math.round(T*FPS);if(prev<0||D>=0)return "no hole on V1 before "+T;
 function all(f){for(var t=0;t<s.videoTracks.numTracks;t++)f(s.videoTracks[t]);for(var t=0;t<s.audioTracks.numTracks;t++)f(s.audioTracks[t])}
 all(function(tr){for(var i=0;i<tr.clips.numItems;i++){var c=tr.clips[i];if(c.start.seconds>=T-0.002)L.push(c)}});
 L.sort(function(x,y){return x.start.seconds-y.start.seconds});var d=new Time();d.ticks=String(D*TPF);for(var j=0;j<L.length;j++)L[j].move(d);
 app.project.save();return "closed "+(-D)+" frames before "+T+": "+L.length+" clips moved"})()''' % (TPF, T), timeout=900000))
    print(crossfade_hygiene(T - 2)); sys.exit(0)
if "--tighten" in a:
    T, D = a[a.index("--tighten") + 1].split(":"); T = float(T); D = int(D)
    if D <= 0:
        sys.exit("--tighten <T>:<positive frames>")
    DRY = "--dry" in a
    if not DRY:
        backup("before tightening a gap")
    print(run('''(function(){var s=app.project.activeSequence,TPF=%d,FPS=30000/1001,T=%f,D=%d,DRY=%s,log=[],bad=[];
 var TF=Math.round(T*FPS),W=(TF-D)/FPS,v=s.videoTracks[0];
 for(var i=0;i<v.clips.numItems;i++){var c=v.clips[i];if(c.start.seconds<T-0.002&&c.end.seconds>W+0.002)return "ERROR: V1 is not a hole from "+W.toFixed(3)+" to "+T}
 function tracks(f){for(var t=0;t<s.videoTracks.numTracks;t++)f(s.videoTracks[t],"V"+(t+1));for(var t=0;t<s.audioTracks.numTracks;t++)f(s.audioTracks[t],"A"+(t+1))}
 var L=[],TR=[];
 tracks(function(tr,n){var stay=null,first=null;
  for(var i=0;i<tr.clips.numItems;i++){var c=tr.clips[i];
   if(c.start.seconds>=T-0.002){L.push(c);if(!first||c.start.seconds<first.start.seconds)first=c}
   else if(c.end.seconds>W+0.002){if(c.end.seconds<=T+0.002)TR.push([c,n]);else if(!stay||c.end.seconds>stay.end.seconds)stay=c}}
  if(stay&&first&&first.start.seconds-D/FPS<stay.end.seconds-0.002)bad.push(n+": "+first.name+" would land on "+stay.name)});
 if(bad.length)return "REFUSED: "+bad.join("; ");
 for(var k=0;k<TR.length;k++)log.push("trim "+TR[k][1]+" "+TR[k][0].name+" end "+TR[k][0].end.seconds.toFixed(3)+" -> "+W.toFixed(3));
 log.push("move "+L.length+" clips left "+D+" frames");if(DRY)return log.join(" | ");
 var e=new Time();e.ticks=String((TF-D)*TPF);for(var k=0;k<TR.length;k++)TR[k][0].end=e;
 L.sort(function(x,y){return x.start.seconds-y.start.seconds});var d=new Time();d.ticks=String(-D*TPF);for(var j=0;j<L.length;j++)L[j].move(d);
 app.project.save();return log.join(" | ")})()''' % (TPF, T, D, "true" if DRY else "false"), timeout=900000))
    if not DRY:
        print(crossfade_hygiene(T - 2))
    sys.exit(0)
CH = []
for x in [x for x in a if ":" in x]:
    T, n, kind = x.split(":"); n = int(n)
    if n <= 0 or kind not in ("tail", "head"):
        sys.exit(f"bad change {x}: <seconds>:<positive frames>:tail|head")
    CH.append([float(T), n, kind])
CH.sort(key=lambda c: -c[0])
print("changes (last first):", CH)
if "--dry" in a or not CH:
    sys.exit(0)
backup("before ripple")
print(run('''(function(){var s=app.project.activeSequence,TPF=%d,FPS=30000/1001,CH=%s,log=[];%s
 function all(f){for(var t=0;t<s.videoTracks.numTracks;t++)f(s.videoTracks[t]);for(var t=0;t<s.audioTracks.numTracks;t++)f(s.audioTracks[t])}
 if(!ITEM)return "ERROR: the camera file is not in the project";
 for(var k=0;k<CH.length;k++){var T=CH[k][0],D=CH[k][1],kind=CH[k][2],d=new Time();d.ticks=String(D*TPF);var n=0,L=[];
  all(function(tr){for(var i=0;i<tr.clips.numItems;i++){var c=tr.clips[i];if(c.start.seconds>=T-0.002)L.push(c)}});
  L.sort(function(a,b){return b.start.seconds-a.start.seconds});for(var j=0;j<L.length;j++){L[j].move(d);n++}
  var v=s.videoTracks[0],a=s.audioTracks[0];
  if(kind==="tail"){var tv=null,ta=null;for(var i=0;i<v.clips.numItems;i++)if(Math.abs(v.clips[i].end.seconds-T)<0.02)tv=v.clips[i];
   for(var i=0;i<a.clips.numItems;i++)if(Math.abs(a.clips[i].end.seconds-T)<0.02)ta=a.clips[i];
   var e=new Time();e.ticks=String((Math.round(T*FPS)+D)*TPF);if(tv)tv.end=e;if(ta)ta.end=e;
   log.push("tail "+T+" +"+D+"f V1 "+(tv?tv.end.seconds:"MISS")+" A1 "+(ta?ta.end.seconds:"MISS")+" moved "+n)}
  else{var nv=null,na=null,T2=(Math.round(T*FPS)+D)/FPS;for(var i=0;i<v.clips.numItems;i++)if(Math.abs(v.clips[i].start.seconds-T2)<0.02)nv=v.clips[i];
   for(var i=0;i<a.clips.numItems;i++)if(Math.abs(a.clips[i].start.seconds-T2)<0.02)na=a.clips[i];
   if(!nv||!na){log.push("head MISS at "+T2);continue}
   var inF=Math.round(nv.inPoint.seconds*FPS)-D,lenF=Math.round((nv.end.seconds-nv.start.seconds)*FPS)+D;nv.remove(false,false);na.remove(false,false);
   ITEM.setInPoint(inF/FPS+1e-4,4);ITEM.setOutPoint((inF+lenF)/FPS+1e-4,4);var t0=new Time();t0.ticks=String(Math.round(T*FPS)*TPF);v.overwriteClip(ITEM,t0);
   ITEM.clearInPoint(4);ITEM.clearOutPoint(4);log.push("head "+T+" re-laid from source "+(inF/FPS).toFixed(3)+" moved "+n)}}
 app.project.save();return log.join(" | ")})()''' % (TPF, json.dumps(CH), aroll_item_js()), timeout=900000))
print(crossfade_hygiene(min(c[0] for c in CH) - 1))
