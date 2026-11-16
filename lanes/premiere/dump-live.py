"""dump-live.py: a full read of the LIVE sequence (every clip on every track: times, media path, speed, disabled, every
component property with its keyframes) -> work/dump.json. Read-only. Run it before every apply: Artem edits between
rounds, and his changes are the ground truth (and the lesson: diff his dump against the last one to see what he fixed).

  python3 lanes/premiere/dump-live.py [--out <name>.json]      # default work/dump.json; then pipeline/timeline.py build
"""
import json, sys
from lane import J, run

PAGE='''(function(){var s=app.project.activeSequence,T=%s,K=%d,N0=%d,N1=%d,out=[];var tr=T==="v"?s.videoTracks[K]:s.audioTracks[K];
function val(v){try{var j=JSON.stringify(v);if(j&&j.length>600)return "<"+j.length+" chars>"+j.substr(0,600);return v}catch(e){return String(v)}}
for(var i=N0;i<Math.min(N1,tr.clips.numItems);i++){var c=tr.clips[i],o={i:i,name:c.name,start:c.start.seconds,end:c.end.seconds,inP:c.inPoint.seconds,outP:c.outPoint.seconds,comps:[]};
 try{o.path=c.projectItem?c.projectItem.getMediaPath():null}catch(e){}try{o.speed=c.getSpeed()}catch(e){}try{o.dis=c.disabled}catch(e){}
 for(var j=0;j<c.components.numItems;j++){var cp=c.components[j],co={n:cp.displayName,m:cp.matchName,p:[]};
  for(var k=0;k<cp.properties.numItems;k++){var p=cp.properties[k],po={n:p.displayName};
   try{if(p.isTimeVarying()){var ks=p.getKeys(),kk=[];for(var q=0;q<ks.length;q++)kk.push([ks[q].seconds,val(p.getValueAtKey(ks[q]))]);po.keys=kk;
     if(ks.length>1){var smp=[],a=ks[0].seconds,b=ks[ks.length-1].seconds;for(var z=0;z<=24;z++){var tt=new Time();tt.seconds=a+(b-a)*z/24;smp.push(val(p.getValueAtTime(tt)))}po.smp=smp}}
    else po.v=val(p.getValue())}catch(e){po.err=String(e)}
   co.p.push(po)}o.comps.push(co)}
 out.push(o)}return JSON.stringify(out)})()'''
info = json.loads(run('(function(){var s=app.project.activeSequence,o={name:s.name,end:s.end/254016000000,v:[],a:[]};'
                      'for(var i=0;i<s.videoTracks.numTracks;i++)o.v.push(s.videoTracks[i].clips.numItems);'
                      'for(var i=0;i<s.audioTracks.numTracks;i++)o.a.push(s.audioTracks[i].clips.numItems);return JSON.stringify(o)})()'))
print(info)
D = {"info": info, "v": [], "a": []}
for kind in ("v", "a"):
    for k, n in enumerate(info[kind]):
        clips = []
        for n0 in range(0, n, 6):
            clips += json.loads(run(PAGE % (json.dumps(kind), k, n0, n0 + 6), timeout=120000))
        D[kind].append(clips); print(kind, k + 1, len(clips))
out = J.w(sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "dump.json")
json.dump(D, open(out, "w"), indent=0); print("->", out)
