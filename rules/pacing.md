# Pacing and speech joints

Speech joints = the start of every sentence plus each internal pause (commas, clause breaks), detected from his actual delivery (script punctuation is a hint; he mostly follows the script). They are the cadence of the speech. Every visual change (in, out, reveal, layout switch, cut) starts on a joint, never mid-clause. Treat this as the rule for now; finer pacing is taste he'll keep teaching.

For an eased move, "starts on a joint" means the moment the change reads (its speed peak) lands on the joint; the first key can sit a word earlier. A micro joint where a secondary idea begins ("...a simple system / with Claude and Gemini Omni") gets its own visual change.

The exact frame of a joint is cut on action: the energy reset just before the joint word, not the waveform onset. Find it by checking a few frames around the transcript timestamp, not by scrubbing the take frame by frame.

Blinks (his note on the Fable 5.2 test, 2026-11-11): never cut away from a shot during a blink or in the frames right after one; a blink playing out just before the cut makes it jarring. The cut comes before his eyes start closing; it doesn't have to be the last frame before they close.

- Visualize IDEAS, not words. Visuals are not timed to words; they support the cadence and must be digestible. Less screen time = simpler visual. A visual that stays over several clauses shows a few ideas, one per clause, never filler.
- Digestibility decides the start: if a joint-to-end span is too short to read, start at an earlier joint, up to the sentence start. Short sentences are one unit: "For our protein coffee ad, I'll open TikTok, and search up 'UGC example'" starts the TikTok UI at "For our…", standalone, not word-synced.
- Example: "But what the creator shows off, and when, all comes from the script": graphic covers the sentence, "Script" revealed on the joint before "all".
- Full-screen graphics default to whole-sentence duration; never start one mid-clause ("what…").
- List and roadmap graphics hold to the end of the sentence, not just to the last joint. A beat of stillness after the last item lands is fine.
- Lines that must register (open loops like "before I share exactly how much it cost") stay on A-roll; at most a foreshadow of the later visual, built exactly as it will appear later. The foreshadow must be READABLE: show what it is and hide only the answer (video 12: "This ad cost [reels spinning, landing on ???] credits"). A frosted/blurred card is confusing, never use one.

Cutting (from his own trims of video 12, 2026-11-09):
- Cut tight: in about 1 frame before the speech onset, out 1-4 frames after it ends. Dead air of about 0.45 s or more inside a take is cut out. A reveal line ("Here's what it made:") may keep a small beat before it.
- Exceptions to cutting tight (his trims, 2026-11-10; restated 2026-11-11): only a phrase that has to sink in gets about 0.2 s more silence after it: an impactful line, a transitional line that sets up the next section ("But you'll see how this backfired in just a second.", "Let me show you how it works."), a joke, or a vulnerable line ("So please don't repeat my mistake."). It's never a visual that needs the moment: nothing else gets extra room (in the Fable test, room after visuals made the cut feel slow). Where the picture cuts inside that room follows the blink rule; if the A-roll can't hold through it without a blink, the next visual covers it. Take the extra room tone from the end of the line, or from the head of the next clip if a breath follows the line.
- Audible breaths at a joint are cut out too (round 4 flagged two, plus three joints of 0.44-0.54 s). Check every joint acoustically, not only the ones Whisper marks: keep each word's attack and decay (cut where the level falls below about -50 dB, never inside a soft word ending), and transcription-proof every changed clip.
- Every A-roll audio cut gets a 4-frame Constant Power crossfade, centred on the cut.
- Picture and sound may cut 1-4 frames apart, so the picture cuts on action while the sound cuts in the gap.
- Hide A-roll-to-A-roll cuts: cut from a full-screen visual back to A-roll, not A-roll to A-roll. Where a cut has no cover, find a line nearby that can be visualized (a replay, a this-vs-that, the thing he names) and put a full-screen visual over the cut. When the visual needs the screen time to be digested, A-roll may come back mid-sentence in the next phrase; otherwise come back at the next sentence start.
- Long A-roll-only stretches are a cue to ideate a visual for the line, even when the story doesn't strictly need it (pacing alone justifies it).
- Elements of a graphic that aren't what he is saying are NOT timed to his words: they come in together, in the order the eye should read them, about 3 frames apart, with the conclusion about 10 frames later (video 12: three cups, then three ✕, then "−50 credits"), so the viewer has time to digest.
- A visual that holds over several joints gets a small beat on each joint (e.g. a green tick popping on the still at "it might look perfect as a still").
- Zoom on A-roll to carry a silence: anchor point between his eyes, eased so the peak lands where the half-sentence ends and the silence starts.

His pass-2 notes on video 13 (2026-11-13):
- He flags any silence he can feel ("the silence is a bit too long", twice). The +0.15 s I gave after an open-loop tease ("…in a few minutes, you'll see exactly why") was one of them: a tease does not get extra room. Keep the extra room for a reveal or a joke.
- A breath or pause he keeps gets a subtle push-in instead of a cut (about 5%, eased over the breath, anchor between his eyes, held to the clip's end; `lanes/premiere/zoom-keys.py`): he asked for it on a breath before a conclusion and on the pause before a joke ("Well, at least for now").
- Don't keep showing a visual while he says something else about it: when the line turns ("Opus's visuals aren't bad"), show what the new line is about, not the example he just called bad.

His final notes on video 13 (2026-11-13):
- **A visual change that falls in the silence between two sentences starts at the END of the previous sentence**, on the frame his last word is over, not on the first word of the next one. The move plays through the silence and the next sentence opens on the new picture. This is cut on action applied to a pause: the pause belongs to what comes next. The block's song starts on that same frame. His words: "whenever there is a change in visuals like this during a silence, it always starts at the end of the previous sentence, not at the beginning of the new one (because it also follows the rule of cutting on action)". He had already said it four times in other words: "transition into A-roll after I am done saying 'time'", "start the transition after I am done saying 'show off'", "when I say 'three seconds into the video' we already need to see that text", and here "start the transition into screen recording plus A-roll right after I'm done saying 'a few clicks' and start the music right there as well". What I got wrong: I read "starts on a joint" as the onset of the next sentence, so the silence sat on the old picture and the change competed with his first words. Inside a sentence nothing changes: a change at an internal joint still lands on that joint.
- Never go back to full-screen A-roll for a moment when the next sentence opens with a full-screen visual: hand over from one graphic straight to the next ("you're transitioning basically into another transition, which is jarring").
- An overlay on his camera (a lower third) always leaves with its exit animation, never by vanishing at a cut. When a full-screen visual follows, the exit starts on the frame that visual comes in.
- Room at the end of a clip ("we still can't hear 'cents' properly", "we can't hear myself properly… know this for future videos"): the last consonant of a line ("-ts", "-lf", an s or f) comes after a short dip and is quiet (about -40 dB). A cut in that dip swallows it, and the 4-frame crossfade takes two more frames. He fixed one himself by adding 0.2 s. The end of a line is where the level has stayed under about -60 dB for 0.1 s; the cut goes 2-4 frames after that, never at the first dip.
- When he says "both phrases in one take" he means the line he marked AND the one after it (video 13: "With Everygen you skip all of that…" + "First, click the first link…" came from one continuous take; I had paired it with the line before). If it is unclear which neighbour he means, ask.

Separation (so a 10-min video doesn't feel like one long sentence):
- New story block (= chapter): new song that sounds NOTICEABLY different from the previous one (mood barely matters, contrast does) + a visual change in the first sentence (A-roll ↔ full-screen visual, or A-roll ↔ screen + A-roll). A music switch alone over A-roll → A-roll is weak.
- New story beat: a visual change. A new pocket of the song is optional, not required for every beat.
- Claude identifies blocks and beats itself. For how Artem marks them (and music pockets, layouts, visuals), see his comments in the reference scripts.
- What his script comments no longer need to mark (his debrief after video 13, 2026-11-13): new song or pocket, transitions and layout switches, zooms on screen recordings, typing and click sounds, "same scene in both". Claude decides those itself. He still marks his idea for a visual, pointers to material, anything against the default (keep a silence, a particular take) and a song hit on a specific word.
- When no separation is wanted, use a smooth animated transition on purpose (e.g. A-roll easing into the screen + A-roll layout), still starting on a joint.

**Why:** explained 2026-11-07; list holds added 2026-11-08.
**How to apply:** timing of every visual, cut and music switch. 
