import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { test, expect, checkA11y, noHorizontalScroll } from "../../opsite/tests/fixtures.js";

const PUBLIC = "https://openpalliative.github.io";
const REPOS = ["", "pal-norms", "pal-devices-data", "pal-directory", "obrashchenie-kit", "home-care-kit"];
const site = resolve(process.env.OP_ALL_SITE || join(process.cwd(), "..", "_site"));
const shotsDir = join(process.cwd(), "_reports", "shots", "all");
const themes = process.env.OP_SHOTS_DARK ? ["light", "dark"] : ["light"];
const checked = new Map();

function sitemap(repo) {
  const file = join(site, repo, "sitemap.xml");
  if (!existsSync(file)) return [];
  return [...readFileSync(file, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(PUBLIC, ""));
}

const pages = REPOS.flatMap((repo) => sitemap(repo).map((path) => ({ repo: repo || "hub", path })));

test("в общей сборке есть все 6 карт сайта", () => {
  for (const repo of REPOS) expect(existsSync(join(site, repo, "sitemap.xml")), `${repo || "хаб"}: sitemap.xml`).toBe(true);
});

for (const p of pages) {
  test(`${p.repo} ${p.path}`, async ({ page, request }, info) => {
    const response = await page.goto(p.path);
    expect(response?.status(), "ответ страницы").toBeLessThan(400);
    await expect(page.locator("html")).toHaveAttribute("lang", /^(ru|en)$/);
    await expect(page.locator("h1")).toHaveCount(1);
    await noHorizontalScroll(page);
    await checkA11y(page);

    const origin = new URL(page.url()).origin;
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.href));
    const broken = [];
    for (const href of new Set(hrefs)) {
      const url = new URL(href);
      if (url.origin !== origin) continue;
      url.hash = "";
      const key = url.toString();
      if (!checked.has(key)) {
        const r = await request.get(key, { maxRedirects: 3 });
        checked.set(key, r.status());
      }
      if (checked.get(key) >= 400) broken.push(`${key} ${checked.get(key)}`);
    }
    expect(broken, "битые ссылки, в том числе в соседние репо").toEqual([]);

    mkdirSync(shotsDir, { recursive: true });
    const slug = `${p.repo}${p.path.replace(/\/+$/, "").replace(/[^a-z0-9]+/gi, "_")}` || "home";
    for (const theme of themes) {
      await page.emulateMedia({ colorScheme: theme });
      await page.screenshot({ path: join(shotsDir, `${info.project.use.browserName}-${info.project.name}-${theme}-${slug}.png`), fullPage: true });
    }
  });
}
