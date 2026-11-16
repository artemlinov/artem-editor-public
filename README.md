# Artem Editor

An AI editing system for long-form YouTube talking-head videos, built by Artem (editor of the Everygen YouTube channel)
with Claude Code. It holds his editing taste as written rules, plus the tools that let Claude apply them: picking takes,
cutting on speech joints, coded graphics, music and sound effects, rendering and reviewing.

## What's inside
| Folder | What |
|---|---|
| `rules/` | The editing principles: takes, pacing and speech joints, visual continuity, look, sound. Start here. |
| `reference/scripts/` | A real script with Artem's edit comments inline: how he marks story blocks, beats, music and visuals. |
| `presets/` | The look: on-screen moves, layouts, coded graphics, the music and sound-effect map. |
| `lanes/claude-code/` | Two Claude Code skills that edit a whole video from the raw recording, start to finish. |
| `lanes/premiere/` | Tools that get an edit 80-90% done on an Adobe Premiere Pro timeline, and the lab notes behind them. |
| `pipeline/` | The step-by-step tools (cut and takes, graphics, sound, review); `pipeline/README.md` lists them all. |
| `brand/` | Fonts (EverygenNeue and Hedvig, both under the SIL Open Font License), logos, colors. |
| `CLAUDE.md` | What Claude reads first when you open this folder in Claude Code. |

## Use it
1. Make your own copy: **Use this template** or **Fork** at the top of the GitHub page, or **Code → Download ZIP**.
2. Quickest start: copy one of the skill folders from `lanes/claude-code/` into `~/.claude/skills/` (one at a time),
   open Claude Code in a folder with your footage and say "edit this video". The skill's `tools/README.md` covers setup.
3. For the full system, open this folder in Claude Code. Copy `config/paths.example.json` to `config/paths.local.json`
   and fill in your folders; `pipeline/README.md` explains starting a video, and `lanes/premiere/install.sh` sets up
   the Premiere tools.

The rules are one editor's taste. Change them to yours: Claude follows whatever they say.
