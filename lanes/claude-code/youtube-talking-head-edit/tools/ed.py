"""ed: the editing toolkit's command line. Run through tools/ed (Mac/Linux) or tools\\ed.cmd (Windows).

  ed warmup                         download the speech-to-text model (setup does this)
  ed init FOOTAGE [--name N]        make the job folder (on this computer's disk) and read the footage
  ed transcribe [--prompt "Names"]  every speech island transcribed on its own -> islands.txt (retakes can't hide)
  ed fine N [N ...]                 re-split those islands at shorter pauses (a repeat inside one island)
  ed cut TAKES.json                 the cut from the takes you picked: clean edges, dead air out, every line
                                    transcribed again and compared -> cut.json, timeline.txt, voice.wav, gaze sheets
  ed frames SRC T0 T1 NAME [--height H] [--speed S]   frames of any video for a page (screen recordings, posts)
  ed still SRC T OUT.png            one full-resolution frame
  ed face F,F,...                   the speaker's eyes and face on those output frames (punch-in anchor, card crop)
  ed snap PAGE.html F,F,...         stills of a graphics page at those frames, for the design check
  ed render PAGE.html [NAME]        render a graphics page frame by frame (waits for every frame to be drawn)
  ed compose PLAN.json [--range F0:F1]   the final video: cut + camera moves + rendered graphics + the mix
                                    (--range: just that part, as a preview with sound, in previews/)
  ed songs FILE [FILE ...]          check songs: words heard (voices), loudness every 2 s (pockets)
  ed mix MIX.json                   voice, played clips, music beds and sound effects at the skill's levels
  ed review [VIDEO]                 the self-review sheets and checks of a finished render
  ed clean                          delete the job's big files (frames, renders) once the video is delivered
  ed ffmpeg ARGS ...                the toolkit's ffmpeg (for anything else)
  ed where                          print the current job folder

Every command works on the current job (the last `ed init`) unless --job DIR is given.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def opt(args, name, default=None, cast=str):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]
        return cast(v)
    return default


def main(argv):
    if not argv or argv[0] in ("-h", "--help", "help"):
        print(__doc__); return
    cmd, args = argv[0], argv[1:]
    from edlib import job as J
    if cmd == "_chunk":                               # internal: one compose process
        from edlib import compose
        compose.chunk(args[0], args[1], int(args[2]), int(args[3]), args[4]); return
    if cmd == "warmup":
        from edlib import stt
        stt.warmup(); return
    if cmd == "ffmpeg":
        os.execv(J.ffmpeg(), [J.ffmpeg()] + args)
    if cmd == "init":
        name = opt(args, "--name")
        jb = J.create(args[0], name)
        from edlib import audio
        lv = audio.extract(jb)
        f = jb.meta["footage"]
        print(f"job: {jb.dir}\nfootage: {f['width']}x{f['height']} @ {float(jb.fps):.3f} fps, "
              f"{J.tc(f['duration'])}, audio {'yes' if f['audio'] else 'NO'}\nlevels (dBFS): {lv}")
        return
    jb = J.current(opt(args, "--job"))
    if cmd == "where":
        print(jb.dir)
    elif cmd == "transcribe":
        from edlib import takes
        takes.transcribe(jb, prompt=opt(args, "--prompt"))
    elif cmd == "fine":
        from edlib import takes
        takes.fine(jb, [int(x) for x in args], gap=0.18)
    elif cmd == "cut":
        from edlib import takes
        takes.cut(jb, args[0], prompt=opt(args, "--prompt"))
    elif cmd == "frames":
        from edlib import media
        h = opt(args, "--height", None, int); sp = opt(args, "--speed", 1.0, float)
        media.frames(jb, args[0], float(args[1]), float(args[2]), args[3], height=h, speed=sp)
    elif cmd == "still":
        from edlib import media
        media.still(args[0], float(args[1]), args[2])
    elif cmd == "face":
        from edlib import media
        media.face(jb, [int(x) for x in args[0].split(",")])
    elif cmd == "snap":
        from edlib import render
        render.snap(jb, args[0], [int(x) for x in args[1].split(",")], scale=opt(args, "--scale", 1.0, float))
    elif cmd == "render":
        from edlib import render
        w = opt(args, "--workers", None, int)
        render.render(jb, args[0], args[1] if len(args) > 1 else None, workers=w)
    elif cmd == "compose":
        from edlib import compose
        rng = opt(args, "--range")
        span = tuple(int(x) for x in rng.split(":")) if rng else None
        compose.compose(jb, args[0], out=opt(args, "--out"), span=span)
    elif cmd == "songs":
        from edlib import mix
        mix.songs(jb, args)
    elif cmd == "mix":
        from edlib import mix
        mix.mix(jb, args[0])
    elif cmd == "review":
        from edlib import review
        review.review(jb, args[0] if args else None)
    elif cmd == "clean":
        from edlib import media
        media.clean(jb)
    else:
        print(f"unknown command {cmd}\n"); print(__doc__); sys.exit(2)


if __name__ == "__main__":
    main(sys.argv[1:])
