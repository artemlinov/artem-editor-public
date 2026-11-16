#!/usr/bin/env bash
# One-time setup of the editing toolkit on macOS or Linux. Safe to run again: it returns at once when this
# version is already set up. Needs no password and installs nothing system-wide: everything (its own Python,
# the packages, ffmpeg, a headless browser, the speech-to-text model) goes into one cache folder.
# Prints "READY <folder>" at the end.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
case "$(uname -s)" in
  Darwin) BASE="$HOME/Library/Caches/everygen-edit" ;;
  *) BASE="${XDG_CACHE_HOME:-$HOME/.cache}/everygen-edit" ;;
esac
VER="$(tr -d '[:space:]' < "$HERE/VERSION")"
if [ -f "$BASE/ready-$VER" ] && [ -x "$BASE/venv/bin/python" ]; then echo "READY $BASE"; exit 0; fi
mkdir -p "$BASE"

UV="$(command -v uv || true)"
if [ -z "$UV" ]; then
  if [ ! -x "$BASE/uv/uv" ]; then
    echo "Installing uv (Python manager) into $BASE/uv ..."
    curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="$BASE/uv" UV_NO_MODIFY_PATH=1 sh >/dev/null
  fi
  UV="$BASE/uv/uv"
  [ -x "$UV" ] || UV="$BASE/uv/bin/uv"
fi

echo "Creating the Python environment ..."
"$UV" venv --python 3.12 --managed-python --quiet --allow-existing "$BASE/venv"
PY="$BASE/venv/bin/python"
PKGS="numpy scipy soundfile pillow opencv-python-headless playwright imageio-ffmpeg pyloudnorm certifi"
if [ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ]; then PKGS="$PKGS mlx-whisper"; else PKGS="$PKGS faster-whisper"; fi
echo "Installing packages ..."
# shellcheck disable=SC2086
"$UV" pip install --python "$PY" --quiet $PKGS

echo "Installing the headless browser ..."
"$PY" -m playwright install --only-shell chromium >/dev/null

echo "Downloading the speech-to-text model (about 1.5 GB, first time only) ..."
"$PY" "$HERE/ed.py" warmup

touch "$BASE/ready-$VER"
echo "READY $BASE"
