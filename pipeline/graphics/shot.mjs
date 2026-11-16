// node shot.mjs <page.html> t1,t2,... <outprefix> [dpr]  -> <outprefix>_<t>.png at 1920x1080*dpr
import os from "os"; import path from "path";
import { launch } from "./pw.mjs";
const [pg, ts, pre, dpr] = process.argv.slice(2);
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: +(dpr || 1) }); const p = await ctx.newPage();
p.on("pageerror", e => console.error("pageerror", e.message));
await p.addInitScript(() => { window.__RENDER = true; window.requestAnimationFrame = () => 0; });
await p.goto("file://" + path.resolve(pg)); await p.waitForFunction(() => window.seek && window.__ready, null, { polling: 100, timeout: 120000 }); await p.evaluate(() => window.__ready);
for (const t of ts.split(",").map(Number)) { await p.evaluate(t => window.seek(t), t); await p.screenshot({ path: `${pre}_${t}.png` }); }
await b.close(); console.log("ok");
