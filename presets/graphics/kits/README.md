# Graphic kits

Components that came out of a video and are worth starting from next time. They are NOT part of the page engine
(`../_lib/`, which `job.py init` copies into every video): copy the one you need into the video's `graphics/_lib/`,
adapt it there, and bring an improvement back here. Each is a pure function of t on top of `eg.js`.

| File | What it draws | Built for (video 13 page to look at) |
|---|---|---|
| `sbs-kit.js` | Model pills (the white name pill with a badge), winner crown, approved tick, two players side by side with one scrub bar | `sbs1`, `sbs2`, `pills`, `tick-v2` |
| `lay-a.js` | Camera + played video: one big player, a segmented switch above it, a scrub bar with the timecode under it, his card on the right (`rules/look.md`) | `lay1a-v2`, `lay2-v2` |
| `crea-doc.js` | A Claude doc with a comment rail: drag-select, a comment card typed and posted, the default avatar | `doc1-v2`, `doc2-v2` |
| `prog-graph-v3.js` + `prog-graph-v2.css` | Video 13's progression board (two model nodes, his live camera in the card, Cost and Time rows, "Your edit"), with the card growing and shrinking to full-screen A-roll | `pg3-v3`, `pg5-v3` |
| `steps.js` | A progress stepper for a long screen section: small chips under his card that outline the step he is on and tick when it is done | `live-v3` |
| `cues-from-frames.example.py` | How the sound cues of a screen scene are read off the frames the page plays (not the recording's clock) | `s-connect-v2` |
| `timeline-kit.js` (video 14) | An editing timeline (Graphics, B-roll, Video, Voice, Music, Sound FX tracks) with named role cursors (Cutter, Takes, Researcher, Animator, Sound designer, Finisher…) that fly in and edit it: retakes marked red and cut, clips dropped, tracks ticked, Video 1/2/3 tabs. `TLK.path` keys hold every click (video 14's `scripts/19-hook-events.mjs` reads them for the sound) | `hook-open-p3`, `hk-vs-p3b` |
| `cost-table-kit.js` + `cost-table-kit.css` (video 14) | A "which option" table: rows (Experienced / Entry-level / Do it yourself / Claude) with Cost and Time cells that fill red or green, in two modes (beside his camera card, or a compact overlay on his full-screen A-roll), a Frame.io-style review window, an iOS notification banner (invoice) | `table-a01-p3`, `table-a07-diy-claude-v2`, `table-p17-v2` |
| `team-board.js` + `team-board.css` + `team-board-v2.css` (video 14) | Claude as the project manager over five seats (Cutter, Researcher, Animator, Sound designer, Finisher), Plan ✓ / Edit ✗, a toolkit card, tools docking; needs `claude.png`, `team-mascot.png` (here) and the Everygen logos from `brand/` in the video's `_lib/` | `team-b01`, `team-b10-v2`, `team-b13-v2` |
| `scr-finder.js` (video 14) | A coded macOS 26 Finder window drawn like his own screen recordings (floating sidebar, glass toolbar, blue folders, files with durations, the cursor on top) | `scr-s3a-v2`, `prj-assets-v2`, `prj-infact-p3` |
| `review-scene.js` (video 14) | A whole screen + A-roll scene on a real recording (Claude Code reviewing a draft: QuickTime player, dictation, notes sent), leaving for full-screen camera on chosen lines; a model for long recorded scenes | `scr-review-p2-1` … `-6` |
| `path-bar.js` (video 14) | The small course bar top left (step badge, short name, five segments) shown for the first ~15 s of each step | `bar-step1` … `bar-step5` |
| `path-row.js` (video 14) | The roadmap and chapter cards: five step cards in a row, the current one forward, finished ones ticked, his live camera card (never frozen) | `path-road`, `path-cb1-p3`, `path-cb2-v2` |

Screen-scene extras live in `../_lib/` because they extend `scene.js`: `scr-extra.js` (blue ring, text patch, Dock
strip, magnifying glass) and `scr-final.js` (the rewind look, a text-line magnifier, the window's corner radius per frame).
