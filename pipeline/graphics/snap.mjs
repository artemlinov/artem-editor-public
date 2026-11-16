// node snap.mjs <out.png> <page.html> t1,t2,... [more page times pairs]  -> one tiled contact image at 480x270 per cell
import os from "os"; import path from "path"; import { execFileSync } from "child_process"; import fs from "fs";
import { launch } from "./pw.mjs";
const [out, ...rest] = process.argv.slice(2); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "snap-"));
const b = await launch();
let k = 0; const files = [];
for (let i = 0; i < rest.length; i += 2) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.25 }); const p = await ctx.newPage();
  p.on("pageerror", e => console.error(rest[i], "pageerror", e.message));
  await p.addInitScript(() => { window.__RENDER = true; window.requestAnimationFrame = () => 0; });
  await p.goto("file://" + path.resolve(rest[i])); await p.waitForFunction(() => window.seek && window.__ready, null, { polling: 100, timeout: 120000 }); await p.evaluate(() => window.__ready);
  const ts = rest[i + 1].split(",").map(Number); let last = 0;
  for (const t of ts) { // stateful pages (spring sims) need monotonic stepping
    await p.evaluate(t => window.seek(t), t); const f = path.join(tmp, `s${String(k++).padStart(3, "0")}.png`); await p.screenshot({ path: f }); files.push(f); }
  await ctx.close();
}
await b.close();
execFileSync("ffmpeg", ["-v", "error", "-y", "-pattern_type", "glob", "-i", path.join(tmp, "s*.png"), "-vf", "pad=488:278:4:4:black,tile=4x" + Math.ceil(files.length / 4), "-frames:v", "1", out]);
console.log(out, files.length);
