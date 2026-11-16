"""Rendering a graphics page frame by frame in a headless browser.

The page contract (README.md): the page is designed at 1920x1080 CSS pixels and sets
  window.SCENE = {f0, f1, alpha}       output frames it covers (f1 not included); alpha: a transparent overlay
  window.renderFrame(f)                draws output frame f (may return a promise)
  window.READY = true                  once its assets are loaded
  window.SCENE.card(f) (optional)      {x, y, w, h, r, crop:[x, y, w, h]} in CSS px (crop: 0..1 of the camera frame):
                                       where the live A-roll shows inside the graphic; the compositor fills it.
Before saving each frame the renderer waits for fonts, every image to load and decode, video seeks, and two drawn
frames. Without that wait, several pages rendering at once saved half-drawn frames (cards missing for one frame).
"""
import asyncio, json, os, pathlib, subprocess, time
import numpy as np
from . import job as J

WAIT = """async () => {
  try { await document.fonts.ready; } catch (e) {}
  const imgs = [...document.images].filter(i => i.getAttribute('src'));
  await Promise.all(imgs.map(i => {
    if (i.complete) return i.naturalWidth ? i.decode().catch(() => {}) : null;
    return new Promise(r => { i.addEventListener('load', () => i.decode().then(r, r), {once: true});
                              i.addEventListener('error', r, {once: true}); });
  }));
  const vids = [...document.querySelectorAll('video')];
  await Promise.all(vids.map(v => v.seeking ? new Promise(r => v.addEventListener('seeked', r, {once: true})) : null));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}"""
ARGS = ["--allow-file-access-from-files", "--disable-web-security", "--autoplay-policy=no-user-gesture-required",
        "--hide-scrollbars", "--force-color-profile=srgb"]
CSS_W, CSS_H = 1920, 1080


def _url(page):
    path, _, query = page.partition("?")
    p = pathlib.Path(path).resolve()
    if not p.exists():
        raise SystemExit(f"no page at {p}")
    return p.as_uri() + (f"?{query}" if query else "")


async def _open(browser, url, scale):
    pg = await browser.new_page(viewport={"width": CSS_W, "height": CSS_H}, device_scale_factor=scale)
    await pg.goto(url)
    await pg.wait_for_function("window.READY === true || (document.readyState === 'complete' && !!window.renderFrame)",
                               timeout=180000)
    return pg


async def _meta(browser, url):
    pg = await _open(browser, url, 1)
    m = await pg.evaluate("""() => { const s = window.SCENE || {};
        return {f0: s.f0, f1: s.f1, alpha: !!s.alpha, card: typeof s.card === 'function'}; }""")
    await pg.close()
    if m["f0"] is None or m["f1"] is None:
        raise SystemExit("the page must set window.SCENE = {f0, f1, alpha}")
    return m


async def _chunk(pw, url, frames, scale, alpha, card, fps, out):
    browser = await pw.chromium.launch(args=ARGS)     # one browser per worker: they share no drawing process
    pg = await _open(browser, url, scale)
    ff = subprocess.Popen([J.ffmpeg(), "-v", "error", "-y", "-f", "image2pipe", "-framerate", f"{fps.numerator}/{fps.denominator}",
                           "-c:v", "png" if alpha else "mjpeg", "-i", "-", "-c:v", "copy", out], stdin=subprocess.PIPE)
    cards = {}
    shot = {"type": "png", "omit_background": True} if alpha else {"type": "jpeg", "quality": 93}
    for f in frames:
        await pg.evaluate("f => window.renderFrame(f)", f)
        await pg.evaluate(WAIT)
        if card:
            cards[f] = await pg.evaluate("f => window.SCENE.card(f)", f)
        ff.stdin.write(await pg.screenshot(**shot))   # at the device scale: the footage's full size
    ff.stdin.close(); ff.wait()
    await browser.close()
    return cards


def _workers(n):
    return max(1, min(n or max(2, min(8, (os.cpu_count() or 4) * 2 // 3)), 10))


async def _render(jb, page, name, workers):
    from playwright.async_api import async_playwright
    url = _url(page); scale = jb.W / CSS_W; fps = jb.fps
    rd = jb.d("renders")
    async with async_playwright() as p:
        br = await p.chromium.launch(args=ARGS)
        m = await _meta(br, url)
        frames = list(range(m["f0"], m["f1"]))
        n = _workers(workers); n = min(n, max(1, len(frames) // 12))
        size = -(-len(frames) // n)
        parts = [frames[i:i + size] for i in range(0, len(frames), size)]
        ext = "mov"
        files = [os.path.join(rd, f"{name}.part{k}.{ext}") for k in range(len(parts))]
        t = time.time()
        res = await asyncio.gather(*[_chunk(p, url, fr, scale, m["alpha"], m["card"], fps, fl) for fr, fl in zip(parts, files)])
        cards = {k: v for r in res for k, v in r.items()}
        bad, first = _flashes(files, parts)
        if bad:                                       # re-render each chunk that has a suspect frame, once
            redo = sorted({k for k, fr in enumerate(parts) if any(b in fr for b in bad)})
            res2 = await asyncio.gather(*[_chunk(p, url, parts[k], scale, m["alpha"], m["card"], fps, files[k]) for k in redo])
            for r in res2:
                cards.update(r)
            bad2, second = _flashes(files, parts)
            # a frame that comes out the same twice is the design (a fast move), not a half-drawn frame
            bad = [f for f in bad2 if f in first and f in second and np.abs(first[f] - second[f]).mean() > 2]
        await br.close()
    out = os.path.join(rd, f"{name}.{ext}")
    lst = os.path.join(rd, f"{name}.txt")
    open(lst, "w").write("".join(f"file '{os.path.basename(f)}'\n" for f in files))
    J.run(["-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])
    for f in files + [lst]:
        os.remove(f)
    got = J.probe(out)
    if (got["width"], got["height"]) != (jb.W, jb.H):
        print(f"WARNING: {name} rendered at {got['width']}x{got['height']}, not the footage's {jb.W}x{jb.H}")
    meta = {"name": name, "page": os.path.abspath(page), "file": out, "f0": m["f0"], "f1": m["f1"], "alpha": m["alpha"],
            "cards": {str(k): v for k, v in cards.items() if v}, "suspect_frames": bad}
    json.dump(meta, open(os.path.join(rd, f"{name}.json"), "w"))
    dt = time.time() - t
    print(f"{name}: frames {m['f0']}-{m['f1']} ({len(frames)}) {'overlay' if m['alpha'] else 'full'} in {dt:.0f}s "
          f"({len(frames) / max(dt, 1e-6):.1f} fps, {n} at once)" + (f"  SUSPECT FRAMES (look at them): {bad}" if bad else ""))


def render(jb, page, name=None, workers=None):
    name = name or pathlib.Path(page.partition("?")[0]).stem
    asyncio.run(_render(jb, page, name, workers))


def _decode_small(path, w=160, h=90):
    r = subprocess.run([J.ffmpeg(), "-v", "error", "-i", path, "-vf", f"scale={w}:{h}:flags=area,format=gray",
                        "-f", "rawvideo", "-"], capture_output=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(-1, h, w).astype(np.int16)


def flash_frames(d, T=28):
    """Frames where a part of the picture differs from both neighbours while the neighbours agree: a one- or
    two-frame glitch (something missing or flashing). Works on (n, 90, 160) grey frames; returns indexes."""
    if len(d) < 3:
        return []
    bs = 10
    h, w = d.shape[1] // bs * bs, d.shape[2] // bs * bs
    b = d[:, :h, :w].reshape(len(d), h // bs, bs, w // bs, bs).mean((2, 4))
    out = []
    for i in range(1, len(b) - 1):
        a, c = np.abs(b[i] - b[i - 1]), np.abs(b[i] - b[i + 1])
        n = np.abs(b[i - 1] - b[i + 1])
        if ((a > T) & (c > T) & (n < T / 2)).any():
            out.append(i)
    for i in range(1, len(b) - 2):                  # two-frame version
        a, c = np.abs(b[i] - b[i - 1]), np.abs(b[i + 1] - b[i + 2])
        n = np.abs(b[i - 1] - b[i + 2]); m = np.abs(b[i] - b[i + 1])
        if ((a > T) & (c > T) & (n < T / 2) & (m < T / 2)).any():
            out.append(i)
    return sorted(set(out))


def _flashes(files, parts):
    """Suspect frames in the chunk files, and their small grey pictures (to compare two renders)."""
    bad, pics = [], {}
    for fl, fr in zip(files, parts):
        if os.path.exists(fl):
            d = _decode_small(fl)
            for i in flash_frames(d):
                if i < len(fr):
                    bad.append(fr[i]); pics[fr[i]] = d[i]
    return bad, pics


async def _snap(jb, page, frames, scale):
    from playwright.async_api import async_playwright
    url = _url(page); sd = jb.d("snaps"); name = pathlib.Path(page).stem; out = []
    async with async_playwright() as p:
        br = await p.chromium.launch(args=ARGS)
        pg = await _open(br, url, scale)
        for f in frames:
            await pg.evaluate("f => window.renderFrame(f)", f)
            await pg.evaluate(WAIT)
            path = os.path.join(sd, f"{name}_{f:05d}.png")
            await pg.screenshot(path=path)
            out.append(path)
        await br.close()
    print("\n".join(out))


def snap(jb, page, frames, scale=1.0):
    asyncio.run(_snap(jb, page, frames, scale))
