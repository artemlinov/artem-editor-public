// Deterministic frame renderer: node render.mjs <page.html> <out> --dur S [--alpha] [--workers 4] [--from S]
// The page exposes window.__ready (Promise) and window.seek(t) (sync or Promise). 1920x1080 CSS px at DPR 2 = 3840x2160.
import { launch } from "./pw.mjs";
import { spawnSync } from "child_process"; import fs from "fs"; import path from "path"; import os from "os";
const a = process.argv.slice(2); const page_ = path.resolve(a[0]); const out = path.resolve(a[1]);
const opt = k => { const i = a.indexOf("--" + k); return i < 0 ? null : a[i + 1]; };
const DUR = +opt("dur"), ALPHA = a.includes("--alpha"), WORKERS = +(opt("workers") || 4), FPS = 30000 / 1001, SCALE = +(opt("scale") || 2);
const N = Math.round(DUR * FPS); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "egr-"));
const browser = await launch();
const t0 = Date.now();
await Promise.all([...Array(WORKERS).keys()].map(async w => {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
  const p = await ctx.newPage(); p.on("pageerror", e => console.error("pageerror", e.message));
  await p.addInitScript(() => { window.__RENDER = true; window.requestAnimationFrame = () => 0; });
  await p.goto("file://" + page_); await p.waitForFunction(() => window.seek && window.__ready, null, { polling: 100, timeout: 120000 }); await p.evaluate(() => window.__ready);
  for (let i = w; i < N; i += WORKERS) {
    await p.evaluate(t => window.seek(t), i / FPS);
    await p.screenshot({ path: path.join(tmp, `f${String(i).padStart(5, "0")}.png`), omitBackground: ALPHA, type: "png" });
  }
  await ctx.close();
}));
await browser.close();
const args = ["-v", "error", "-y", "-framerate", "30000/1001", "-i", path.join(tmp, "f%05d.png")];
const TAGS = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"];
if (ALPHA) args.push("-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuva444p10le", "-c:v", "prores_ks", "-profile:v", "4", "-alpha_bits", "16", "-vendor", "apl0", ...TAGS);
else args.push("-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "medium", "-movflags", "+faststart", ...TAGS);
args.push(out);
const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (a.includes("--keep")) console.log("frames:", tmp); else fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ out, frames: N, secs: ((Date.now() - t0) / 1000).toFixed(1), ok: r.status === 0 }));
