#!/usr/bin/env python3
"""Build the public copy of this repo: every committed file, minus only what is private.

    python3 pipeline/public_copy.py <out folder>                     # build and check
    python3 pipeline/public_copy.py <out folder> --push owner/repo   # then upload it as one new commit (Artem's OK first)

The lists below are the ONLY differences from this repo. Every rule, preset, skill, tool and note ships unchanged, and the
check at the end proves it: no committed file is missing except the ones left out, a changed file keeps every line, and
nothing private (an email, a link to his own files, his Mac's home folder) is left. The copy carries no history, so the
emails on past saves stay private; uploads are signed with his GitHub no-reply address.
Add to the lists when something new must stay private.
"""
import argparse
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Left out: per-video page screenshots (the Everygen site A/B tests its prices).
LEAVE_OUT = [re.compile(r"^brand/library/.+\.(png|jpe?g|webp)$", re.I)]
LIBRARY_NOTE = "# Library\n\nPut your own page screenshots and UI references here, named `what-date.png`.\n"
# Real people who are not Artem: a plain stand-in of the same size, so the graphics still render.
STAND_IN = {"presets/graphics/progression-graph/img/creator.jpg"}
# Links to his own files (Drive, CleanShot shares, Everygen renders) become [link]; the note around them stays.
PRIVATE_LINK = re.compile(
    rb"https?://(?:drive\.google\.com|docs\.google\.com|cleanshot\.com/share|media\.viewmax\.io)/[^\s)\]\"'<>\xe2]*")
HOME = re.compile(re.escape(str(Path.home()).encode()) + rb"/")  # the home folder of whoever runs it
# Emails allowed to ship: the font author (the OFL requires the notice) and an example in Adobe's CSInterface.js.
EMAIL = re.compile(rb"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}")
EMAIL_OK = {b"rmforbusiness@gmail.com", b"test@adobe.com"}


def run(*cmd, cwd=None, check=True):
    return subprocess.run(cmd, cwd=cwd, check=check, capture_output=True, text=True).stdout.strip()


def stand_in(path):
    w, h = run("ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(path)).split(",")
    run("ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=0xd9dde3:s={w}x{h}", "-frames:v", "1", str(path))


def build(out):
    if out.exists() and any(out.iterdir()):
        sys.exit(f"{out} is not empty")
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run(f'git -C "{ROOT}" archive HEAD | tar -x -C "{out}"', shell=True, check=True)
    tracked = run("git", "-C", str(ROOT), "ls-files").splitlines()
    left, changed = [], []
    for rel in tracked:
        p = out / rel
        if any(r.search(rel) for r in LEAVE_OUT):
            p.unlink()
            left.append(rel)
        elif rel in STAND_IN:
            stand_in(p)
            changed.append(rel)
        else:
            raw = p.read_bytes()
            if b"\0" in raw:
                continue
            new = HOME.sub(b"/Users/<you>/", PRIVATE_LINK.sub(b"[link]", raw))
            if new != raw:
                assert new.count(b"\n") == raw.count(b"\n"), rel
                p.write_bytes(new)
                changed.append(rel)
    if left:
        (out / "brand/library").mkdir(parents=True, exist_ok=True)
        (out / "brand/library/README.md").write_text(LIBRARY_NOTE)

    # The check: nothing lost, nothing private.
    lost = [r for r in tracked if r not in left and not (out / r).is_file()]
    leaks = []
    for p in out.rglob("*"):
        if p.is_file():
            raw = p.read_bytes()
            if b"\0" in raw:
                continue
            bad = {e for e in EMAIL.findall(raw) if e not in EMAIL_OK} | set(PRIVATE_LINK.findall(raw)) | set(HOME.findall(raw))
            leaks += [f"{p.relative_to(out)}: {b.decode(errors='replace')}" for b in sorted(bad)]
    kept = len(tracked) - len(left)
    print(f"{kept} of {len(tracked)} files copied, {kept - len(changed)} of them unchanged")
    for r in left:
        print(f"  left out: {r}")
    for r in changed:
        print(f"  changed:  {r}" + (" (plain stand-in image)" if r in STAND_IN else " (private links / home folder)"))
    if lost or leaks:
        sys.exit("CHECK FAILED\n" + "\n".join([f"  missing: {r}" for r in lost] + [f"  private: {l}" for l in leaks]))
    print("check passed: nothing lost, nothing private left")


def push(out, repo):
    login, uid = run("gh", "api", "user", "--jq", ".login + \" \" + (.id|tostring)").split()
    email = f"{uid}+{login}@users.noreply.github.com"
    with tempfile.TemporaryDirectory() as tmp:
        clone = Path(tmp) / "repo"
        if subprocess.run(["git", "clone", "-q", f"https://github.com/{repo}.git", str(clone)]).returncode:
            sys.exit(f"could not open github.com/{repo}")
        run("git", "checkout", "-q", "-B", "main", cwd=clone)
        for p in clone.iterdir():
            if p.name != ".git":
                shutil.rmtree(p) if p.is_dir() else p.unlink()
        shutil.copytree(out, clone, dirs_exist_ok=True)
        run("git", "add", "-A", cwd=clone)
        if not run("git", "status", "--porcelain", cwd=clone):
            print(f"github.com/{repo} is already up to date")
            return
        run("git", "-c", f"user.name={login}", "-c", f"user.email={email}", "commit", "-q",
            "-m", f"Update, {date.today().isoformat()}", cwd=clone)
        run("git", "push", "-q", "-u", "origin", "main", cwd=clone)
    print(f"uploaded to https://github.com/{repo}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("out", type=Path)
    ap.add_argument("--push", metavar="OWNER/REPO")
    a = ap.parse_args()
    build(a.out.resolve())
    if a.push:
        push(a.out.resolve(), a.push)
