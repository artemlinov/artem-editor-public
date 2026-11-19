# Editing toolkit

Tested tools for the mechanical parts of the edit, so every run spends its time on choices (takes, story, design,
timing) instead of rebuilding its own transcriber, cutter, renderer and mixer. Nothing in here makes a taste decision:
the skill says what to do, these tools do it exactly and report what they found.

Works on macOS (Apple Silicon uses the fast Mac speech-to-text) and Windows/Linux (faster-whisper). No admin rights,
nothing installed system-wide.

## Setup (once per computer)

- macOS / Linux: `bash tools/setup.sh`
- Windows: `powershell -ExecutionPolicy Bypass -File tools\setup.ps1`

It installs its own Python, the packages, ffmpeg, a headless browser and the speech model (about 2 GB, 5-10 minutes
the first time) into the toolkit's cache folder, and prints `READY <folder>`. Run again, it returns at once. Then run
every command as `tools/ed <command>` (Windows: `tools\ed.cmd <command>`).

## Where files go

Each edit is a **job folder in the cache** (`~/Library/Caches/everygen-edit/jobs/<name>` on a Mac,
`%LOCALAPPDATA%\everygen-edit\jobs\<name>` on Windows), on the computer's own disk. Footage folders are often synced
(Google Drive, iCloud, Dropbox): frames written there get uploaded and writes fail. Only the finished video goes next to
the footage. `ed clean` deletes the job's big files after delivery. Put your own working files (pages, plans, assets)
in the job folder too: `ed where` prints it.

## The edit, command by command

| Step | Command | Writes |
|---|---|---|
| Read the footage | `ed init FOOTAGE` | job folder, sound, level map |
| Transcribe | `ed transcribe --prompt "Names, Brands"` | `islands.txt`: every stretch of speech between pauses, transcribed on its own, with source times. Retakes can't hide in it. |
| A repeat inside one island | `ed fine N ...` | the island re-split at short pauses, printed |
| Assemble the cut | `ed cut takes.json` | `cut.json`, `timeline.txt`, `words.json`, `joints.json`, `voice.wav`, `clips.wav`, `review/gaze_*.jpg`, `cut_report.txt` |
| Media for pages | `ed frames SRC T0 T1 NAME [--height H] [--speed S]`, `ed still SRC T OUT.png` | `media/NAME/00001.jpg ...` |
| Where the face is | `ed face F,F,...` | the point between the eyes and the face box on those output frames (punch-in anchor, card crop) + marked stills |
| Design check | `ed snap page.html F,F,...` | `snaps/*.png` (1920x1080) |
| Render a graphic | `ed render page.html [NAME]` | `renders/NAME.mov` + `.json` |
| Songs | `ed songs FILE ...` | voices heard, level every 2 s, where it changes |
| Mix | `ed mix mix.json` | `mix.wav` |
| Final picture | `ed compose plan.json [--out PATH]` | the video next to the footage |
| Self-review | `ed review` | `review/report.txt`, `review/changes_*.jpg` |
| Anything else | `ed ffmpeg ...` | the toolkit's own ffmpeg |

## takes.json (you write it)

```json
{"lines": [
  {"id": "L01", "text": "AI UGC ads that actually look real are printing brands millions of dollars right now.",
   "src": [96.0, 100.7]},
  {"id": "L02", "text": "...", "src": [106.2, 112.2], "room": 0.2},
  {"id": "L05", "text": "...", "src": [198.0, 203.2], "drop": [[200.1, 200.6]]},
  {"id": "AD1", "clip": "/path/to/ad.mp4", "src": [0, 14.4]}
]}
```

- `src`: source seconds of the take you chose, roughly from its first word to its last (`islands.txt` times are
  fine, within about half a second). The tool finds the line's first and last word there in a fresh word-timed
  transcript, cuts in on the first word's attack and out after the last soft consonant, never into the attempt before
  or after (where the speaker ran straight on, it cuts in the dip between the words), and takes out dead air of 0.45 s
  or more inside it. Where `text` starts with a restart ("somewhere around, somewhere around a minute"), it picks the
  start that goes on with the line.
- `text`: what the line should say. The tool transcribes exactly what the cut plays and lists missing or extra words.
- `room`: extra seconds of the take's own silence after the line (a line that has to sink in).
- `drop`: source spans to cut out of the take (a stumble, a breath).
- `pic_lead`: the line's picture cuts in that many frames before its sound (up to 4): cut on action, or before a
  blink at the end of the line before.
- `clip`: a played clip with its own picture and sound instead of the A-roll.
- Order = the order in the video.

`cut_report.txt` marks each line OK or CHECK: missing / extra words, `LATER TAKE?` when the same line is said
again right after the out point (that later take is usually the one to use), or `SAID TWICE?` when a word of the line
is heard twice (a stutter, a restart, or the end of another attempt at an edge; it listens once more without the names
prompt, which hides repeats). Fix `takes.json` (`src`, `drop`) and run `ed cut` again, before building any visual.
Never mute or patch `voice.wav` or `mix.wav` to hide a problem: it leaves silence while the mouth moves.

`timeline.txt` is the cut in **output frames**, the numbers every graphic, move and sound uses:
`L07 ‖  1439-1604  00:48.01  ends 1598  See,@1439 |most@1452 people@1458 ...` (‖ a line start, | a pause inside it,
`ends` the frame the last word is over: a change between two lines starts there).

## Graphics pages

A page is one HTML file (plus its assets), designed at **1920x1080 CSS pixels**; the renderer scales it to the
footage's size. It must set:

```js
window.SCENE = {f0: 1439, f1: 1604, alpha: false};   // output frames it covers (f1 not included); alpha: true for
                                                     // a transparent overlay on the A-roll
window.renderFrame = async (f) => { /* draw output frame f from f alone (never from the clock) */ };
window.READY = true;                                 // once fonts and images are loaded
```

Optional: `window.SCENE.card = f => ({x, y, w, h, r, crop: [x, y, w, h]})` (CSS px; crop in 0..1 of the camera frame)
puts the **live A-roll** inside the graphic (the speaker card beside a screen recording, a card the A-roll shrinks
into). Return `null` on frames without it. The compositor fills it frame-exact from the footage.

Rules that keep renders clean and fast:
- Every frame depends only on `f`. No CSS transitions or animations, no timers, no `Date.now()`. Frames are drawn in
  parallel parts, out of order, so never rely on what an earlier call left on the page: set an element's text before
  you measure it to center it.
- Play videos as image sequences (`ed frames`), swapping an `<img>` per frame, never a `<video>` element. Extract
  them at the size they're shown (`--height`): full 4K frames for a card 900 px tall only slow the render down.
- Preview any stretch with its sound before the full build: `ed compose plan.json --range F0:F1`.
- The renderer waits for fonts, every `<img>` to load and decode, and two drawn frames before it saves each frame,
  then checks the render for one- and two-frame glitches and re-renders any part that has one (a frame that comes
  out the same twice is the design, not a glitch). It prints `SUSPECT FRAMES` if one survives: look at them.

## plan.json (the final picture)

```json
{"visuals": ["V01", "V02", "V05"],
 "camera": [{"f0": 300, "f1": 420, "keys": [[300, 1.0], [360, 1.06]], "anchor": [1920, 820]}],
 "audio": "mix.wav"}
```

Renders by name, in stacking order; a full-screen render replaces the picture, an overlay sits on the A-roll. Camera
keys are eased; the anchor (output pixels) stays put, e.g. the point between the eyes.

## mix.json

```json
{"music": [{"file": "/abs/song1.wav", "f0": 0, "f1": 1430, "offset": 9.5, "under": 15, "end": "reverb"}],
 "sfx": [{"file": "/abs/whoosh.mp3", "f": 529, "kind": "whoosh", "db": 0, "trim": 0.8}],
 "clips_db": 0}
```

Speech peaks at -3 dBFS; music sits `under` dB below the speech's RMS; whooshes and hits 14 dB, pops, clicks and UI
sounds 20 dB below the speech loudness, `db` adjusts; a sound's loudest moment lands on frame `f`. Played clips match
the speech loudness.

## Developing

Tested on the video 14 raw take (51 min, 4K 29.97) on an M1 Max, 2026-11-16:
- `ed transcribe`: 410 islands in about 6 minutes.
- `ed cut` with 127 lines: 2.5 minutes; in and out points within a few frames of run 2's approved cut, in points
  tighter where run 2 left silence before the first word. Since 2026-11-17 it finds each edge from the line's own
  words and listens again without the names prompt: about 7.5 minutes for the 127 lines of run 3, which fixed every
  cut mistake Artem noted in that run (clipped last words, the tail of the attempt before playing first, a doubled
  word, a breath and a turn away after a line) with no new ones.
- `ed render` at 4K: 6-16 frames a second depending on the page (heavy image sequences are the slow part).
- `ed compose`: the 9-minute 4K video in 6.5 minutes; `ed review` 3 minutes.

`ED_STT=faster` forces the Windows speech path on a Mac (`uv pip install faster-whisper` into the venv first): it
worked on 2026-11-16 (it split island #8 into its two takes); its first run downloads its own 1.6 GB model.
Bump `VERSION` when anything changes: setup re-runs once per version.
