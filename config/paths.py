"""Resolve machine paths from config/paths.json. Usage: python3 config/paths.py [key]"""
import json, os, sys
_here = os.path.dirname(os.path.abspath(__file__))
def load():
    f = os.path.join(_here, 'paths.local.json')
    if not os.path.exists(f):
        sys.exit('config/paths.local.json missing: copy config/paths.example.json and fill in this machine\'s paths')
    raw = json.load(open(f))
    out = {k: v for k, v in raw.items() if not k.startswith('_')}
    for _ in range(3):
        out = {k: v.format(**out) if isinstance(v, str) else v for k, v in out.items()}
    return out
def job(video_folder):
    """Job folder for a video, e.g. job('12 Claude + Omni UGC')."""
    p = load(); return os.path.join(p['everygen_videos'], video_folder, p['job_subfolder'])
if __name__ == '__main__':
    p = load()
    if len(sys.argv) > 1: print(p[sys.argv[1]])
    else:
        for k, v in p.items(): print(f"{k:16} {v}  {'ok' if os.path.exists(v) or k in ('job_subfolder', 'current_video') else 'MISSING'}")
