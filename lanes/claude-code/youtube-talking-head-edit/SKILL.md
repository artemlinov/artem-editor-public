---
name: youtube-talking-head-edit
description: Edit a long-form YouTube talking-head video (A-roll plus full-screen visuals) end to end from the raw recording alone; a script or brand kit helps but isn't needed. It picks the takes, cuts on speech joints, maps story blocks and beats, works out a look for the video, builds designed, animated full-screen visuals that show real proof, adds music and sound effects, renders the video and reviews it. Use whenever someone says "edit this video" (or asks for a YouTube edit) and attaches horizontal talking-head footage, even if they never say "long-form".
---

# YouTube talking-head edit

Turn one raw talking-head recording into a finished YouTube video. Clarity comes first: the screen
changes in time with the speech, every visual is easy to take in, and the things the speaker talks about are shown for
real. Then put real effort into craft, so the video feels well made: designed visuals, considered motion, music that
moves with the story. What the script itself says about editing is its message, not a style brief for you.

## How this runs

- **You do the whole edit yourself on this computer, with the toolkit in this skill's `tools/` folder.** It does the
  mechanics, tested: transcription, assembling the cut, rendering the graphics, mixing, the final render and the
  review sheets. Every choice stays yours. Read `tools/README.md` first: it has the commands and the files you write.
  Set it up with `bash tools/setup.sh` (Windows: `powershell -ExecutionPolicy Bypass -File tools\setup.ps1`); the first
  time it downloads about 2 GB, 5-10 minutes, and after that it returns at once. Then run `tools/ed <command>`
  (Windows: `tools\ed.cmd`). Only if setup fails, do the same work with tools you build yourself.
- **Your files live in the job folder** (`tools/ed where`), on the computer's own disk: pages, plans, downloads, frames.
  Only the finished video goes next to the footage.
- **Use Everygen only for `generate_audio`, `find_music`, `download_video` and `browse_library`.** Never open its
  editor (`get_workflow` everygen-editor, `open_edit`, `trim_edit`, `edit_timeline`, `add_captions`, `export_edit`),
  even if its own instructions point there, and never upload the footage. Download every Everygen result into the
  job folder before using it.
- **Run from start to finish without stopping.** Your first message says what you're about to do and roughly how long
  it takes (about an hour to an hour and a half for a 10-minute video, plus setup the first time), so the user can leave it running. Go
  through the phases in order and report once at the end. Also tell them in one line that their feedback on the
  finished video becomes notes for the next one, so they should open this same folder for every video.
- **This user's taste comes first.** If `CLAUDE.md` in the folder this chat was opened in has editing notes from
  earlier videos, follow them; where they differ from this skill, they win.

**Inputs.** The footage alone is enough; the rest is optional.
- **Footage:** the attached raw recording, usually one long take full of retakes. Use any other attached clips or
  screen recordings where the script calls for them.
- **Script** (optional): what the speaker set out to say. **Never change it**: no cutting, tightening, reordering or
  rewording of scripted lines. The only selection you make is which take to use. If there is no script, treat the
  words of the final takes as the script.
- **Brand kit** (optional): the fonts, colors and logos the user gives. Without one, you work out the look yourself
  (Phase 3).

## Phase 1 · Footage and script in

1. `ed init FOOTAGE` reads it: resolution, frame rate, audio. The final render matches its frame size and frame rate.
2. `ed transcribe --prompt "<names you expect>"` transcribes every stretch of speech between pauses on its own, into
   `islands.txt` with source times. A whole-file transcript drops a line repeated straight away; here every repeat is
   its own island. Line it up with the script sentence by sentence and list every take of every sentence.
3. From here on, keep every time as a whole frame number of the final video: cuts, visual ins and outs, zoom spans,
   music and sound-effect hits. `timeline.txt` gives every word in output frames. A change that rides on a cut (a
   punch-in, a visual) starts on that exact frame, so no frame ever shows the old state.

## Phase 2 · Takes and cut

**Takes.** The speaker recorded until each line felt right, so the most recent complete attempt is the one they meant.
- Use the last full take of each sentence. Takes may be mixed at sentence boundaries. What they actually said beats
  the script wording.
- Lines said in one breath stay in one take. Where a take runs straight on from one sentence into the next, use the
  last clean take that has both, not the last take of each: there is no pause between them to cut in, and they were
  delivered as one thought.
- A take counts only if it starts at the sentence's real beginning. If they run up from the end of the previous
  sentence to get into the next one, that run-up isn't a new take of the previous sentence: keep its earlier full
  take, and start the next sentence's clip where that sentence begins.
- Warm-ups aren't takes. If they say the sentence twice, use the second; if they say only a fragment first, start at
  the real take.
- A slow, broken pickup that splits the line into pieces isn't a take, even when it comes last. Use the last full,
  fluent take.
- A stumble inside the last take is cut out; the take stays. A slip of the tongue (a wrong or mangled word, not a
  rewording) can't be cut out, so it rules the take out, even the last one: read each chosen take's transcript for
  one, and use the last clean take.
- Hidden retakes: a repeat can sit inside one island, only 0.15-0.45 s after the first try (`ed fine N` splits an
  island at short pauses), or right after your out point: `ed cut` flags `LATER TAKE?` when the line is said again
  there, and that later one is usually the last take.
- Gaze is the tell. Speakers often read a line off their screen, then say it again to the camera straight away. The
  gaze sheets (`review/gaze_*.jpg`, a frame from the middle of every chosen take) show it: if the speaker looks at a
  screen on a line meant for the camera, the to-camera take right after it is the one to use. A screen look with no
  repeat after it is on purpose (acting out working on the screen, often where a screen recording goes), and that take
  stays.

**Speech joints.** Joints are the start of every sentence plus each pause inside it (commas, clause breaks), taken
from the actual delivery; script punctuation is only a hint. They are the rhythm of the speech, and every visual
change (in, out, reveal, layout switch, cut) starts on one, never mid-clause, so the picture moves with the voice.
- For an eased move, the moment the change reads (its speed peak) lands on the joint. The move can start a word
  earlier.
- Between two sentences it is different: the joint is the END of the first one. A visual change that falls in the
  silence between them starts on the frame the last word is over, not on the next sentence's first word, so the move
  plays through the silence and the next sentence opens on the new picture. Started later, it leaves the silence on
  the old picture and competes with the first words. A change at a joint inside a sentence still lands on that joint.
- A micro joint where a secondary idea begins gets its own visual change.

**Cut tight.** Dead air and breaths make a video feel slow. Write your take choices into `takes.json` (format in
`tools/README.md`) and run `ed cut takes.json`. It finds each line's first and last word in the recording near your
`src` times (so those only need to be roughly right) and cuts in on the first word's attack and out after the last
soft consonant, never into the attempt before or after it, even where the speaker ran straight on. It takes out dead
air of 0.45 s or more inside a take, and puts a short constant-power crossfade on every join. What stays yours:
- `drop` a breath or a stumble between words inside a take.
- `room`: about 0.2 s more silence after a line that has to sink in: an impactful line, a transitional line that sets
  up the next section, a joke, or a vulnerable line. Nothing else gets extra room: a visual never needs it, and
  neither does a tease of something that comes later in the video. A silence the viewer can feel is too long. Where
  the take has no silence after it, `ed cut` takes the rest from before the next line. The room ends before a blink or
  a look away: check its frames, and shorten it to cut before the eyes close.
- `pic_lead`: the picture cuts on action, on the energy reset (a head move, a breath in) just before the joint word,
  up to 4 frames before the sound cut. Never cut away from a shot during a blink or in the frames right after one: the
  cut comes before the eyes start closing. Where the A-roll can't hold through a line's room without a blink, the next
  visual covers it.

Prove the cut: `ed cut` transcribes exactly what each line plays and compares it with its text. Every line in
`cut_report.txt` is OK, or you've read why not (a word the speech-to-text mishears is fine; a missing word, a leftover
"okay", a later take or `SAID TWICE?` is not: a stutter, a restart, or the end of another attempt leaking in at an
edge). Fix `takes.json` and run it again, and finish this before you build any visual: a cut changed later moves every
frame after it. If you still find a cut problem late, fix it the same way (`takes.json`, `ed cut`, then move and
re-render the visuals whose frames changed). Never mute, cut or patch the voice track or the mix to hide it: that
leaves silence while the speaker's mouth moves.

## Phase 3 · Story map

Before building anything, write the map down: the blocks, their beats, every line with its joints, the visual each
line gets, and the song for each block.

- **Blocks** are the chapters (hook, intro, each main section, the ending). If the script has headings, those are
  the blocks. A new block gets a song that sounds noticeably different from the last one (contrast matters more than
  mood) **and** a visual change in its first sentence: A-roll to full-screen visual, or A-roll to screen + A-roll. A
  music switch alone over A-roll is weak; without both, a ten-minute video feels like one long sentence.
- **Beats** are the steps inside a block. A new beat gets a visual change; use full-screen visuals to change the pace
  and move away from the A-roll.
- **Vary the layout all the time**: full-screen A-roll, overlays on the A-roll, full-screen visuals, screen + A-roll.
  A long run of one layout (screen + A-roll above all) feels lazy. Transitional, emotional, opinion and reassurance
  lines go to full-screen A-roll; the screen comes back for what is done on screen. One focus per phrase.
- A sentence recorded in parts (commas in the script, not full stops) gets short, comma-length pauses between them.
- **The intro teases the value** by foreshadowing visuals from later in the video, so viewers see what they'll get.
  Build the foreshadow exactly as the visual will appear later. A tease card (what something cost, what's coming)
  stays readable: show what it is and hide only the answer. A frosted or blurred tease card just confuses.
- **Every tease gets a visual**, anywhere in the video. "That's exactly what I fixed", "in a few minutes I'll show you
  how": said over the speaker alone, a promise like that is vague. Show a glimpse of the thing promised (the result,
  the tool, the before and after), so the viewer knows what they're waiting for.

**The look.** Decide it before you design anything, and keep it for the whole video; the music changes from block to
block (Phase 5).
- With a brand kit, use its fonts, colors and logos exactly. Anything the kit doesn't set (music genre, animation
  look) is your call.
- Without one, put real thought into it. Work out whose video this is and what it's about. When it centers on a brand
  or product (the creator's own, or one the video is about), visit its site and build the look from it: its fonts (or
  the closest free ones), colors, light or dark, the style of its cards and buttons. Otherwise take it from the
  creator: their channel or site, the colors of their set. There is no default theme: light or dark, playful or sober
  follows the brand and the footage.
- Write it down as a short style guide (fonts, colors, background, card style, motion feel) and build every graphic
  from it.

## Phase 4 · Visual plan and proof sourcing

**The first 30 seconds are the most important part of the edit.** Spend about 80% of your effort there, on both the
ideas and the design: what each line shows, how it looks, how it moves. The rest of the video reuses those ideas and
designs.

**Proof over decoration.** When the script names something real (a product, a page, a stat, a tool, a result), show
the real thing: the real page, UI or output. Building it yourself in code is as good as capturing it, often better,
as long as everything in it is real: the real posts, names, words and numbers. So when the script or the request says
to pull up or show something (a feed, a page, a post), a faithful rebuild does exactly that. It isn't a fallback:
don't apologize for it or report it as one. Invented concept visuals are only for abstract ideas. Real proof is what
makes a claim believable.
- Source it online: the official page, the original post or video. Screenshot it, or download the media
  (`download_video` fetches videos from the major social platforms).
- Use every asset at its best quality: the original file, never a small crop blown up. Download a post or video; pull
  anything made in Everygen (an image, a video, an avatar) from the user's library with `browse_library`; crop out of
  a screen recording only when nothing else exists. Never show an image much larger than its own pixels.
- Show a real thing the way the viewer meets it in real life: a website in a clean browser window, a post as the
  post, a video playing in its player (download it; never a still or a thumbnail from a grid). A claim about people
  (a trend, a reaction, how many use something) gets real posts from where it happens, never an invented crowd.
- Real proof is acted on, not just shown: the visual gets to the part that backs the claim. Zoom to that part whole
  and centered, never cropping into it, big enough to read in the time it's on screen. Isolate the elements that
  matter from a big block of text or data.
- A magnifying glass or highlight goes on the exact spot the line names. Find it on the full-resolution image first
  (for "pure white spots on the skin", the blown-out patches themselves), then check the magnified view shows it.
- When the line restates what a source says, find the source's own sentence that says it and highlight those words.
- Never fake a real thing or change its words. If you can't find its real content at all, show the claim another
  true way.

**YouTube-native, not web design.** A video is watched once, at speed, so it has to read at a glance.
- Minimal text: no web-design labels, subheadings or captions explaining the visual. This limits words, not design
  or styling. Visualize ideas, not words.
- Less screen time means a simpler visual. If a joint-to-end span is too short to read, start at an earlier joint, up
  to the sentence start. A short sentence is one unit.
- A visual that stays over several clauses shows a few ideas, one per clause, never filler, with a small beat on each
  joint, so the picture never sits still for more than a few seconds.
- Amounts are shown as the amounts: a price comparison shows both prices, never bars without values.
- Logos are the real marks, drawn crisp, at a size and on a background where they read cleanly; never a small glyph
  stamped on a photo.
- When the line turns to say something else about the same subject (that example was bad; the rest isn't), the visual
  turns with it: show what the new line is about, never the picture from the line before.
- Tell the speaker's argument as a small story. When a line puts the wrong way next to the right way, show the wrong
  way first, then turn that same thing into the right way as the sentence goes on. Small, believable details make it
  land.
- Full-screen visuals default to the whole sentence; never start one mid-clause. But a visual starts with something
  to show: when what it shows only comes later in the sentence ("But before you try that prompt yourself, you should
  know..."), keep the speaker until then and start the visual on the joint just before it (a pause where a comma would
  go counts), so it never opens on an empty background waiting for its content.
- When a line's idea is too thin to fill the screen (one number, one logo, a short phrase), show it as an overlay
  beside the speaker on the A-roll, not as a full-screen visual with a lone element on a background.
- What the speaker looks at or points at, the viewer sees. When they read off their screen, glance at something or
  point at it, show that thing (the screen recording, the page, the object) while they do; never leave the viewer
  watching someone look at something they can't see.
- A powerful phrase (the line the section builds to, a bold claim, a punchline, usually one you gave room) gets its
  words on screen: the phrase itself as big, clean text beside the speaker, appearing as it's said, in the look's type.
  Few words, and only for the lines that carry the video, so it stays special.
- Centered at every moment, not only in the final layout. What is on screen alone is centered and sized for the space
  it has; when a new element arrives, the layout moves to make room. Never leave empty space waiting for something
  that hasn't come yet.
- Everything that matters stays about 6% in from the frame edges.
- A zoom on a finished graphic keeps the whole graphic and the space around it in view. To point at a detail, put a
  magnifying glass on it instead of cropping in, so the viewer still sees what it is a detail of.
- Overlays on the A-roll sit beside the speaker, never over them. The A-roll is a layer you can reframe: when graphics
  go beside the speaker, scale and move the shot so the speaker and the graphics balance as one picture, rather than
  squeezing the graphics into the space left beside a centered speaker. An overlay leaves with its exit animation,
  never by vanishing at a cut; when a full-screen visual follows, the exit starts on the frame that visual comes in.
- Any zoom or punch-in on the speaker scales around the midpoint between their eyes, measured on a frame of that clip
  (`ed face F`), never estimated.

**Building visuals.** Each visual is an HTML page that draws any frame from its frame number alone, rendered with
`ed render` (the page rules are in `tools/README.md`). The speaker inside a graphic (a card beside a screen recording,
a card the A-roll shrinks into) is the live A-roll, filled in by the compositor. Videos inside a page play as image
sequences (`ed frames`, at the size they are shown).

**Motion and design.** Aim for a polished YouTube explainer, not a motion-design reel: every visual feels designed,
never like a slide, and the motion serves the message.
- Elements enter with a springy ease and a slight overshoot. A graphic's parts aren't timed to the words: within one
  idea, they come in as one quick run starting on its joint, in the order the eye should read them, with the
  conclusion a moment after, so the viewer is guided through it. Each new idea waits for its own joint.
- Each visual shows the idea of its line happening, not a label for it.
- Hard cuts are the default. A designed hand-off (the A-roll falls back as the visual rises over it, or shrinks into a
  card inside the graphic) goes at a block start, a big beat, or where the hand-off itself tells the idea. Keep it
  simple and quick.
- Never an empty frame: from one visual to the next, the new one arrives while the old one leaves, and a visual's
  first frame already shows its first element.
- A camera drift inside a graphic, or 3D depth, only when it's subtle: noticed only if you look for it. No motion blur.
- Text doesn't animate while it's being read: a move finishes before its result needs reading. A subtle drift of
  the whole frame is fine.
- A rewind or flashback (running back through a recording, replaying an earlier moment) is black and white and
  slightly washed out while it lasts, and returns to full color as the present resumes, so the viewer can tell then
  from now.

**Hide jump cuts.** An A-roll-to-A-roll cut reads as a jump, so cut from a full-screen visual back to the A-roll
instead. Cover every cut you can: find a line nearby that can be visualized (a replay, a this-vs-that, the thing they
name) and put a full-screen visual over the cut. If the visual needs time to be digested, the A-roll may come back in
the next phrase; otherwise come back at the next sentence. Never come back to the A-roll for just a moment, though:
when the next sentence opens with another full-screen visual, hand over from one visual straight to the next, because
a transition into a transition is jarring. Where no visual fits, carry the cut or a silence with a slow zoom toward
the eyes that starts on the cut and eases into its full scale where the half-sentence ends. A breath or pause you
keep on purpose (before a conclusion, before a joke) gets a subtler push-in: about 5%, eased over the pause and held
to the end of the clip, so the silence reads as meant. Long A-roll-only stretches are also a cue for a visual, for
pace alone. The other way round, a run of full-screen visuals longer than about 15 seconds keeps the speaker in view:
show the A-roll in a card beside the visuals, so the viewer never loses the person for long.

**Continuity.** A recurring graphic (a roadmap, a counter, a diagram) starts each appearance on exactly the frame its
last appearance ended on, then makes one story move, so the viewer follows one object through the video. What the
viewer has learned since overrides that: a mystery marker (a "?" over a hidden answer) is gone from the appearance
where the answer comes out and from every one after it. One-off elements aren't carried over. Before and after
visuals are built the same way, so the change clicks.

A progression graphic (the steps the video walks through) guides the viewer: the step being talked about is the only
sharp, readable one. Steps not reached yet are blurred, so the viewer sees how many are left but can't read them, and
steps already done are checked off and dimmed. It never shows every step readable before the video gets to them.

**Screen + A-roll layout** (when there are screen recordings):
- Show the app window whole, cropped on the window's own edges (find them on a frame): its top bar whole, the menu
  bar cropped off. Its corners match the app's own corners; never round them more. Never use a frame that cuts into
  the recording, and never cut a line of text at the frame's edge.
- The speaker sits in a vertical card beside it, vertically centered, on the side that makes them look toward the
  window. Never use a 16:9 corner window.
- That is the normal scale: the whole window, centered, with the card in place. The recording sits exactly there
  whenever nothing needs pointing at (a message just sent, a page working), and every move comes back to it before
  going to the next target.
- Keep anything the viewer must read clear of the card: move in on it. At normal scale the window is never slid
  sideways or shrunk to clear the card.
- Camera moves guide attention to what they talk about or do, without trying to fill the screen with it: usually about
  1.1-1.2x, eased over 0.7-0.9 s, with position and scale moving together. The test for every frame is the target,
  not the zoom number: the thing the viewer should look at (what the mouse is doing, the window that just opened, the
  box being typed in) is whole, readable and centered in the free area beside the card, never in a corner, cut by the
  frame or under the card. Don't go stronger, and don't move for every small action: a move needs something the viewer
  couldn't read or find at normal scale.
- A newly opened window or page is shown whole at normal scale first; then move in.
- What the speaker selects, highlights or types stays whole inside the frame for the whole action, as the selection
  grows: check a frame at the end of the action, not only the start, and move so all of it fits.
- A detail in a corner of the window (a toggle, a small control) gets a magnifying glass, held for the whole phrase
  it belongs to, not a zoom that would push it to the frame edge.
- Time-lapse long waits (a page loading, a render running). Where the recording runs longer than the line over it,
  speed stretches up (typing at 1.5-2x) rather than jump past an action that matters.

Once the visuals are placed, adjust the cut's room and cover to match them.

**Design check, before rendering.** Snapshot the first and the finished frame of every visual (`ed snap page.html
F,F`; for an overlay, a frame of the cut under it) and look at each one at full size, one image at a time, the way a
designer would before shipping it. A still takes seconds and a re-render takes minutes, so this is where the design
gets fixed.
- Is it balanced, or is the weight piled on one side?
- Does the content sit centered inside its cards and boxes, with even padding, and do the cards fit their content?
- Is there one clear place to look first?
- Does anything cover or overlap something else (a card over another card's label), or is any text cut at an edge?
- Does every mark (an arrow, a highlight, a strike-through) sit on what it marks and read as one clear thing, with
  nothing inside the edge margin?
- Is every image sharp at the size it's shown?
- Would it pass for a frame from a top YouTube explainer, or does it look like a slide?

## Phase 5 · Sound

**Music.** Generate each song with `generate_audio` (`lyria-3.5`, `durationSeconds` 120), or pick from `find_music`.
Generation takes minutes, so start the songs as soon as the transcript shows the blocks and keep working while they
generate; line their pockets up once the cut is final.
- Music is a bed under the voice, never a performance. Choose music built on a steady groove or texture that repeats
  and stays out of the way, never music that performs for attention: big builds, drops and climaxes, a lead
  instrument or solo carrying a melody over the beat, a sung-style hook, an aggressive or distorted sound. Even a
  calm style overpowers when its arrangement is dense, and so do a song's own build-ups and climax: under speech,
  use a part that holds steady.
- The hook's song holds tension: suspenseful and curious, so the viewer wants to know what happens next, while staying
  calm and steady under the voice. Never cheerful, bouncy or scary. Later blocks can relax. A course or tutorial video
  is the exception: its hook gets a confident, lighthearted song, still steady and never goofy.
- Instrumental only: no vocals, vocal chops or spoken samples, since any voice competes with the speaker. Ask for that
  when you generate, and check every song anyway: generated songs often open with a spoken tag or a voice sample even
  when asked for none. `ed songs FILE ...` transcribes each song on its own and prints its loudness every 2 s and where
  it changes (a rough check: speech-to-text is unreliable on music and can invent words on a clean song); if any words
  come back, start the song after the voice or use another.
- One song per block, noticeably different from the last. A block longer than about 1.5 minutes gets a second,
  different song, switched on a transitional phrase between beats.
- A block's song starts on the block's first frame: the frame the visual change into it starts, which is the end of
  the previous sentence (Phase 2), not the new block's first word. It starts there even when the block opens on the
  plain A-roll.
- A good song has pockets: stretches with their own feel, such as a calm opening and then a faster, more dramatic
  part, with a clear change between them. Put those changes on the beats: each new beat inside a block starts a new
  pocket exactly on its first line. Plan for it when you generate: ask for sections that change at about your beats'
  times, then line the changes up (with the song's start offset, or by jumping to the next section at a beat).
- Read each song's loudness curve the way an editor reads a waveform before using it: clear pockets, each holding
  steady, and room under the peaks even in the busiest one. A song that sits near full level from start to end is too
  much, whatever its style.
- The song stops **before** the block's closing line, which plays dry: cut it into a reverb tail of your own, not a
  long fade, and never butt two songs together. When that line is long, only its last joint or two play dry. Apart
  from its pockets, don't chop the song into pieces.
- Music is gone before a joke lands: fade it out under the line before it, so the punchline plays dry.
- Music sits under the speech, audible but never competing: about 15 dB under the speech's RMS in the hook and about
  20 dB under after. Speech peaks at -3 dBFS. `ed mix mix.json` sets these levels; you choose the songs, their spans,
  offsets and how each ends.

**Sound effects** (`find_music` with `kind: "sfx"`) are sparse. Sound only the moments that carry meaning: a cut to a
full-screen visual, the key reveal, a real click or typing, the conclusion of a graphic. Skip decorative pops; too many
sounds become noise and the meaningful ones get lost.
- A real click or typing on screen gets that real sound. When you sound something that appears by itself, use a
  soft UI sound.
- Several elements arriving together get one sound, and a list never gets one per row. Trim each sound to its event
  and place it on it.
- One click or pop heard again and again gets tiring: rotate a repeating sound through a few similar variants matched
  in loudness, about 3 dB lower than a one-off.
- Good and bad twins: when two elements carry the same weight but one is good and the other bad (a green cell and a
  red one, a tick and a cross), both get a sound, and the two are told apart: the bad one is the same sound made darker
  (pitched down, duller). Look for these pairs in every graphic.
- The hook is the exception to sparse: every change on its opening title card gets a sound (each word a small click,
  the key word a bigger one), and a scene showing work being done should sound like it is happening right now (each
  click on screen a real mouse click, panned to where it happens, quiet).
- Variety: every kind of sound (whoosh, pop, reveal) rotates through at least three different files, so the same one
  never plays twice in a row; the same whoosh fifty times is what makes an edit sound cheap. A notification on screen
  gets a real notification sound (a phone ding), not a UI pop.
- Effects are felt, not heard: barely audible, so you'd miss them if they were gone but don't notice them. Set each
  one against the voice, not against the file's own level: as a start, a whoosh or hit peaks about 14 dB under the
  speech's loudness, a pop or click about 20 dB under (both measured in LUFS). When in doubt, go quieter.

## Phase 6 · Render

`ed render page.html` renders each graphic frame by frame at the footage's size, several frames at once. It waits for
every frame to be fully drawn before saving it, then checks for one- and two-frame glitches and re-renders any part
that has one; look at any `SUSPECT FRAMES` it still prints. Start the renders as soon as their pages pass the design
check and do the sound while they run. `ed compose plan.json` then builds the final video (the cut, camera moves,
graphics, the speaker in any card, the mix) and writes it once, next to the footage. `--range F0:F1` builds just one
part as a preview. Fix every `SHORT SHOT` it prints: a graphic coming in or out a frame away from a cut leaves a shot
on screen for one frame, which reads as a flash.

## Phase 7 · Self-review

Check the full render against every rule above with things you can measure. `ed review` does the measuring:
`review/report.txt` lists every line whose words differ from its text, any glitch in the graphics, the silences left
in the voice (longest first) and the loudness; `review/changes_*.jpg` show 2 frames before, the frame of and 1 after
every cut and visual change. Look at every sheet.
- The words: every one there, whole.
- The frames around every cut and change: framing, graphics, and no blink before a cut away from the A-roll.
- Look again at full size at every visual you changed after the design check.
- On screen recordings, pull a frame at every action (a click, typing, a window opening) and ask of each: is the
  thing the viewer should look at whole, readable and centered in the free area?
- Check motion, not only stills: for every camera move on a screen recording and every hand-off between visuals, tile
  a strip of every second frame from its start to its end, and confirm its speed peak lands on the joint (a change
  between two sentences starts on the frame the last word is over) and nothing collides or glitches mid-move.
- Every silence in the report is room you gave a line on purpose, or it comes out.

Fix what fails and render again (only what changed: re-render that page, then compose), at most two passes. Then
report back in a few lines: where the file is, its length, one line per block, any jump cut left uncovered, and
anything you couldn't do and how you covered it. End by asking what they'd change. Keep the job until they're happy
with the video; then `ed clean` frees its big files.

## After the edit · Learn from their feedback

The user's notes on this video are the best guide to their next one. When they give feedback:
1. Fix the video (only what changed: re-render that page, then compose).
2. Sort each note: would it matter in their next video too? "The pauses are too long", "no red", "bigger text" are
   taste: save them. "Move the logo at 2:13" is about one moment: don't save it, but if a lasting reason sits behind it
   ("logos always crisp, from the official source"), save the reason. When you can't tell, ask in one short question:
   "Should I remember that for your next videos?"
3. Save taste to `CLAUDE.md` in the folder this chat was opened in, one line per note, in their words where you can.
   If the file or the section isn't there yet, start it with:
   ```
   ## My editing notes
   When I give feedback on an edit, add what applies to my future videos here, one line each. Follow these in every edit.
   ```
   A note that changes an earlier one replaces that line. Never save one-off fixes, things this skill already does, or
   what this video is about.
4. Tell them in one line what you saved.

Claude Code reads that file at the start of every chat in this folder, so the next edit starts from their taste.
