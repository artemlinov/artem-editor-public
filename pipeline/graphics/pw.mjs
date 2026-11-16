// pw.mjs: the one way the graphics tools get Playwright and a browser. Playwright is installed in lanes/render
// (npm install there once); the browser is the installed Google Chrome, so no Playwright browser download is needed.
import { createRequire } from "module"; import path from "path"; import { fileURLToPath } from "url";
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
export const { chromium } = require(path.join(here, "..", "..", "lanes", "render", "node_modules", "playwright"));
export const launch = () => chromium.launch({ channel: "chrome", headless: true, args: ["--allow-file-access-from-files", "--disable-web-security", "--font-render-hinting=none"] });
