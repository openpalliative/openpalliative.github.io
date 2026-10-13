import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "../../opsite/tests/fixtures.js";

const root = process.cwd();
const phone = { width: 360, height: 640 };
const urgent = ["night-pain", "dying"];
const entrypoints = (repo) => JSON.parse(readFileSync(join(root, "vendor", repo, "v1", "entrypoints.json"), "utf8")).items;
const regionLines = (iso) => JSON.parse(readFileSync(join(root, "_site", "region-lines", `${iso.toLowerCase()}.json`), "utf8"));

const withRegion = (page, iso) => page.addInitScript((v) => {
  try { localStorage.setItem("op:region", v); } catch {}
}, iso);

const js = (info) => info.project.name !== "nojs";

test.describe("главная на телефоне", () => {
  for (const scheme of ["light", "dark"]) {
    test(`первый экран 360x640, ${scheme}`, async ({ page }, info) => {
      test.skip(!js(info));
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize(phone);
      await page.goto("");
      for (const n of ["112", "103"]) {
        const box = await page.locator(`main .op-now a[href="tel:${n}"]`).boundingBox();
        expect(Math.round(box.height)).toBeGreaterThanOrEqual(48);
        expect(box.y + box.height).toBeLessThanOrEqual(640);
      }
      await expect(page.locator("main h1")).toHaveText("Что случилось?");
      const lead = await page.locator(".hub-home__lead").evaluate((p) =>
        Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)));
      expect(lead).toBeLessThanOrEqual(2);
      const rows = page.locator(".hub-home .op-row");
      const third = await rows.nth(2).boundingBox();
      expect(third.y + third.height).toBeLessThanOrEqual(640);
    });
  }

  test("с выбранным регионом строка «Ваш регион» и три ситуации в первом экране", async ({ page }, info) => {
    test.skip(!js(info));
    await withRegion(page, "RU-KGD");
    await page.setViewportSize(phone);
    await page.goto("");
    const current = page.locator(".hub-home .op-region__current");
    await expect(current).toContainText("Ваш регион: Калининградская область");
    await expect(current.getByRole("button", { name: "изменить" })).toBeVisible();
    const third = await page.locator(".hub-home .op-row").nth(2).boundingBox();
    expect(third.y + third.height).toBeLessThanOrEqual(640);
    const region = await current.boundingBox();
    expect(region.y).toBeLessThan(third.y);
  });

  test("ссылки о проекте не повторяются в блоке и подвале", async ({ page }) => {
    await page.goto("");
    for (const path of ["principles/", "about/", "help-us/", "en/"]) {
      await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(0);
      await expect(page.locator(`footer a[href="${path}"]`)).toHaveCount(1);
    }
  });
});

test.describe("срочные ситуации", () => {
  for (const id of urgent) {
    test(`${id}: 112 и 103 вверху страницы`, async ({ page }, info) => {
      test.skip(!js(info));
      await page.setViewportSize(phone);
      await page.goto(`s/${id}/`);
      const first = await page.locator('main a[href^="tel:"]').first().boundingBox();
      expect(first.y).toBeLessThan(640);
      await expect(page.locator("main .op-now")).toHaveCount(1);
      await expect(page.locator("main")).not.toContainText("Номера экстренных служб");
      const order = await page.evaluate(() => {
        const now = document.querySelector("main .op-now");
        const block = document.querySelector(".hub-sit__block");
        const region = document.querySelector(".hub-region");
        const pos = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        return { beforeBlock: pos(now, block), beforeRegion: region ? pos(now, region) : true };
      });
      expect(order).toEqual({ beforeBlock: true, beforeRegion: true });
    });
  }

  test("у остальных ситуаций номера внизу", async ({ page }) => {
    await page.goto("s/discharge/");
    const after = await page.evaluate(() => {
      const now = document.querySelector("main .op-now");
      const last = [...document.querySelectorAll(".hub-sit__block")].pop();
      return Boolean(last.compareDocumentPosition(now) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(after).toBe(true);
  });
});

test.describe("номера региона", () => {
  test("без региона просим выбрать", async ({ page }, info) => {
    test.skip(!js(info));
    await page.goto("s/night-pain/");
    await expect(page.locator(".hub-region .op-region__prompt")).toHaveText(/Выберите регион, и мы покажем номера рядом с вами/);
    await expect(page.locator(".hub-region .op-line")).toHaveCount(0);
  });

  test("RU-KGD на /s/night-pain/: строки ролей, федеральные номера и ссылка на карточку", async ({ page }, info) => {
    test.skip(!js(info));
    await withRegion(page, "RU-KGD");
    await page.goto("s/night-pain/");
    const box = page.locator(".hub-region");
    await expect(box.locator("[data-region-link]")).toHaveAttribute("href", "/pal-directory/regions/ru-kgd/");
    const data = regionLines("RU-KGD");
    const roles = ["pain", "pmp", "general"];
    const want = data.lines.filter((l) => l.roles.some((r) => roles.includes(r)));
    const more = want.length ? "Все номера региона" : "Номера: Калининградская область";
    await expect(box.getByRole("link", { name: more })).toHaveAttribute("href", "/pal-directory/regions/ru-kgd/");
    await expect(box.locator(".op-region__lines > .op-lines > .op-line")).toHaveCount(want.length);
    if (!want.some((l) => l.verified)) {
      await expect(box.locator(".hub-federal__lead")).toHaveText("По вашему региону проверенных номеров пока нет. Звоните на номера вверху страницы, они работают по всей стране");
      await expect(page.locator('main a[href="tel:112"]')).toHaveCount(1);
    }
    if (want.length > 1) {
      await expect(box.locator(".hub-source")).toHaveCount(1);
      await expect(box.locator(".hub-source")).toContainText("Источник: Росздравнадзор");
      await expect(box.locator(".op-lines .op-line__meta", { hasText: "Росздравнадзор" })).toHaveCount(0);
    }
    const unverified = box.locator(".op-region__lines > .op-lines > .op-line:not(.op-line--verified)").first();
    if (await unverified.count()) await expect(unverified.locator(".op-status--unverified")).toContainText("Не проверено");
  });

  test("RU-KGD на /s/discharge/: номера по всей стране прямо в блоке региона", async ({ page }, info) => {
    test.skip(!js(info));
    await withRegion(page, "RU-KGD");
    await page.goto("s/discharge/");
    const box = page.locator(".hub-region");
    const data = regionLines("RU-KGD");
    const want = data.lines.filter((l) => l.roles.some((r) => ["pmp", "general"].includes(r)));
    test.skip(want.some((l) => l.verified));
    await expect(box.locator(".hub-federal__lead")).toHaveText("По вашему региону проверенных номеров пока нет. Звоните на номера, которые работают по всей стране:");
    await expect(box.locator('.hub-federal a[href="tel:112"]')).toHaveCount(1);
    await expect(box.locator('.hub-federal a[href="tel:103"]')).toHaveCount(1);
  });

  test("регион без строк нужных ролей: ссылка на карточку и номера по всей стране", async ({ page }, info) => {
    test.skip(!js(info));
    await withRegion(page, "RU-KGD");
    await page.route("**/region-lines/ru-kgd.json", (route) => route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ region: "RU-KGD", name: "Калининградская область", data_date: "2026-10-11", lines: [] }),
    }));
    await page.goto("s/night-pain/");
    const lines = page.locator(".hub-region .op-region__lines");
    await expect(lines.getByRole("link")).toHaveAttribute("href", "/pal-directory/regions/ru-kgd/");
    await expect(lines.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(lines.locator(".hub-federal__lead")).toHaveText("По вашему региону проверенных номеров пока нет. Звоните на номера вверху страницы, они работают по всей стране");
    await page.goto("s/discharge/");
    await expect(lines.getByRole("link", { name: "Номера: Калининградская область" })).toHaveAttribute("href", "/pal-directory/regions/ru-kgd/");
    await expect(lines.locator('.hub-federal a[href="tel:112"]')).toHaveCount(1);
    await expect(lines.locator('.hub-federal a[href="tel:103"]')).toHaveCount(1);
  });

  test("без JS остаётся список регионов ссылками @nojs", async ({ page }, info) => {
    test.skip(info.project.name !== "nojs");
    await page.goto("s/night-pain/");
    const links = page.locator(".hub-region .op-region__list a");
    expect(await links.count()).toBeGreaterThan(80);
    await expect(links.first()).toHaveAttribute("href", /^\/pal-directory\/regions\/ru-[a-z]+\/$/);
  });

  test("выбрать, изменить и забыть регион", async ({ page }, info) => {
    test.skip(!js(info));
    await page.goto("s/discharge/");
    const box = page.locator(".hub-region");
    const input = box.getByLabel("Регион, город или сокращение");
    await input.fill("Калининград");
    await box.getByRole("option", { name: "Калининградская область" }).click();
    await expect(box.locator(".op-region__current")).toContainText("Калининградская область");
    expect(await page.evaluate(() => localStorage.getItem("op:region"))).toBe("RU-KGD");
    await box.getByRole("button", { name: "изменить" }).click();
    await expect(input).toBeVisible();
    await input.fill("Мск");
    await box.getByRole("option", { name: "Москва", exact: true }).click();
    await expect(box.locator("[data-region-link]")).toHaveAttribute("href", "/pal-directory/regions/ru-mow/");
    await page.goto("");
    await expect(page.locator(".hub-home .op-region__current")).toContainText("Москва");
    await page.goto("s/discharge/");
    await box.getByRole("button", { name: "забыть" }).click();
    await expect(box.locator(".op-region__prompt")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("op:region"))).toBeNull();
  });
});

test.describe("карточки шагов", () => {
  for (const id of ["discharge", "night-pain"]) {
    test(`${id}: карточки не выше 140px на 360`, async ({ page }, info) => {
      test.skip(!js(info));
      await page.setViewportSize(phone);
      await page.goto(`s/${id}/`);
      const heights = await page.locator(".hub-step").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
      expect(heights.length).toBeGreaterThan(2);
      for (const h of heights) expect(h).toBeLessThanOrEqual(140);
    });
  }

  test("клик по карточке ведёт по её ссылке", async ({ page }, info) => {
    test.skip(!js(info));
    await page.goto("s/night-pain/");
    const card = page.locator(".hub-step").first();
    const href = await card.locator(".op-card__title a").getAttribute("href");
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.click(box.x + box.width - 12, box.y + box.height - 8);
    await page.waitForURL((u) => u.pathname === href.split("#")[0]);
  });

  test("подписи шагов целиком и без «openpalliative»", async ({ page }) => {
    await page.goto("s/refused/");
    await expect(page.locator(".hub-step").filter({ hasText: "Жалобу переслали тому, на кого вы жалуетесь" })).toHaveCount(1);
    await expect(page.locator(".hub-step__meta")).not.toContainText(["openpalliative"]);
  });
});

test.describe("/now/", () => {
  test("заголовок один раз, регион выше источников, цитата дословно", async ({ page }, info) => {
    test.skip(!js(info));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("now/");
    const times = await page.locator("main").evaluate((m) => m.textContent.split("Если помощь нужна прямо сейчас").length - 1);
    expect(times).toBe(1);
    const region = await page.locator("#hub-region-title").boundingBox();
    expect(region.y).toBeLessThan(1300);
    const order = await page.evaluate(() => Boolean(document.querySelector("#hub-region-title")
      .compareDocumentPosition(document.querySelector("#sources")) & Node.DOCUMENT_POSITION_FOLLOWING));
    expect(order).toBe(true);
    const sources = page.locator("details#sources");
    await expect(sources).not.toHaveAttribute("open", "");
    await page.locator("main .op-now__checked a").click();
    await expect(sources).toHaveAttribute("open", "");
    const quote = sources.locator("blockquote[data-verbatim]");
    await expect(quote).toContainText("единый номер «112»");
    await expect(quote).toContainText("«103»");
    await expect(sources.locator('a[href="http://publication.pravo.gov.ru/document/0001202205300035"]')).toHaveAttribute("title", /0001202205300035/);
    await expect(page.locator("nav.op-crumbs")).toContainText("Помощь прямо сейчас");
  });

  test("без JS источники раскрыты @nojs", async ({ page }, info) => {
    test.skip(info.project.name !== "nojs");
    await page.goto("now/");
    await expect(page.locator("details#sources")).toHaveAttribute("open", "");
  });

  test("печать: дата сверки и адрес, без выбора региона", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("now/");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".op-print-url")).toContainText("https://openpalliative.github.io/now/");
    await expect(page.locator("main .op-now__checked")).toContainText("сверены с источником");
    await expect(page.locator(".hub-region")).toBeHidden();
  });
});

test.describe("прочие страницы", () => {
  test("/tools/: у каждого инструмента все входы ссылками", async ({ page }) => {
    await page.goto("tools/");
    for (const repo of ["obrashchenie-kit", "home-care-kit", "pal-devices-data", "pal-directory", "pal-norms"]) {
      const eps = entrypoints(repo);
      const links = page.locator(`[data-repo="${repo}"] .hub-eps > li > a`);
      await expect(links).toHaveCount(eps.length);
      for (const e of eps) await expect(page.locator(`[data-repo="${repo}"] .hub-eps a[href="/${repo}/${e.path}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-repo="pal-directory"]')).toContainText("пример одного региона");
  });

  test("/orgs/: ссылки на страницы данных", async ({ page }) => {
    await page.goto("orgs/");
    for (const repo of ["obrashchenie-kit", "home-care-kit", "pal-devices-data", "pal-directory", "pal-norms"]) {
      await expect(page.locator(`main a[href="/${repo}/data/"]`)).toHaveCount(1);
    }
    await expect(page.locator("main")).not.toContainText("index.json");
  });

  test("/privacy/: копии файлом перед удалением", async ({ page }, info) => {
    test.skip(!js(info));
    await page.goto("privacy/");
    for (const href of ["/obrashchenie-kit/case/", "/home-care-kit/saved/"]) {
      const link = page.locator(`main a[href="${href}"]`);
      await expect(link).toContainText("Сохранить копию");
      const before = await page.evaluate((h) => Boolean(document.querySelector(`main a[href="${h}"]`)
        .compareDocumentPosition(document.querySelector("op-wipe")) & Node.DOCUMENT_POSITION_FOLLOWING), href);
      expect(before).toBe(true);
    }
  });

  test("404 по вложенному пути со стилями", async ({ page }) => {
    const res = await page.goto("s/nope/deeper/");
    expect(res.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("Такой страницы нет");
    const font = await page.locator("body").evaluate((b) => getComputedStyle(b).fontFamily);
    expect(font).toContain("Onest");
    await expect(page.locator("main a[href='/s/night-pain/']")).toHaveCount(1);
  });

  test("/en/: язык и пары hreflang", async ({ page }) => {
    await page.goto("en/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveCount(1);
    for (const repo of ["obrashchenie-kit", "home-care-kit", "pal-devices-data", "pal-directory", "pal-norms"]) {
      await expect(page.locator(`main a[href="/${repo}/"]`)).toHaveCount(1);
      await expect(page.locator(`main a[href="https://github.com/openpalliative/${repo}"]`)).toHaveCount(1);
    }
  });

  test("/ui/demo/: витрина подписана и закрыта от поиска", async ({ page }) => {
    await page.goto("ui/demo/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
    await expect(page.locator("main")).toContainText("Витрина компонентов для разработчиков, формы не работают");
  });

  for (const path of ["now/", "tools/", "orgs/", "sources/", "principles/", "privacy/", "about/", "help-us/", "s/discharge/"]) {
    test(`крошки на ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main nav.op-crumbs a").first()).toHaveAttribute("href", "../".repeat(path.split("/").length - 1));
    });
  }
});
