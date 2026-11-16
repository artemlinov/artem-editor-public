"""sheet.py <file> <t0> <t1> <step> <out.jpg> [w]: contact sheet, 4 per row, tiles in time order (t0, t0+step, ...)."""
import sys,subprocess,os,tempfile
f,t0,t1,st,out=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]),sys.argv[5];w=int(sys.argv[6]) if len(sys.argv)>6 else 640
d=tempfile.mkdtemp();T=[];t=t0;fs=[]
while t<=t1+1e-6:
    o=f"{d}/{len(fs):03d}.jpg";subprocess.run(["ffmpeg","-v","error","-ss",f"{t:.3f}","-i",f,"-frames:v","1","-vf",f"scale={w}:-2","-q:v","4","-y",o]);
    if os.path.exists(o):fs.append(o);T.append(round(t,2))
    t+=st
n=len(fs);cols=4;h=int(w*9/16)
a=["ffmpeg","-v","error","-y"]
for x in fs:a+=["-i",x]
lay="|".join(f"{(i%cols)*w}_{(i//cols)*h}" for i in range(n))
subprocess.run(a+["-filter_complex",f"xstack=inputs={n}:layout={lay}:fill=black","-frames:v","1",out],check=True)
print(out,"times:",T)
