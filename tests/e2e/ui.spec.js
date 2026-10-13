import { test, expect } from "../../opsite/tests/fixtures.js";

test("размер текста и тема сохраняются", async ({ page }, info) => {
  test.skip(info.project.name === "nojs");
  await page.goto("ui/demo/");
  await page.getByText("Вид").first().click();
  await page.locator('label:has(input[value="xl"])').click();
  await page.locator('label:has(input[value="dark"])').click();
  await expect(page.locator("html")).toHaveAttribute("data-size", "xl");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-size", "xl");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("удалить всё стирает настройки и базы", async ({ page }, info) => {
  test.skip(info.project.name === "nojs");
  await page.goto("privacy/");
  await page.evaluate(async () => {
    localStorage.setItem("op:prefs", JSON.stringify({ size: "l" }));
    localStorage.setItem("op:region", "RU-KGD");
    localStorage.setItem("ok:last", "x");
    await new Promise((resolve) => {
      const req = indexedDB.open("op-obrashchenie-kit", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => { req.result.close(); resolve(); };
    });
  });
  await page.getByRole("button", { name: "Удалить всё с этого устройства" }).click();
  await page.getByRole("button", { name: "Да, удалить всё" }).click();
  await expect(page.getByRole("status")).toContainText("удалено");
  const left = await page.evaluate(async () => ({
    keys: Object.keys(localStorage),
    dbs: (await indexedDB.databases()).map((d) => d.name),
  }));
  expect(left.keys).toEqual([]);
  expect(left.dbs.filter((n) => n.startsWith("op-"))).toEqual([]);
});

test("ссылки в тексте подчёркнуты", async ({ page }, info) => {
  test.skip(info.project.name === "nojs");
  await page.goto("about/");
  const decorations = await page.locator("main .op-prose a").evaluateAll((els) =>
    els.map((a) => getComputedStyle(a).textDecorationLine));
  expect(decorations.length).toBeGreaterThan(0);
  for (const d of decorations) expect(d).toContain("underline");
});

test("статус всегда со словом и иконкой", async ({ page }, info) => {
  test.skip(info.project.name === "nojs");
  await page.goto("ui/demo/");
  const statuses = page.locator("#status .op-status:not(.op-status--inline)");
  await expect(statuses).toHaveCount(9);
  for (const s of await statuses.all()) {
    await expect(s.locator("svg.op-icon")).toHaveCount(1);
    await expect(s.locator(".op-status__word")).not.toBeEmpty();
  }
});

test("печать листа A6 даёт отдельную страницу", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("ui/demo/");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".op-header")).toBeHidden();
  await expect(page.locator(".hub-sheet-demo .op-sheet-footer")).toBeVisible();
});

async function openDb(page, name, { closeOnChange = true } = {}) {
  await page.evaluate(({ name, closeOnChange }) => new Promise((resolve) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => {
      window.__db = req.result;
      if (closeOnChange) req.result.onversionchange = () => req.result.close();
      resolve();
    };
  }), { name, closeOnChange });
}

test("«Удалить всё» при второй открытой вкладке", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop");
  const other = await context.newPage();
  await other.goto("tools/");
  await openDb(other, "op-obrashchenie-kit");
  await page.goto("privacy/");
  await page.evaluate(async () => {
    localStorage.setItem("op:prefs", JSON.stringify({ size: "l" }));
    localStorage.setItem("ok:last", "x");
    localStorage.setItem("hc:emergency-save", "1");
    localStorage.setItem("keep:other", "1");
    await caches.open("obrashchenie-kit-test").then((c) => c.put("/x", new Response("x")));
  });
  await page.getByRole("button", { name: "Удалить всё с этого устройства" }).click();
  await page.getByRole("button", { name: "Да, удалить всё" }).click();
  await expect(page.locator(".op-wipe__live")).toContainText("Готово", { timeout: 3000 });
  const left = await page.evaluate(async () => ({
    keys: Object.keys(localStorage),
    dbs: (await indexedDB.databases()).map((d) => d.name).filter((n) => n.startsWith("op-")),
    caches: await caches.keys(),
    regs: (await navigator.serviceWorker.getRegistrations()).length,
  }));
  expect(left).toEqual({ keys: ["keep:other"], dbs: [], caches: [], regs: 0 });
});

test("заблокированное удаление показывает ошибку, а не «Готово»", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop");
  const other = await context.newPage();
  await other.goto("tools/");
  await openDb(other, "op-home-care-kit", { closeOnChange: false });
  await page.goto("privacy/");
  await page.getByRole("button", { name: "Удалить всё с этого устройства" }).click();
  await page.getByRole("button", { name: "Да, удалить всё" }).click();
  const live = page.locator(".op-wipe__live");
  await expect(live).toContainText("Закройте другие вкладки", { timeout: 6000 });
  await expect(live).not.toContainText("Готово");
  await other.evaluate(() => window.__db.close());
});

test("регион: подсказки по столице и сокращению, запомнить и забыть", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("now/");
  const input = page.getByLabel("Регион, город или сокращение");
  await input.fill("Барнаул");
  await expect(page.getByRole("option", { name: "Алтайский край" })).toBeVisible();
  await input.fill("Мск");
  await page.getByRole("option", { name: "Москва", exact: true }).click();
  await expect(page.locator(".op-region__current")).toContainText("Ваш регион: Москва");
  await expect(page.locator("[data-region-link]")).toHaveAttribute("href", "/pal-directory/regions/ru-mow/");
  expect(await page.evaluate(() => localStorage.getItem("op:region"))).toBe("RU-MOW");
  await page.getByRole("button", { name: "забыть" }).click();
  await expect(page.locator(".op-region__prompt")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("op:region"))).toBeNull();
  await page.locator(".op-region__pick summary").click();
  for (const a of await page.locator(".op-region__list a").all()) {
    expect(Math.round((await a.boundingBox()).height)).toBeGreaterThanOrEqual(48);
  }
});

test("на /now/ ссылка в шапке отмечена", async ({ page }, info) => {
  test.skip(info.project.name === "nojs");
  await page.goto("now/");
  await expect(page.locator(".op-header__now")).toHaveAttribute("aria-current", "page");
  await page.goto("");
  await expect(page.locator(".op-header__now")).not.toHaveAttribute("aria-current", "page");
});

test("черновик раскрывается и печатается целиком", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("ui/demo/");
  const first = page.locator(".op-draft").first();
  await expect(first.locator(".op-draft__body")).toBeHidden();
  await first.locator("summary").click();
  await expect(first.locator(".op-draft__body")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(first.locator(".op-draft__print")).toBeVisible();
  await expect(first.locator(".op-draft__print")).toContainText("Не используйте его как готовый документ");
});

test("поле даты: сегодня, несуществующая дата и будущее", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("ui/demo/");
  const fs = page.locator("#demo-date");
  await fs.getByRole("button", { name: "Сегодня" }).click();
  expect(await fs.getByLabel("Год").inputValue()).toMatch(/^\d{4}$/);
  const result = await page.evaluate(async () => {
    const { checkDate3 } = await import(new URL("../../ui/js/date3.js", location.href).href);
    return [checkDate3("31", "2", "2026").error, checkDate3("1", "1", "2999", { max: "today" }).error];
  });
  expect(result[0]).toContain("Такой даты нет");
  expect(result[1]).toContain("позже сегодняшней");
});
