"""Word-level transcript of an A-roll with mlx-whisper (Apple silicon).

  .venv/bin/python pipeline/transcribe.py <video> <out_dir>

Writes out_dir/words.json  [{"w": word, "s": start_s, "e": end_s, "p": prob}],
       out_dir/segments.json (Whisper segments), out_dir/transcript.txt (readable, timestamped lines).
"""
import json, os, subprocess, sys, tempfile
import mlx_whisper

MODEL = "mlx-community/whisper-large-v3-turbo"

def main(video, out):
    os.makedirs(out, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "a.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
        r = mlx_whisper.transcribe(wav, path_or_hf_repo=MODEL, word_timestamps=True, language="en",
                                   condition_on_previous_text=False, verbose=False)
    words = [{"w": w["word"].strip(), "s": round(w["start"], 3), "e": round(w["end"], 3), "p": round(w.get("probability", 0), 3)}
             for seg in r["segments"] for w in seg.get("words", [])]
    json.dump(words, open(os.path.join(out, "words.json"), "w"), indent=0)
    json.dump([{k: seg[k] for k in ("start", "end", "text")} for seg in r["segments"]], open(os.path.join(out, "segments.json"), "w"), indent=1)
    with open(os.path.join(out, "transcript.txt"), "w") as f:
        for seg in r["segments"]:
            m, s = divmod(seg["start"], 60)
            f.write(f"[{int(m):02d}:{s:05.2f}] {seg['text'].strip()}\n")
    print(f"{len(words)} words, {len(r['segments'])} segments -> {out}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
