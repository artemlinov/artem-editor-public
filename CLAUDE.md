# Everygen Editor

Artem's AI editing system for Everygen YouTube videos. Built from scratch; the downloaded pack is
reference only (`_reference/`, read it for plumbing ideas, never load its rules).

## Two finish surfaces, one library
- **Premiere (production):** Claude gets the edit to 80-90% on a Premiere timeline; Artem finishes.
- **Claude Code chat (YouTube showcase):** the universal principles packed into a skill that Everygen serves
  as an MCP workflow (two variants: everyday, and freestyle with design left to the model). It runs in a fresh Claude Code chat on the user's computer: the user attaches their own
  footage, and Claude does the whole edit itself there (cuts, coded graphics, mix, render). Everygen supplies
  only the workflow, music and sound effects; its own timeline editor is never used. "Chat" in this repo
  always means a Claude Code chat, never claude.ai.

A preset says WHAT (look, timing, numbers) and never depends on an app. `lanes/<surface>/` says HOW
it gets onto that surface. Never put app mechanics in a preset.

## Where things live
| Path | What |
|---|---|
| `rules/` | Artem's taste: `takes.md`, `pacing.md`, `continuity.md`, `look.md`, `sound.md`. Read all of them before any edit. |
| `reference/scripts/` | Past scripts with Artem's edit comments inline: the examples of how he marks blocks, beats, music and visuals. |
| `brand/` | Fonts (EverygenNeue, Hedvig), logos, `tokens.css`, SFX. `brand/library/` is the growing set of reusable assets Artem hands over (page screenshots, UI references), named `what-date.png`; save every such asset there and look there first. |
| `presets/motion/` | The entrance/exit list. Every on-screen move is one of these, by name. Never improvise a move. |
| `presets/graphics/` | Coded graphic components (`progression-graph/`), kits from past videos to start from (`kits/`), and the page engine every graphic loads (`_lib/`). |
| `presets/layouts/`, `presets/sound/` | Screen + A-roll, full-screen explainer looks; music pockets, SFX map. |
| `pipeline/` | The tools, by step: cut and takes, graphics, sound, review. **`pipeline/README.md` lists every tool; read it before writing a new one.** |
| `lanes/claude-code/` | The two Claude Code editing skills and the developer README: `youtube-talking-head-edit/` (everyday, motion about 6/10) and `youtube-talking-head-edit-freestyle/` (design and motion left to the model; the Fable vs Opus video). Same editing principles; only one is installed in `~/.claude/skills/` at a time. When a principle in `rules/` changes, update both. |
| `lanes/premiere/` | Finish-surface adapters. The video-12 Premiere tools (dump, relay, ripple, place, audit) are listed in `pipeline/README.md`. |
| `config/paths.local.json` | This machine's paths (Drive, SSD, cache) and `current_video`. Not committed; template in `paths.example.json`. |

## Setup
- This folder is the system (a git repo, kept off Google Drive). Open Claude Code here.
- Machine paths (Google Drive, SSD) live only in `config/paths.local.json`; `python3 config/paths.py` prints them.
- The video being edited is `current_video` in that file. `python3 pipeline/job.py` shows its folders; starting a new
  video is in `pipeline/README.md`.

## Where work goes (so nothing is lost when a session ends)
- **Code used twice goes in this repo**, generalized to read the current video from `pipeline/job.py`. Never leave a
  reusable tool in the session scratchpad: it is temporary and no other session can see it.
- A video's small state (timeline dumps, the cut model, plans, cue lists) goes in `<job>/work/`; one-off scripts for
  that video in `<job>/scripts/`; big regenerable files (A-roll audio, frames) in the cache. The scratchpad is only for
  throwaway checks.
- **Before a video's session ends:** promote new reusable tools into the repo and list them in `pipeline/README.md`,
  copy any improvement to the video's `graphics/_lib` back to `presets/graphics/_lib/`, write Artem's corrections into
  `rules/`, the presets or the lab notes, then commit (automatically, without asking; never push without his OK).

## Rules
- **Claude never changes the script.** The only selection decision is which take to use (`rules/takes.md`).
- Add a rule only where Claude's own reasoning would get it wrong. Teach taste case by case; never log things for the sake of logging.
- After every finished edit, offer to write what Artem corrected back into the preset or `rules/`.
- Pricing on screen follows what Artem says in that video's script and the pricing screenshot he gives for it. The site A/B tests its prices, so never take numbers from the live page or from an older video.
