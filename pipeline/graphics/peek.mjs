// node peek.mjs <out.jpg> <bg.jpg> <page.html> t1,t2,...  -> frames over a background, tiled 2 per row at 960 wide
import os from "os"; import path from "path"; import { execFileSync } from "child_process"; import fs from "fs";
import { launch } from "./pw.mjs";
const [out, bg, pg, ts] = process.argv.slice(2); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "peek-"));
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
p.on("pageerror", e => console.error("pageerror", e.message)); p.on("console", m => { if (m.type() === "error") console.error("console", m.text()) });
await p.addInitScript(() => { window.__RENDER = true; window.requestAnimationFrame = () => 0; });
await p.goto("file://" + path.resolve(pg)); await p.waitForFunction(() => window.seek && window.__ready, null, { polling: 100, timeout: 120000 }); await p.evaluate(() => window.__ready);
await p.evaluate(u => { document.documentElement.style.background = `url("file://${u}") 0 0/1920px 1080px`; }, path.resolve(bg));
const T = ts.split(",").map(Number); const files = [];
for (const [i, t] of T.entries()) { await p.evaluate(t => window.seek(t), t); const f = path.join(tmp, `p${i}.png`); await p.screenshot({ path: f }); files.push(f); }
await b.close();
const cols = Math.min(2, files.length), rows = Math.ceil(files.length / cols);
const inp = files.flatMap(f => ["-i", f]); const lay = files.map((_, i) => `${(i % cols) * 960}_${Math.floor(i / cols) * 540}`).join("|");
const sc = files.map((_, i) => `[${i}:v]scale=960:540[s${i}]`).join(";"); const lab = files.map((_, i) => `[s${i}]`).join("");
execFileSync("ffmpeg", ["-v", "error", "-y", ...inp, "-filter_complex", files.length > 1 ? `${sc};${lab}xstack=inputs=${files.length}:layout=${lay}:fill=black` : `[0:v]scale=960:540`, "-q:v", "3", out]);
console.log(out);
