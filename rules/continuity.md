# Visual continuity

- Progression graphic: each new instance's first frame is identical to the previous instance's last frame (same steps lit, same dashed line position, same hidden-step treatment). The instance then animates one story move (reveal a step, extend the dashed line, foreshadow future steps without a line, retract the line and insert step 1.5, break/desaturate then relight).
- Continuity covers the graphic's state, not one-off elements. A title tied to one line (video 12: the "Claude + Gemini Omni" header and the slide-down that makes room for it) exists only in that instance and the side visual right after it; the next instance starts without it.
- The graphic's state follows what the viewer already knows. A mystery marker (video 13: the "?" on the camera card of the progression graphic) is gone from the instance where the answer is out and from every instance after it.
- Side visuals layered on the graphic (e.g. the "copy the system" animation) are NOT instances: the next instance continues from the last real one.
- Design the layout so a step can slot in between existing ones (step 1.5 between 1 and 2).
- Dashed line only connects steps we have actually reached. Foreshadowed steps light up but get no line.
- Before/after explainers rhyme: the "after" visual is built exactly like the "before" one (stitched clips with red, inconsistent audio vs the same graphic with consistent audio; creator still going sloppy vs coffee reference going sloppy) so the change clicks for the viewer.

**Why:** Artem's storytelling rule, explained 2026-11-07.
**How to apply:** build each recurring graphic as one coded component with named states; render every instance as a transition from state A to state B, so continuity holds by construction.
