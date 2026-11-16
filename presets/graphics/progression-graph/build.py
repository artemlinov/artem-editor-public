"""Build the progression graph into one self-contained HTML file: python3 build.py [out.html]"""
import base64, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, '../../..'))
font = os.path.join(root, 'brand/fonts/EverygenNeue/woff2')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'build', 'progression.html')
b = lambda f: base64.b64encode(open(f, 'rb').read()).decode()
s = open(os.path.join(here, 'component.src.html')).read()
s = s.replace('{{REG}}', b(f'{font}/EverygenNeue-Regular.woff2')).replace('{{MED}}', b(f'{font}/EverygenNeue-Medium.woff2')).replace('{{SEMI}}', b(f'{font}/EverygenNeue-Semibold.woff2'))
s = s.replace('{{AROLL}}', b(os.path.join(here, 'aroll-frame.jpg')))
s = re.sub(r'\{\{IMG:([\w.-]+)\}\}', lambda m: b(os.path.join(here, 'img', m.group(1))), s)
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w').write(s); print(out, len(s))
