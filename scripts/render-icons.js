import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = process.cwd();
const brand = join(root, "opsite/ui/brand");
const font = pathToFileURL(join(root, "opsite/ui/fonts/onest-var-cyr-lat.woff2")).href;
const avatar = readFileSync(join(brand, "h-heart-avatar-light.svg"), "utf8");
const mark = readFileSync(join(brand, "h-heart-mark-light.svg"), "utf8");
const mode = process.argv[2] || "icons";

function yamlValue(text, key) {
  const m = text.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : "";
}

function tools() {
  const text = readFileSync(join(root, "opsite/tools.yaml"), "utf8");
  return text.split(/\n\s*-\s+repo:\s*/).slice(1).map((chunk) => {
    const lines = `repo: ${chunk}`;
    return { repo: yamlValue(lines, "repo"), title: yamlValue(lines, "title"), summary: yamlValue(lines, "summary") };
  });
}

function cards() {
  const site = readFileSync(join(root, "site.yaml"), "utf8");
  const hub = { repo: yamlValue(site, "repo"), title: yamlValue(site, "title"), summary: "Бесплатные открытые инструменты для тех, кто ухаживает за тяжелобольным близким" };
  return [hub, ...tools()];
}

function esc(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function cardHtml({ title, summary, repo }, width, height) {
  const markSize = Math.round(height * 0.3);
  const titleSize = title === "openpalliative" ? 76 : 64;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
@font-face { font-family: Onest; src: url("${font}") format("woff2"); font-weight: 100 900; }
html, body { margin: 0; }
body { width: ${width}px; height: ${height}px; background: #F7F4E9; color: #2A2421; font-family: Onest, sans-serif;
  display: grid; grid-template-columns: ${markSize}px 1fr; align-items: center; gap: 56px; padding: 0 88px; box-sizing: border-box; position: relative; }
.mark svg { width: ${markSize}px; height: ${markSize}px; display: block; }
.word { font-weight: 600; font-size: 30px; color: #574D46; margin: 0 0 18px; }
h1 { font-weight: 600; font-size: ${titleSize}px; line-height: 1.1; margin: 0 0 22px; letter-spacing: -0.01em; }
p { font-size: 32px; line-height: 1.35; margin: 0; color: #2A2421; max-width: 18em; }
.repo { position: absolute; left: 88px; bottom: 40px; font-size: 22px; color: #574D46; }
</style></head><body>
<div class="mark">${mark}</div>
<div>${title === "openpalliative" ? "" : '<p class="word">openpalliative</p>'}<h1>${esc(title)}</h1><p>${esc(summary)}</p></div>
<div class="repo">github.com/openpalliative/${esc(repo)}</div>
</body></html>`;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

if (mode === "icons") {
  const jobs = [
    ["apple-touch-icon.png", 180, avatar, 1],
    ["icon-192.png", 192, avatar, 1],
    ["icon-512.png", 512, avatar, 1],
    ["icon-maskable-512.png", 512, avatar, 0.8],
    ["favicon-32.png", 32, mark, 1],
  ];
  for (const [name, size, svg, scale] of jobs) {
    const bg = name.startsWith("favicon") ? "transparent" : "#F2EADD";
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:${bg}"><div style="width:${size}px;height:${size}px;display:grid;place-items:center">${svg.replace("<svg ", `<svg style="width:${size * scale}px;height:${size * scale}px" `)}</div></body></html>`);
    await page.screenshot({ path: join(brand, name), omitBackground: bg === "transparent" });
  }
} else if (mode === "og") {
  const tmp = join(tmpdir(), `op-og-${process.pid}.html`);
  mkdirSync(join(brand, "og"), { recursive: true });
  mkdirSync(join(root, "scripts/repo-template/docs"), { recursive: true });
  for (const card of cards()) {
    for (const [width, height, out] of [
      [1200, 630, join(brand, "og", `${card.repo}.png`)],
      [1280, 640, join(root, "scripts/repo-template/docs", `social-preview-${card.repo}.png`)],
    ]) {
      writeFileSync(tmp, cardHtml(card, width, height), "utf8");
      await page.setViewportSize({ width, height });
      await page.goto(pathToFileURL(tmp).href);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: out, type: "png" });
    }
  }
}
await browser.close();
