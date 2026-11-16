#!/usr/bin/env bash
# Installs the Timecode Notes panel into Premiere (macOS): a symlink in the CEP extensions folder, so edits here go live
# on the next panel reload. Unsigned panels need CEP debug mode, which the MCP bridge setup already turned on.
# Then restart Premiere and open Window > Extensions > Timecode Notes.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/TimecodeNotes"
mkdir -p "$(dirname "$DEST")"
for v in 10 11 12; do defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1; done
if [[ -L "$DEST" || -e "$DEST" ]]; then rm -rf "$DEST"; fi
ln -s "$HERE" "$DEST"
echo "Installed: $DEST -> $HERE"
echo "Restart Premiere, then Window > Extensions > Timecode Notes."
