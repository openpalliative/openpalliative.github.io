import { chromium } from "@playwright/test";

const base = (process.argv[2] || "https://openpalliative.github.io").replace(/\/+$/, "");
const roots = ["/", "/now/", "/pal-norms/", "/pal-devices-data/", "/pal-directory/", "/obrashchenie-kit/", "/home-care-kit/"];
const problems = [];

async function status(path) {
  const r = await fetch(base + path, { redirect: "follow" });
  return { code: r.status, text: await r.text() };
}

const robots = await status("/robots.txt");
if (robots.code !== 200 || !robots.text.includes("Sitemap:")) problems.push(`/robots.txt: ${robots.code}`);
for (const path of ["/sitemap.xml", ...roots.slice(2).map((r) => `${r}sitemap.xml`)]) {
  const r = await status(path);
  if (r.code !== 200 || !r.text.includes("<urlset")) problems.push(`${path}: ${r.code}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const origin = new URL(base).origin;
for (const path of [...roots, "/pal-norms/no-such-page/deeper/"]) {
  const external = [];
  const failed = [];
  const onRequest = (req) => {
    const url = req.url();
    if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
  };
  const onResponse = (res) => {
    if (res.status() >= 400 && res.url() !== base + path) failed.push(`${res.status()} ${res.url()}`);
  };
  page.on("request", onRequest);
  page.on("response", onResponse);
  const res = await page.goto(base + path, { waitUntil: "networkidle" });
  page.off("request", onRequest);
  page.off("response", onResponse);
  const want = path.includes("no-such-page") ? 404 : 200;
  if (res?.status() !== want) problems.push(`${path}: ответ ${res?.status()}, ждали ${want}`);
  const styled = await page.evaluate(() => [...document.styleSheets].some((s) => {
    try { return s.cssRules.length > 0; } catch { return false; }
  }));
  if (!styled) problems.push(`${path}: стили не загрузились`);
  if (external.length) problems.push(`${path}: запросы наружу ${external.join(", ")}`);
  if (failed.length) problems.push(`${path}: ${failed.join(", ")}`);
}
await browser.close();

if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log(`${base}: robots, sitemap, 404 и ${roots.length} страниц без запросов наружу`);
