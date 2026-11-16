"""s-connect-v2: the sound cues of the scene, read from the frames the page plays (final pass: "The sound effects here feel
slightly out of sync"). Nothing here is computed from the recording's clock or from the keys: every number below is the
PAGE FRAME (0 = the scene's first frame, 543.2093) on which the thing is first seen in <cache>/frames/s-connect-v2-rec,
stepped frame by frame (file number = page frame + 1). The recording was made with "show clicks" on: a grey ring fades in
around the cursor on the frame the button goes down and swells and fades when it is let go.
  python3 "<job>/graphics/s-connect-v2/cues.py"      -> sfx.json (timeline seconds on the frame grid)

Rule (contract-final, rules/sound.md): a click or key sits on the frame of the press itself, a frame or two before what
it causes; typing runs from the frame the first character shows to the frame the last one shows (both frames sounded).
Where the time-lapse skips the ring's first faint frame, so the ring and what the click causes land on one frame
(+ Add, the URL field), the cue is the frame before.
Not cued: the hover that opens Claude's sidebar (no click), the switch from the browser to Claude (pass 1 had no sound
there either). The stray click the recording opens with is no longer on screen (build.py holds a clean frame over it).
"""
import json, os
FPS = 30000 / 1001
F0 = 16280                                   # the scene's first frame on the timeline (543.2093)
t = lambda k: round((F0 + k) / FPS, 4)
#       page frame, kind, note                                                   what the frames show
CUES = [(127, "mouse-click", "press: he starts dragging over the connector link"),          # ring first seen 127 (faint), selection starts 130
        (143, "mouse-click", "release: the connector link is selected"),                    # ring swells and fades from 143, gone 146
        (166, "mouse-click", "click the copy button (Copied)"),                             # ring + the tooltip starts to fade 166, 'Copied' 170
        (261, "mouse-click", "click Customize"),                                            # ring 261, the row darkens 263, the page 266
        (286, "mouse-click", "click the Connectors tab"),                                   # ring 286, the tab 289
        (311, "mouse-click", "click + Add"),                                                # ring and menu together on 312 (press at 311.4)
        (324, "mouse-click", "click Add custom connector"),                                 # ring 324, the menu closes 326, the dialog 327
        (340, "mouse-click", "click the Name field (he double-clicks it: first click)"),    # ring 340, let go 343
        (344, "mouse-click", "second click on the Name field, the field takes focus [the second half of a double-click, 4 frames after the first: drop it if two sounds this close clutter]"),  # new ring 344 (faint), the field's blue border 345
        (354, "type", "typing the name Everygen: E on frame 354, the last n on frame 368"), # E 354, Ev 359, Eve 360, Ever 361, Every 363, Everyge 366, Everygen 368
        (385, "mouse-click", "click the URL field"),                                        # ring and the blue border together on 386 (press at 385.6)
        (390, "key", "the link is pasted (it shows on the next frame)")]                    # the link 391
TYPE_LAST = 368
out = []
for k, kind, note in CUES:
    c = dict(t=t(k), kind=kind, note="s-connect-v2: " + note)
    if kind == "type":
        c["end"] = t(TYPE_LAST + 1)
    out.append(c)
d = os.path.dirname(os.path.abspath(__file__))
json.dump(out, open(os.path.join(d, "sfx.json"), "w"), indent=1)
for c in out:
    print(c["t"], c.get("end", ""), c["kind"], c["note"])
