"""zoom-keys.py: a small eased push-in on the A-roll to carry a silence (rules/pacing.md: "Zoom on A-roll to carry a
silence: anchor point between his eyes").

  python3 lanes/premiere/zoom-keys.py <t0>:<t1>:<scale>[:<ax>:<ay>] [...]

On the V1 clip under t0 (timeline seconds): Scale goes from the clip's own value at t0 to <scale> at t1 (bezier keys, so it
eases) and holds to the clip's end; the next clip starts at its own scale again (the cut resets it). Anchor Point and
Position are both set to (ax, ay), fractions of the frame, default 0.50 0.31 = between his eyes, so the picture grows
around his eyes without sliding. Keys are written in the clip's media time (lab-notes). Saves, then reads the keys back.
"""
import json, sys
from lane import run, backup

Z = []
for x in sys.argv[1:]:
    p = x.split(":"); Z.append([float(p[0]), float(p[1]), float(p[2]), float(p[3]) if len(p) > 3 else .50, float(p[4]) if len(p) > 4 else .31])
if not Z:
    sys.exit(__doc__)
backup("before zoom-keys")
print(run('''(function(){var s=app.project.activeSequence,v=s.videoTracks[0],Z=%s,out=[];
 function prop(c,n){for(var j=0;j<c.components.numItems;j++){var cp=c.components[j];if(cp.displayName==="Motion")for(var q=0;q<cp.properties.numItems;q++)if(cp.properties[q].displayName===n)return cp.properties[q]}return null}
 for(var k=0;k<Z.length;k++){var z=Z[k],c=null;for(var i=0;i<v.clips.numItems;i++){var x=v.clips[i];if(x.start.seconds-0.001<=z[0]&&z[0]<x.end.seconds){c=x;break}}
  if(!c){out.push("no clip at "+z[0]);continue}
  var S=prop(c,"Scale"),P=prop(c,"Position"),A=prop(c,"Anchor Point"),base=S.isTimeVarying()?100:S.getValue();
  A.setValue([z[3],z[4]],1);P.setValue([z[3],z[4]],1);
  var m0=c.inPoint.seconds+(z[0]-c.start.seconds),m1=c.inPoint.seconds+(z[1]-c.start.seconds);
  if(S.isTimeVarying()){var ks=S.getKeys();for(var q=ks.length-1;q>=0;q--)S.removeKey(ks[q],1)}
  S.setTimeVarying(true);S.addKey(m0);S.setValueAtKey(m0,base,1);S.addKey(m1);S.setValueAtKey(m1,z[2],1);
  var kk=S.getKeys();for(var q=0;q<kk.length;q++){try{S.setInterpolationTypeAtKey(kk[q],4,1)}catch(e){}}
  out.push(c.start.seconds.toFixed(2)+": "+base+" -> "+z[2]+" over "+(z[1]-z[0]).toFixed(2)+" s, keys "+S.getKeys().length)}
 app.project.save();return out.join(" | ")})()''' % json.dumps(Z)))
