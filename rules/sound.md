# Sound

Music and sound effects are generated with Everygen (MCP); tokens are not a concern.

Music
- Style: dark, beats, dreamy, laid back, electronic, not corporate.
- Pockets and waveforms (2026-11-12): a pocket is a stretch of a song with its own feel, not a short drop-out. His example, DOX Pt. II (Lennon Hutton), is calm to 0:48, faster and more dramatic to 2:25, slower to 2:50, then faster to 3:40. The changes between pockets land on the script's beat shifts. He judges a song from its waveform first: clear pockets with room under the peaks are good, while a wall at full level from start to end (The Pursuit, Henry Miles: Orchestral Hybrid, Epic) is too much. He never uses the Epic mood.
- Hook song (2026-11-12): tense and suspenseful, yet calm enough never to overpower him. Not laid-back beats (too chill for a hook), and never upbeat, happy or goofy. Tense and dramatic, not scary.
- Music is a bed under his voice, never a performance (2026-11-12): a steady groove or texture, never overpowering. What he picks on Epidemic for clients: Abstract Hip Hop, Acoustic, Ambient, Beats, Cinematic (careful: Action, Build, Chase, Crime Scene and Main Title overpower), Classical (Orchestral and Orchestral Hybrid can overpower), Electronic (Synthwave, Minimal Techno, Future Bass), Hip Hop Soul, Hip Hop (Boom Bap, Alternative, Old School, Lo-fi), Neo Soul, Soul Jazz. Funk and Jazz rarely, only when not overpowering; Pop only Alternative Pop or Electropop, carefully. Never Drill, Phonk or similar, never Rock. The chat skills get the reasoning, not this list.
- Instrumental only: no vocals, vocal chops or spoken samples; any voice in the music sounds like someone else talking over him (2026-11-11). Generated songs often open with a spoken producer tag or a voice sample even when asked for none (video 13: 7 of 12 songs, mostly hip hop and "beat" prompts). Whisper can't tell on music (it invents "Thank you" on clean songs): have every song listened to (Everygen `ask_video` on its URL), then start after the voice or regenerate.
- His note "song climax" on a word (Claude's reading, video 13, to confirm with him): the song culminates and stops there, its last hit on that word, and the rest of the block's closing line plays dry over the reverb.
- Story blocks get a new, noticeably different song; beats may get a new pocket. Cues are in the script comments.
- Alternate two lanes: a higher-energy and a lower-energy song family, both fitting the video, switching from block to block.
- A block's song starts on the block's first frame, also when its first lines are plain camera (video 13: the live section). The block's first frame is where the visual change into it starts, which is the end of the previous sentence, not the first word of the new one (`pacing.md`, his final notes on video 13: "start the transition… right after I'm done saying 'a few clicks' and start the music right there as well").
- Music is gone before a joke lands: fade it out under the line before (video 13: "…sticking with Opus 5.5. [pause] Well, at least for now.").
- A lifted quiet break can turn into "loud beats for no reason": don't lift a song's sparse break, leave it or pick another stretch.
- Song out: the song ends BEFORE the block's closing line, which plays dry. When that line is long, only its last joint or two play dry (2026-11-12: both models left a 10 s closing sentence dry, which felt too long). The next song starts on the next block's first sentence. Never butt two songs together. Exit with a reverb tail, not a long fade. When generating, ask for a song whose ending supports this.
- A transitional phrase gets silence under it: a song climaxes just before the phrase and cuts dry into its reverb exactly at the cut into it ("Here's what it made", "The hack"). Ending the song after the phrase leaves no transition, and the chapter change lands badly.
- Claude does NOT remix (Artem does that in minutes once the edit is at 90%). Place one song per block from its first line, use a start offset at most so a climax lands on its cue, end it with the dry cut into reverb (or the fade the script asks for). No pieces, no bar-line edits.
- For Artem's own remixes, the target is: pocket starts and hits exactly on the visual-change frame, with a short drop-out (about 0.4 s, up to 2 s for emphasis) and a 1-2 beat pickup before the hit.
- Level: audible but not overpowering, and loudest in the intro. His meter numbers (2026-11-11): with speech peaking at -3 dBFS, the music peaks around -15 in the intro (-10 to -20 depending on the song) and -22 to -28 for the rest of the video. Fable's video-13 test peaked about -29 throughout: too quiet, mostly in the hook. (Video 12's first beds also "almost felt like there is no music".) Within the range, a higher-energy or busier song goes quieter. A quiet song intro or a long quiet section is lifted close to the body (he gave one intro +20 dB); only the final reverb tail stays quiet.
- A song's build-ups and climax overpower speech (2026-11-12). In video 13, every hook he hated played the song's build and climax (its last 35 s) and stayed bad even at the right level; the hooks he liked played a steady groove. The one he liked was perfect at about 18 dB under his voice's RMS (later, steady hook songs set at 18 dB under were "a tiny bit too quiet": +3 dB, so the skills say 15), while songs set by their meter peaks at -15 sat only about 6 dB under.
- Length: change the song at least every 1.5 minutes. Put the switch on a transitional phrase ("You'll see how this backfired"), not in the middle of a beat. A song that gets busier in its second half is replaced, not kept for its first half.
- If Everygen generation fails and music has to be sourced (e.g. Epidemic), stop and ask Artem before remixing.

Sound effects
- Sparse. NOT every element gets a sound: sound the moments that carry meaning (a full-screen cut, the key reveal, a real click or typing, the conclusion of a graphic) and skip decorative pops. Several elements arriving together get one sound, not one each.
- Real or UI: ask what he would physically do to make it happen. If he (or the user on screen) causes it with a mouse or keyboard, it gets that real sound; if it appears by itself (an animation, a chip, a bullet, a tick, a panel), it gets an Everygen UI sound. Never a real-world sound (camera shutter, cash register, banknotes, mechanical "light clicks") on a UI animation.
- Real sounds in screen recordings (his own placements are the reference):
  - Mouse click: Magic Mouse (`Main SFX/Clicks/Magic Mouse.wav`), gain about -2 dB, its peak (0.275 s into the file) on the frame the click ring appears. One per click; repeat it as often as he clicks. Never a file with two clicks in it.
  - Highlighting text (his fix, 2026-11-10): a double-click on a word gets `Epidemic Sound/Mouse, Apple Magic, Left Click, Various Double.wav`. A drag-select gets the Magic Mouse split in two: the press (file 0-0.234 s) on the frame he presses, the release (0.234 s to the end) on the frame he lets go. Tell them apart by whether the selection jumps to the whole word at once (double-click) or grows (drag).
  - Typing: a slice of `Epidemic Sound/Keyboard, Macbook Pro 2017, Typing, Fast.wav` (about -12 dB) cut to exactly the on-screen typing start and end.
  - Single key (`Epidemic Sound/Keyboard, Macbook Pro 2017, Various, Characters, Single.wav`, first 0.4 s, about -8 dB): only for a transition between screen scenes and for a paste. Never as a typing sound.
  - Send: `Artlist/Computer Keyboard Enter Button Hard Press.wav`, first 0.7 s, about -5 dB.
  - If no fitting sound is on the drive, look online or ask him.
- UI sounds: the Everygen-native clicks (the C-series, POS, X10, and `ES_User Interface, Click, Digital … Notification 03`, about -10 dB). Back-to-back full-screen animations get a transitional click (`Angelic Click`, about -20 dB).
- One UI click repeated through a video gets tiring (video 13 pass 2: "You're overusing this specific click… and it is also a bit too loud. I would decrease it by maybe 3 dB"): pops and clicks rotate through a few matched variants, 3 dB lower than video 12's levels (`pipeline/sound/sfxcues.py`), and a graphic gets cues only for the moments that carry meaning, never one per row.
- Same elements, same treatment: if one element of a kind gets a sound, every element of that kind gets it.
- No risers. At most one, rarely, to lift a powerful phrase (it may also fade the music).
- Trim every sound to its event: a one-second event never carries a ten-second sound.
- Library: the `sfx_library` folder in `config/paths.local.json` (Drive `SFX/`): `Main SFX` (Clicks, Whooshes, Impacts, Camera, Money), `Epidemic Sound`, `Artlist`, `Random`, next to the Everygen set.
- Timing: a UI pop lands ON its visual (the frame it becomes readable), never before it. Only a real mouse or keyboard click comes a few frames BEFORE what it causes (its transient on the click frame). Whooshes and impacts peak on the change.
- Word-by-word text: a small soft click on each small word, a different, bigger click on the key word.
- Felt, not heard (2026-11-11): barely audible, so the brain picks them up but you don't notice them unless you listen for them. Both video-13 test edits ran about 4 dB too loud. Judge an effect against the voice, not the file: Everygen's effect files are mastered loud, so "X dB under the library level" doesn't carry over between libraries. On Everygen files, a whoosh or hit peaks about 14 dB under the speech's loudness, a pop or click about 20 dB under (LUFS); 10 and 16 were still a bit loud (video 14 test, 2026-11-16).
- Levels: almost everything sits 4-15 dB under the library level. Whooshes about -6 to -10 dB, clicks and pops -4 to -15, risers -9 to -12, impacts about -20, shimmers -4 to -6.
- No impact on a music climax: the music already hits there, so it's redundant.
- A reversal reuses the same sound, reversed and pitched down.
- Style: subtle and in Everygen style. No trailer booms, heavy bass or glitch.

Voice
- Speech peaks at -3 dBFS. The recording is already treated: no extra EQ, denoise or compression.

- Sounds of a screen scene (video 13 final: "the sound effects here feel slightly out of sync"): a click or key sits on the frame of the press itself as the RENDERED page shows it (a recording made with "show clicks" shows a ring on that frame), a frame or two before what it causes; typing runs from the first typed character to the last. Read the cues off the page's frames, never off the recording's clock (that was up to 2 frames off). When a scene moves on the timeline its sounds move by the same frames: after any move, check one click against the picture (they sat 10 frames late for a whole pass).

**Why:** Artem approved these from his editing curriculum on 2026-11-08; SFX, transitions and no-remix updated from his video 12 passes on 2026-11-09; real vs UI sounds, the click/key/Enter files, music level and length from his round-4 notes on 2026-11-10.
**How to apply:** every music and SFX pass.
