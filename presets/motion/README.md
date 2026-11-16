# Motion presets

Every element that appears, lights up or reveals uses one preset from this list, by name.
Never improvise a move. Numbers are seconds, with frames at 30 fps in brackets.
Easing curves are cubic-bezier (identical in CSS and in After Effects' speed graph).

## House entrance: `materialize` (chosen 2026-11-08, round 4 of the progression graphic)

| channel | from → to | duration | curve |
|---|---|---|---|
| rise (y) | +56 px → 0 | 0.50 s [15 f] | expo-out `cubic-bezier(.16,1,.3,1)` |
| scale | 94% → 100% | 0.50 s [15 f] | expo-out |
| blur | 12 px → 0 | 0.50 s [15 f] | expo-out |
| opacity | 0 → 1 | first 30% (0.15 s) [4-5 f] | linear |

- Always offset elements that enter together, never all at once: 0.10 s [3 f] apart, in reading order.
  This goes down to the parts of one title (logo → word → symbol → logo → word → word).
- Re-layout (things sliding to new positions): critically damped spring, ω = 7.5.

## `light-up` (a step / element becomes active)
- Colour and ring: 0.28 s [8 f], quart-out `cubic-bezier(.165,.84,.44,1)`.
- Badge bump: +12% scale and back within the first 45% of 0.6 s.
- One ripple off the element's frame: grows +16%, opacity .55 → 0, 0.6 s [18 f], expo-out.

## `draw-line` (a connector reaches the next element)
- 0.55 s [16-17 f] per segment, expo-out; duration grows with √(segments) for longer runs.
- Glowing head (12 px core) rides the tip while it draws.

## `frost-clear` (hidden → revealed)
- Blur and glass fade out over 0.65 s [20 f], expo-out, with a brightness flick of +10% peaking mid-way.
- Only ever goes frosted → clear. Hidden text is never readable.

## Keyframe craft (Artem, 2026-11-08)
- **"40-90" ease** = After Effects influence: 40% out of the first key, 90% into the second, both at zero speed.
  As cubic-bezier: `(.40, 0, .10, 1)` (general form: out o, in i → `(o, 0, 1-i, 1)`). Speed peaks at about
  27% of the move, 50% of the travel is done by 31%, 90% by 60%, then a long settle. Artem used it for the
  progression opening's scanner and slide-down. It is NOT a default: the ease is chosen per move.
- **The peak goes on the joint where the idea changes.** A sentence can carry a main idea and a secondary
  one that starts on a micro joint. In "So I built a simple system / with Claude and Gemini Omni" the system
  is the main idea and the tools start on "with", so the visual change (the slide-down) must read on "with":
  its speed PEAK lands on "with". The first key starts earlier (on "system") so the move is already underway
  and the viewer has room to take in the new text; the second key follows from the ease (with 40-90 the peak
  sits ~27% in, so second key = first key + (joint - first key) / 0.27).
- **Overlap consecutive moves.** The next move's first key goes BEFORE the previous move's last key, while
  the first move is still in its slow tail, so the speed never drops to zero between them. Back-to-back keys
  (one move ending exactly where the next begins) read as stop-start and linear, which shows most in short
  compositions. Keep each move on its own channel (separate nulls/properties) so they can overlap.

## Standing rules from Artem
- Everything enters from the bottom (rise + fade). No pop-in from nothing.
- Entrances need punch: a fast, front-loaded arrival, not a long soft drift.
