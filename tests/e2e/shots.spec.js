import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "../../opsite/tests/fixtures.js";

const dir = join(process.cwd(), "_reports", "shots", "openpalliative.github.io");
const widths = [[360, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]];
const targets = [
  ["home", ""],
  ["now", "now/"],
  ["now-region", "now/", "RU-MOW"],
  ["s-night-pain", "s/night-pain/"],
  ["s-discharge", "s/discharge/"],
  ["s-discharge-region", "s/discharge/", "RU-KGD"],
  ["s-night-pain-region", "s/night-pain/", "RU-KGD"],
  ["home-region", "", "RU-KGD"],
  ["tools", "tools/"],
  ["orgs", "orgs/"],
  ["sources", "sources/"],
  ["privacy", "privacy/"],
  ["about", "about/"],
  ["principles", "principles/"],
  ["help-us", "help-us/"],
  ["en", "en/"],
  ["demo", "ui/demo/"],
  ["404", "s/nope/deeper/"],
];

const prefix = (info) => (info.project.name === "desktop" ? "" : `${info.project.name}-`);

async function open(page, path, { region, size } = {}) {
  await page.addInitScript(({ region, size }) => {
    try {
      if (region) localStorage.setItem("op:region", region);
      if (size) localStorage.setItem("op:prefs", JSON.stringify({ size }));
    } catch {}
  }, { region, size });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

for (const [name, path, region] of targets) {
  test(`скриншоты ${name} @shots`, async ({ page }, info) => {
    test.skip(["nojs", "mobile"].includes(info.project.name));
    mkdirSync(dir, { recursive: true });
    await open(page, path, { region });
    for (const [w, h] of widths) {
      await page.setViewportSize({ width: w, height: h });
      for (const theme of ["light", "dark"]) {
        await page.emulateMedia({ colorScheme: theme, media: "screen" });
        await page.waitForTimeout(60);
        await page.screenshot({ path: join(dir, `${prefix(info)}${name}-${w}-${theme}.png`), fullPage: true });
      }
    }
  });
}

for (const [name, path] of [["home", ""], ["now", "now/"], ["s-night-pain", "s/night-pain/"], ["tools", "tools/"]]) {
  test(`скриншоты ${name} A++ на телефоне @shots`, async ({ page }, info) => {
    test.skip(["nojs", "mobile"].includes(info.project.name));
    mkdirSync(dir, { recursive: true });
    await page.setViewportSize({ width: 360, height: 640 });
    await open(page, path, { size: "xl" });
    for (const theme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme: theme, media: "screen" });
      await page.screenshot({ path: join(dir, `${prefix(info)}${name}-360-xl-${theme}.png`), fullPage: true });
    }
  });
}

for (const [name, path] of [["now", "now/"], ["s-night-pain", "s/night-pain/"]]) {
  test(`печать ${name} @shots`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    mkdirSync(dir, { recursive: true });
    await open(page, path, { region: "RU-KGD" });
    await page.emulateMedia({ colorScheme: "dark", media: "print" });
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.screenshot({ path: join(dir, `${name}-print.png`), fullPage: true });
    await page.pdf({ path: join(dir, `${name}-print.pdf`), format: "A4", preferCSSPageSize: true });
  });
}
