# Layout: screen + A-roll

A screen capture of an app window shown whole, with the A-roll as a card beside it.
Measured 2026-11-09 from Artem's reference frame (a Claude-chat scene from another video, same capture format).
Artem has a Premiere preset for this layout; when he shares it, match these numbers to it.

## Source capture
- 3840x2160 recording of the whole Mac screen, dock hidden, app window filling the screen under the menu bar.
- Crop to the app window: drop the menu bar and the thin wallpaper margin, keep the window's full width.
  On the 2026-11 captures the window sits at x 8-3831, y 47-2151 (3824x2105, aspect 1.817); re-measure if
  the display or window arrangement changes.
- Show the window whole with its OWN rounded corners (14 capture px). The frame never cuts into the content;
  only the wallpaper outside the window's corners is masked.

## Frame (percent of a 16:9 frame; px at 3840x2160)
| element | position | size | corner | shadow |
|---|---|---|---|---|
| window | centred, 1.9% (73 px) side margins, 2.8% (60 px) from the top | 96.2% of frame width (3694 px), height from the crop's aspect (2034 px) | the window's own corner, scaled | soft, heavier below: blur ≈ 96 px, offset ≈ 44 px down, low opacity, plus a hairline edge |
| A-roll card | right side, 0.8% (31 px) from the frame edge, vertically centred | 23.7% x 59.7% of frame (910x1290 px) | 28 px | blur ≈ 120 px, offset ≈ 48 px down |

- The card sits on the RIGHT (he looks to his right at the screen, see `rules/look.md`) and overlaps the
  window. It shows the A-roll at full height, cropped around his face.
- Background behind the window: the shared full-screen look.
- One capture frame for a whole set of scenes, so they swap cleanly. A clip that isn't a desktop capture
  (e.g. a downloaded TikTok) plays inside the same app window it would play in, in place of that app's video.

## Motion
- In: the full-frame A-roll shrinks into the card on a critically damped spring (ω 7.5) while the window
  enters with `materialize`, 0.10-0.12 s later.
- Out: the card grows back to full frame on the same spring, normalised to land exactly on full frame
  after 0.55 s; the window leaves with the mirrored `materialize` (pending Artem's OK as a preset).
- Camera (Artem, 2026-11-10; approved on video 12's connector and Setup scenes, which are the reference for this
  preset): a camera move GUIDES attention toward the focal point; it never tries to make
  the focal point the only thing on screen. Keep it subtle: about 1.1-1.2x (1.25 at most), never the old
  1.6-2x punch-ins.
  - Position and scale share the same keyframe times, spacing and easing (one eased progress drives the
    whole window rect), so they can never drift apart. Ease in/out, about 0.7-0.9 s per move.
  - The focal point is what he is talking about or doing (the message being typed, the bubble he points at,
    the button he clicks). It must sit where the camera goes and stay fully visible with margin, never cut by
    the frame edge or hidden under the card.
  - Follow the mouse: when he moves toward something at the edge of the page, the window slides so the target
    comes into view beside the card, starting as the mouse starts moving.
  - Long waits on screen (Claude thinking, a generation running) are time-lapsed, with the camera at rest or
    barely moving.
  - The window never shrinks inside its rest rectangle. The card stays put above it.
- Revised by his pass-2 notes on video 13 (2026-11-13), which override the "1.1-1.2x" guidance above where they differ:
  - The test for every frame: is the thing he is doing or naming whole, readable and centred in the free area left of the card?
    If not, the framing is wrong, whatever the zoom number. He rejected frames where the chat box sat in a corner, where a
    new chat starting was off screen, where a new window was cut. He praised a 1.7x zoom on a Finder window that was whole.
  - A new window or page: the whole screen at normal scale first, then move in.
  - Back to normal before going to the next target.
  - A control in the window's corner (a toggle top left): a magnifying glass on it, not a zoom that pushes it to the frame edge.
  - A click outside the app window (the Dock) is still shown: draw that strip under the window for the moment of the click.
  - When he trims the cut, re-time the recording so no action that matters is skipped: speed stretches up (typing 1.5-2x,
    waits squeezed) rather than jump.
  - The window's corner mask matches the app's real corner radius (21 capture px on the 2026-11 Claude app), or dark
    wallpaper shows in the corners.
- Keep anything the viewer must read clear of the card (about the right quarter of the window at rest).
- **Normal scale** (his final notes on video 13: "remember this as a normal scale for now and for future videos as well"): the
  rest frame in the table above, the whole window at 96.2% of the frame width, centred, card on the right. It is the
  default for every moment that has no target to move toward, and the place every move returns to. At scale 1 the window
  is never slid sideways or shrunk to clear the card (he sent two such moments back to normal).
