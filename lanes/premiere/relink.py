"""relink.py: point the open project's media at the same files under another folder, after a video's folder moved or was
merged back (video 13: a temp folder on the Desktop, then Downloads, then back into the real folder on the SSD).

  python3 lanes/premiere/relink.py "<old folder>" ["<another old folder>" ...] "<new folder>" [--dry]

Every project item whose media path starts with an old folder is relinked to the same relative path under the new one
(projectItem.changeMediaPath), only when that file exists there. Backup first, save after, every item read back.
How to move a job folder without anything going offline:
  1. Premiere closed: copy the old folder into the new one and compare by content (rsync -a, then rsync -a -n -c).
  2. Set the job's folder in config/paths.local.json, open the project FROM THE NEW PLACE (premiere-up.sh <project>). The old
     folder still exists, so nothing is offline and no Link Media dialog blocks the bridge.
  3. Run this, then dump-live.py: no clip may still point at the old folder. Only then remove the old folder.
"""
import json, os, sys
from lane import run, backup

a = [x for x in sys.argv[1:] if not x.startswith("--")]
if len(a) < 2:
    sys.exit(__doc__)
olds = [x.rstrip("/") for x in a[:-1]]; new = a[-1].rstrip("/")
items = json.loads(run('''(function(){var o=[];function W(b){for(var i=0;i<b.children.numItems;i++){var c=b.children[i];if(c.type===2)W(c);
 else{var p="";try{p=c.getMediaPath()||""}catch(e){}o.push(p)}}}W(app.project.rootItem);return JSON.stringify(o)})()'''))
M, miss = {}, []
for p in items:
    for o in olds:
        if p.startswith(o + "/"):
            q = new + p[len(o):]
            (M.__setitem__(p, q) if os.path.exists(q) else miss.append(q))
print(f"{len(items)} project items, {len(M)} to relink, {len(miss)} without a file under the new folder")
for q in miss[:10]:
    print("  missing:", q)
if "--dry" in sys.argv or not M:
    sys.exit(0)
backup("before relink")
out = json.loads(run('''(function(){var M=%s,ok=0,bad=[];
 function W(b){for(var i=0;i<b.children.numItems;i++){var c=b.children[i];if(c.type===2)W(c);else{var p="";try{p=c.getMediaPath()||""}catch(e){}
  if(M[p]){try{c.changeMediaPath(M[p],true);if(c.getMediaPath()===M[p])ok++;else bad.push([c.name,c.getMediaPath()])}catch(e){bad.push([c.name,String(e)])}}}}}
 W(app.project.rootItem);app.project.save();var off=[];
 function O(b){for(var i=0;i<b.children.numItems;i++){var c=b.children[i];if(c.type===2)O(c);else{try{if(c.isOffline())off.push(c.name)}catch(e){}}}}O(app.project.rootItem);
 return JSON.stringify({ok:ok,bad:bad,offline:off})})()''' % json.dumps(M), timeout=900000))
print(f"relinked {out['ok']}, failed {out['bad']}, offline now {out['offline']}")
sys.exit(1 if out["bad"] or out["offline"] else 0)
