#!/bin/zsh
# wait for a download to reach its full size, then transcribe it
f="$1"; size="$2"; out="$3"
until [ -f "$f" ] && [ "$(stat -f %z "$f")" -ge "$size" ]; do sleep 30; done
sleep 5
cd "$HOME/Everygen Editor" && .venv/bin/python pipeline/transcribe.py "$f" "$out"
