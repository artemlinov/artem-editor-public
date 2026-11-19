# Claude Code lane: the YouTube talking-head edit workflows

For the Everygen developer who builds these skills into the Everygen MCP as workflows.
"Chat" here always means a Claude Code chat on the user's own computer, never claude.ai.

## Two skills, same editing principles
| Skill | Design and motion | Used for |
|---|---|---|
| `youtube-talking-head-edit/` | Polished explainer (about 6/10): springy entrances, hard cuts with simple designed hand-offs at big moments, subtle camera, no motion blur, sparse sound effects. | Everyday edits; its own video. |
| `youtube-talking-head-edit-freestyle/` | Entirely the model's call, no ceiling. Only readability, the brand kit and real proof limit it. | The Fable 5.2 vs Opus 5.5 comparison video. |

Everything else is identical in both: takes, cutting, pauses, story blocks and beats, real proof, readability, music,
render and self-review. When a principle changes, change it in both files.

## What it does
The user opens Claude Code, attaches a raw horizontal talking-head recording (often 4K, full of retakes) and types
"edit this video". The footage alone is enough: a script and a brand kit (fonts, colors) help but are optional. Without
a kit, Claude works out a look from the brand or product the video is about (its site) or from the creator, writes a
short style guide and keeps it; there is no default theme. Claude edits the whole thing itself on the user's machine
and saves a finished MP4 next to the footage. It runs start to finish with **no approval stops**, says up front
roughly how long it takes (about an hour for a 10-minute video) and reports once at the end.

## Trigger and routing
- Trigger: "edit this video" (and close variants) with **horizontal, long-form talking-head footage**.
- Both skills answer to the same trigger. Only one should be installed on a machine at a time. In Everygen, which one
  answers "edit this video" is Artem's call (not decided yet).
- The existing **Everygen Editor** workflow (`everygen-editor`, 9:16 shorts from phone takes) also answers to "edit
  this video". Route by footage: horizontal long-form talking head → these workflows; a vertical phone take or a
  request for a short/reel → `everygen-editor`. Without this, the prompt can land in the shorts workflow.

## Phases (no approval points)
1. Footage and script in: probe, transcribe with word timestamps, re-transcribe pause-split stretches, align to script.
   All times are kept as whole frame numbers from here on.
2. Takes and cut.
3. Story map (blocks, beats, joints, the visual and song for each line) and the look.
4. Visual plan and proof sourcing; about 80% of the effort goes into the first 30 seconds, whose ideas and designs the
   rest reuses. Ends with a design check of every visual's finished frame, before the render.
5. Sound.
6. Render.
7. Self-review of the full render, fix, then report and ask what they'd change.
8. Learn from their feedback (added 2026-11-16, for video 14's "it keeps improving" point): fix the video, then save
   each note that would matter in their next video too (not one-off fixes) as a line in `CLAUDE.md` in the folder the
   chat was opened in, under "My editing notes". Claude Code loads that file in every chat in that folder, and its
   header tells Claude to keep adding to it, so it works even in a later chat where the skill isn't loaded. The user's
   only job: make one folder for editing and always open it. No extra skill or instruction to install.

## What it runs on
- **The user's computer, through Claude Code.** Cutting, transcription, graphics (coded, rendered frame by frame in a
  headless browser), mixing and the final render all happen there.
- **The everyday skill ships a toolkit** (`youtube-talking-head-edit/tools/`, its own `README.md`): tested scripts for
  the mechanics (island-by-island transcription, assembling and proving the cut, a renderer that waits for every frame
  to be drawn, the compositor, the mixer, review sheets). The model still makes every choice and writes every graphic.
  Until 2026-11-16 nothing shipped on purpose and the model built its own tools each run; run 2 of video 14 showed the
  cost (2h48m, a renderer saving half-drawn frames, 36 min lost writing into a synced folder), so Artem chose to ship
  them. One `setup.sh` / `setup.ps1` installs everything into a cache folder (its own Python via uv, ffmpeg, a headless
  browser, the speech model: about 2 GB, no admin rights). macOS and Windows; tested on macOS.
- **For Everygen:** serve the skill folder (SKILL.md plus `tools/`) as a download bundle with the workflow, and tell
  Claude where it unpacked it. The freestyle skill has no toolkit yet.
- **Never Everygen's live editor** (`open_edit`, `trim_edit`, `edit_timeline`, `export_edit`). It caps exports at 3
  minutes and isn't how this workflow edits.
- **Everygen tools it uses:** `generate_audio` (`lyria-3.5`, up to 120 s per song, instrumental only; one song per
  story block), `find_music` (library music, and `kind: "sfx"` for sound effects), `download_video` (real posts and
  clips shown as proof), `browse_library` (originals of anything the user made in Everygen, instead of cropping them
  out of a screen recording).
- **Time:** video 14's tests of the everyday skill (a 10-minute video from a 51-minute raw take): run 1 took 81
  minutes; run 2 2h48m (takes and cut 43, visuals 20, render and composite 29, fixes 15, a failed save into a synced
  folder 36). Run 3 (2026-11-16, first run with the toolkit, a fresh macOS user, video-13 footage: 11:22 out of 50
  minutes of raw recording) took 1h42m from the log: first-time setup 7, transcription 5, takes and cut 26, story,
  look, graphics and music 47, final build, self-review and fixes 17. It was judged a much better edit; its cut mistakes
  came from edges placed off the transcript's rough times and from the names prompt hiding repeats (both fixed
  2026-11-17), plus Claude muting a stumble it found late instead of re-cutting (now forbidden in the skill). The
  toolkit's honest win is consistency (tested mechanics every run, fixes reach every user), not a proven speed-up:
  most of the time is Claude's own thinking and designing. The toolkit's own timings are in `tools/README.md`.
  Motion blur is left out of the everyday skill on
  purpose: it renders every frame about 10 times, which in testing took most of the time for two short scenes.

## What is deliberately not in it
No house look (fonts and colors come from the user's brand kit, or from the look Claude works out for the video;
music genre and animation look are the model's judgment), no captions, nothing from any specific video. The principles come from `rules/` in this repo; when a rule
there changes, update both skills to match.
