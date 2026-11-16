"""Speech-to-text with word timings. Apple Silicon Macs use mlx-whisper (fast, on the GPU); everything else uses
faster-whisper. Set ED_STT=faster to force the faster-whisper path on a Mac (it is the path Windows takes)."""
import os, platform, sys
import numpy as np

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

MLX_MODEL = "mlx-community/whisper-large-v3-turbo"
FW_MODEL = "large-v3-turbo"
_b = None


def backend():
    global _b
    if _b is None:
        if os.environ.get("ED_STT") != "faster" and sys.platform == "darwin" and platform.machine() == "arm64":
            try:
                import mlx_whisper  # noqa: F401
                _b = ("mlx", None)
            except ImportError:
                pass
        if _b is None:
            from faster_whisper import WhisperModel
            try:
                m = WhisperModel(FW_MODEL, device="auto", compute_type="auto")
            except Exception:
                m = WhisperModel(FW_MODEL, device="cpu", compute_type="int8")
            _b = ("faster", m)
    return _b


def transcribe(samples, language=None, prompt=None, words=True):
    """samples: float32 mono 16 kHz. Returns (text, [{"w", "s", "e", "p"}], language)."""
    kind, model = backend()
    if len(samples) < 1600:
        return "", [], language
    if kind == "mlx":
        import mlx_whisper
        r = mlx_whisper.transcribe(samples, path_or_hf_repo=MLX_MODEL, word_timestamps=words, language=language,
                                   condition_on_previous_text=False, initial_prompt=prompt, verbose=None)
        ws = [{"w": w["word"].strip(), "s": round(w["start"], 3), "e": round(w["end"], 3),
               "p": round(w.get("probability", 0), 3)} for seg in r["segments"] for w in seg.get("words", [])]
        return r["text"].strip(), ws, r.get("language", language)
    segs, info = model.transcribe(samples, language=language, word_timestamps=words, condition_on_previous_text=False,
                                  initial_prompt=prompt, vad_filter=False, beam_size=5)
    segs = list(segs)
    ws = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)}
          for s in segs for w in (s.words or [])]
    return " ".join(s.text.strip() for s in segs).strip(), ws, info.language


def warmup():
    kind, _ = backend()
    sr = 16000
    t = np.arange(sr) / sr
    transcribe((0.01 * np.sin(2 * np.pi * 220 * t)).astype(np.float32), language="en")
    print(f"speech-to-text ready ({kind})")
    from .media import face_model
    face_model()
    print("face detector ready")
