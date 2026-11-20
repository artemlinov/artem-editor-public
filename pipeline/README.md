# Pipeline tools

Every tool reads the **current video** from `config/paths.local.json` (`current_video`) through `pipeline/job.py`.
No tool names a video. Python tools run with `.venv/bin/python` (Whisper lives there); `clicks.py` runs with `uv run`;
`.mjs` tools run with `node` (Playwright is installed in `lanes/render`, the browser is the installed Chrome).

## Where things go

| What | Where |
|---|---|
| A tool used twice | this repo: `pipeline/`, `lanes/premiere/`, `presets/` |
| A video's small state a later session needs (dumps, timeline, plans, cue lists) | `<job>/work/` |
| A one-off script for one video | `<job>/scripts/` |
| Big files any tool can regenerate (A-roll audio, frames) | the cache, `work_cache/<video>/` |
| Throwaway checks | the session scratchpad |
| What goes on the timeline (rows per worker, sound cues) | `<job>/work/place/` (`<worker>.json`, `<worker>-sfx.json`); the shared brief for parallel workers is `<job>/work/contract.md` (video 13's is the template) |

`<job>` is the video's `Claude Edit/` folder on Drive. `python3 pipeline/job.py` prints all of it for the current video.

## Starting a video

Artem only says which video and where the camera file is. Claude does the rest, Premiere included:
1. Set `current_video` in `config/paths.local.json` to the video's folder name.
2. `python3 pipeline/job.py init --aroll "<camera file>"`: work/, scripts/, the graphics engine in `graphics/_lib`.
3. `python3 lanes/premiere/new-project.py`: opens Premiere if it is closed (no clicks), makes `<job>/premiere/V13 <title>.prproj`
   and the sequence `V13 Cut 1` from the camera file (its 4K / 29.97, tracks V1-V6 and A1-A8), and records the sequence in job.json.
   For a project Artem already made, pass `--sequence "<name>"` to step 2 instead.
4. `.venv/bin/python pipeline/job.py prep`: A-roll audio and its level map, in the cache.
5. `.venv/bin/python pipeline/transcribe.py "<camera file>" "<job>/transcript"`: the rough whole-file transcript.

## Tools

**Cut and takes** (`pipeline/`)
- `timeline.py build`: the cut as data (`work/timeline.json`): A-roll pieces plus every word in the cut, each piece re-transcribed on its own (cached). Also `words`, `joints` (sentence starts and pauses, for timing visuals) and `map` (old time to new after a cut change).
- `retakes.py chunks | fine | runon`: the takes a whole-file transcript hides. `chunks` reads the camera file island by island; `fine` re-splits chosen islands at shorter pauses (a repeat hidden inside one island); `runon` flags a piece he keeps talking after, which may be a later take of the same line.
- `takes.py find | plan`: from take picks (`work/picks.json`: which stretch holds each line's last take) to the first cut. `find` locates each take's exact start and end (the latest start that still reads as the whole line), `plan --at <T0>` writes the plan `relay.py` lays.
- `recut.py analyze | plan`: breath-aware re-tightening with word edges protected (a line's last word included, and its last consonant when that comes after a dip: `timeline.line_end`), then the plan for Premiere (`work/relay-plan.json`). `--room <clip>:0.2` gives a line that has to sink in that much real silence after it. The report needs a human look: skip holds and the planned pauses after transitional lines (`rules/pacing.md`).
- `proof.py`: transcribes every changed clip before and after the re-cut. A DIFF is a clipped word or Whisper hearing the same audio two ways; read it.

**Premiere** (`lanes/premiere/`, every write backs up the project first and reads back after; all proven live 2026-11-11 on a throwaway project)
- `new-project.py`: the video's Premiere project and sequence (see Starting a video).
- `dump-live.py`: the live sequence, every clip and property, to `work/dump.json`. Run before every apply: Artem edits between rounds.
- `dump-diff.py old.json new.json [--tracks A4-A8]`: what he changed between two reads (removed, added, moved, switched off, levels, effects such as a pitch shifter, keyframes), with his ripples accounted for. Clip Gain is not in a dump: pair it with `prproj-audit.py`.
- `relay.py`: applies `work/relay-plan.json`. Moves everything after T0, re-lays the A-roll piece by piece, fixes crossfades. A piece may name another camera file (`path`), and the plan may list clips to remove. It re-lays V1 from T0, so clip-level settings there (a punch-in scale) must be put back after.
- `ripple.py T:frames:tail|head`: more room after (or before) a line, without breaking what follows. `--close <T>` closes a hole on V1 that ends at T. `--tighten <T>:<frames>` shortens that hole by some frames instead (a chapter gap landing on a music beat). Moving hundreds of clips takes Premiere over 15 minutes: the bridge times out while Premiere keeps working, so wait and read the timeline before the next write. `--hygiene` only fixes crossfades.
- `swap-take.py T:srcIn:srcOut`: replaces ONE A-roll clip with another stretch of the camera file (another take, other edges) and ripples what follows. Use it instead of `relay.py` once Artem has worked on the timeline: nothing else on V1/A1 is re-laid, so his clip settings stay. Lists the clips that span the join (a song, a graphic) for re-timing.
- `place-rows.py rows.json`: lays graphics, music or sounds frame-exact, then reads them back.
- `place-pass.py <pass> <worker> ...`: a revision round's graphics workers onto the live timeline (their `work/place/<pass>-<worker>.json` rows, old clips and the sounds in their `remove_sfx` spans out); `--with-cues` also lays their sound cues, otherwise those wait for a sound pass.
- `zoom-keys.py <t0>:<t1>:<scale>`: a small eased push-in on the A-roll over a breath or pause, anchored between his eyes.
- `sfx-tracks.py cues.json`: puts each sound on the first free SFX track, then `place-rows`.
- `prproj-audit.py`: Clip Gain and every transition, read straight from the saved project file.
- `relink.py "<old folder>" … "<new folder>"`: after a video's folder moved or was merged back, points every project item at the same file under the new folder. Its header has the whole no-offline procedure (copy, open from the new place, relink, dump, only then remove the old folder).
- `notes-panel/` (Timecode Notes): Artem's panel for leaving notes on the playhead, one list per sequence, to paste into a chat. Window > Extensions > Timecode Notes. `notes-panel/install.sh` puts it into Premiere; run it again whenever this repo's folder moves (the link it makes points at the folder), then restart Premiere.

**Graphics** (`pipeline/graphics/`, engine in `presets/graphics/_lib/`)
- `scene-build.py spec.json`: a screen + A-roll scene page (camera, time-lapse, his card).
- `aroll-frames.py t0 t1 name`: his picture exactly as the cut plays it, as frames (`--timeline live.json` for pieces from another camera file).
- `warp.py`: re-times a finished page after the cut under it changed, so every animation keeps its word.
- `render.mjs page out --dur s [--alpha]`: 4K render (ProRes 4444 with alpha). `shot.mjs`, `snap.mjs`, `peek.mjs`: stills of a page to check before rendering.
- `clicks.py rings | region | crop`: when a click or screen change happens in a recording (for click sounds and camera moves).
- `presets/graphics/progression-graph/render_page.py`: one appearance of the progression graph.

**Sound** (`pipeline/sound/`)
- `beds.py beds-plan.json`: music beds at Artem's level (body at -39 dBFS), quiet intros lifted, dry cut into a reverb throw. No remix. `"card": <first word>` lifts a bed through a chapter card the way he did (+6.7 dB, back by his first word).
- `sfxcues.py <cues.json> ...`: sound cue lists (what happens, when: written by whoever builds a graphic) into rows for `sfx-tracks.py`: the file, level and slice for each kind of sound, its transient put on the cue. Every kind rotates through at least three files (his library first), so no sound plays twice in a row; `good` / `bad` are a sound and its darker twin, `notify` the iPhone ding.

**Review** (`pipeline/review/`)
- `preview.py`: a graphic with his voice under it (1080p, or `--height 360` for quick blockouts).
- `musicmix.py`: voice plus beds, to judge music level and switches.
- `musicroom.py music voice t0 t1 ...`: how far a music stem sits under the voice (loudness and per band), for comparing model edits' music. Peaks hide how dense a song is.
- `runstats.py session.jsonl ...`: what a Claude Code editing run took, read from its chat log (never written to): the messages the user typed, minutes until it handed the edit back, effort, tokens, cost at API prices, Everygen credits.
- `reviewmix.py`: the live timeline's audio rebuilt offline, to hear a sound fix before it is laid.
- `revclip.py`: a new render in context inside a review export.
- `sheet.py`: a contact sheet of any video.
- `chapters.py`: where each section of the finished video starts (every song start on the final timeline, with the sentences around it and the stamp to use), for YouTube chapters. The `everygen-description` skill calls it; that skill lives in Artem's Claude profile beside his script skills, not in this repo (his call, 2026-11-14).
- `tlsheet.py <out.jpg> <t> ... | --rows <place.json>`: what the PLAN shows at timeline moments (A-roll frame + every row of `work/place/*.json` covering it), as one sheet. Check a worker's renders in context before placing; storyboards for the review folder.

## Finishing a video

Before the session ends:
1. Move any script used twice from `<job>/scripts/` or the scratchpad into this repo, generalized, and list it here.
2. If the video's `graphics/_lib` was improved, copy the change back to `presets/graphics/_lib/`.
3. Write Artem's corrections into `rules/`, the presets or `lanes/premiere/lab-notes.md`.
4. Commit (automatically, no need to ask Artem; never push without his OK).

## The public copy

`github.com/artemlinov/artem-editor` is private. The public copy is `github.com/artemlinov/artem-editor-public`: the same
files without what is private (per-video page screenshots, a real creator's face, links to Artem's own files), with no
history. `python3 pipeline/public_copy.py <empty folder>` builds it and checks that nothing was lost and nothing private
is left; add `--push artemlinov/artem-editor-public` to upload it, only with Artem's OK. Refresh it after rules change.
