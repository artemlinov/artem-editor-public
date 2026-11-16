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

Screen-scene extras live in `../_lib/` because they extend `scene.js`: `scr-extra.js` (blue ring, text patch, Dock
strip, magnifying glass) and `scr-final.js` (the rewind look, a text-line magnifier, the window's corner radius per frame).
