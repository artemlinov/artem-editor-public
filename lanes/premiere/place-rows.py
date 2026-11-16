"""place-rows.py: lay files on the live timeline from a rows file, frame-exact, and READ THEM BACK.

  python3 lanes/premiere/place-rows.py <rows.json> [--dry]

rows.json: {"remove": [[track, start_s, name_prefix], ...],
            "rows":   [{"file", "track": "V2"|"A4"..., "start": s, "end": s|null, "bin": "Graphics", "db": gain|null, "in": s}]}
Order: backup, remove the listed clips, import every new file once into its bin, overwrite each row at its frame (an
`end` trims the clip to that exact frame; `in` is the source in point; `db` sets Volume > Level), save, read back.
A source in point is WRITTEN BACK after the lay: `overwriteClip` floors it to the frame grids (a sound slice asked for at
0.234 s landed at 0.167 s, so its transient played 2 frames late; lab-notes, "An audio overwriteClip also FLOORS").
A row the readback cannot find at its frame prints BAD and the script exits 1.
"""
import json, os, sys
from lane import J, run, backup, TRACK_JS, FPS, TPF


def place(P, dry=False):
    for p in {r["file"] for r in P["rows"]}:
        if not os.path.exists(p):
            sys.exit("missing " + p)
    if dry:
        print(f"remove {len(P.get('remove', []))}, rows {len(P['rows'])} on {sorted({r['track'] for r in P['rows']})}"); return 0
    backup("before place-rows")
    if P.get("remove"):
        print(run('''(function(){var s=app.project.activeSequence,X=%s,n=0,miss=[];%s
 for(var k=0;k<X.length;k++){var tr=TRK(s,X[k][0]),hit=0;
  for(var i=tr.clips.numItems-1;i>=0;i--){var c=tr.clips[i];if(Math.abs(c.start.seconds-X[k][1])<0.03&&c.name.indexOf(X[k][2])===0){c.remove(false,false);n++;hit=1;break}}
  if(!hit)miss.push(X[k].join("@"))}
 return "removed "+n+" missing "+miss.join(",")})()''' % (json.dumps(P["remove"]), TRACK_JS)))
    bins = {}
    for r in P["rows"]:
        bins.setdefault(r.get("bin", "Graphics"), set()).add(r["file"])
    for b, fs in bins.items():
        print(run('''(function(){var root=app.project.rootItem,bin=null;for(var i=0;i<root.children.numItems;i++)if(root.children[i].name===%s)bin=root.children[i];
 if(!bin)bin=root.createBin(%s);var have={};for(var i=0;i<bin.children.numItems;i++){try{have[bin.children[i].getMediaPath()]=1}catch(e){}}
 var F=%s,w=[];for(var k=0;k<F.length;k++)if(!have[F[k]])w.push(F[k]);if(w.length)app.project.importFiles(w,true,bin,false);return %s+" +"+w.length})()'''
                  % (json.dumps(b), json.dumps(b), json.dumps(sorted(fs)), json.dumps(b)), timeout=600000))
    rows = [[r.get("bin", "Graphics"), os.path.basename(r["file"]), r["track"], round(r["start"] * FPS),
             (round(r["end"] * FPS) - round(r["start"] * FPS)) if r.get("end") else None, r.get("db"), r.get("in", 0)] for r in P["rows"]]
    print(run('''(function(){var s=app.project.activeSequence,root=app.project.rootItem,B=%s,TPF=%d,n=0;%s
 function bin(nm){for(var i=0;i<root.children.numItems;i++)if(root.children[i].name===nm)return root.children[i];return null}
 function item(b,f){var x=bin(b);for(var i=0;i<x.children.numItems;i++){var c=x.children[i];var p="";try{p=(c.getMediaPath()||"").split("/").pop()}catch(e){}if(p===f)return c}return null}
 for(var k=0;k<B.length;k++){var r=B[k],it=item(r[0],r[1]);if(!it)return "ERROR no item "+r[1];var tr=TRK(s,r[2]);
  if(r[4]){it.setInPoint(r[6],4);it.setOutPoint(r[6]+r[4]/(30000/1001)+0.0005,4)}else if(r[6]){it.setInPoint(r[6],4)}
  var ts=new Time();ts.ticks=String(r[3]*TPF+10000);tr.overwriteClip(it,ts);it.clearInPoint(4);it.clearOutPoint(4);n++;
  for(var i=0;i<tr.clips.numItems;i++){var c=tr.clips[i];if(c.name===r[1]&&Math.abs(c.start.ticks-(r[3]*TPF+10000))<TPF){
   if(r[6]){var ti=new Time();ti.ticks=String(Math.round(r[6]*254016000000));c.inPoint=ti}
   if(r[4]){var e=new Time();e.ticks=String((r[3]+r[4])*TPF);c.end=e}
   if(r[5]!==null&&r[5]!==undefined){for(var j=0;j<c.components.numItems;j++){var cp=c.components[j];if(cp.displayName==="Volume")
    for(var q=0;q<cp.properties.numItems;q++){var pp=cp.properties[q];if(pp.displayName==="Level")pp.setValue(Math.pow(10,(r[5]-15)/20),true)}}}}}}
 app.project.save();return "laid "+n})()''' % (json.dumps(rows), TPF, TRACK_JS), timeout=900000))
    rb = json.loads(run('''(function(){var s=app.project.activeSequence,o={};function rd(t,k){var a=[];for(var i=0;i<t.clips.numItems;i++)
 a.push([Math.round(t.clips[i].start.seconds*1000)/1000,Math.round(t.clips[i].end.seconds*1000)/1000,t.clips[i].name,Math.round(t.clips[i].inPoint.seconds*10000)/10000]);o[k]=a}
 for(var v=0;v<s.videoTracks.numTracks;v++)rd(s.videoTracks[v],"V"+(v+1));for(var a=0;a<s.audioTracks.numTracks;a++)rd(s.audioTracks[a],"A"+(a+1));
 return JSON.stringify(o)})()'''))
    bad = 0
    for r in P["rows"]:
        f = os.path.basename(r["file"]); m = [c for c in rb[r["track"]] if c[2] == f and abs(c[0] - round(r["start"] * FPS) / FPS) < .02]
        if not m or (r.get("end") and abs(m[0][1] - round(r["end"] * FPS) / FPS) > .02) or (r.get("in") and abs(m[0][3] - r["in"]) > .002):
            bad += 1; print("BAD", f, r["track"], r["start"], r.get("end"), m)
    print(f"readback: {len(P['rows']) - bad} OK, {bad} BAD")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(place(json.load(open(sys.argv[1])), "--dry" in sys.argv))
