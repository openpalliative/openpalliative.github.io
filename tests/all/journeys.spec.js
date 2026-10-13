import { test, expect } from "../../opsite/tests/fixtures.js";

const TZ = "Europe/Moscow";

function isoShift(days) {
  const [y, m, d] = new Date().toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86400000).toISOString().slice(0, 10);
}

async function go(page, path) {
  const r = await page.goto(path);
  expect(r?.status(), path).toBeLessThan(400);
}

async function follow(page, href) {
  const links = page.locator(`main a[href="${href}"]`);
  expect(await links.count(), `ссылка ${href} на ${page.url()}`).toBeGreaterThan(0);
  const visible = links.filter({ visible: true });
  const want = new URL(href, page.url());
  if (await visible.count()) {
    await Promise.all([page.waitForURL((u) => u.pathname === want.pathname), visible.first().click()]);
  } else {
    await go(page, want.toString());
  }
  await expect(page.locator("h1")).toHaveCount(1);
}

async function answerDevice(page) {
  if (!/\/home-care-kit\//.test(page.url())) return;
  const no = page.locator('[data-hc-ask]:not([hidden]) [data-hc-ask-answer="no"]');
  if (await no.isVisible()) await no.click();
}

const IDEAS = [
  [1, "Чек-лист выписки", "/s/discharge/", "/home-care-kit/discharge/#back=discharge"],
  [2, "Трекер дела", "/s/refused/", "/obrashchenie-kit/case/#new=1&s=oral-refusal&back=refused"],
  [3, "Изделия и кто выдаёт", "/s/device/", "/pal-devices-data/#back=device"],
  [4, "Карта на ночь и праздники", "/s/night-pain/", "/home-care-kit/night/#back=night-pain"],
  [5, "Нормы и сроки", "/s/refused/", "/pal-norms/deadlines/#back=refused"],
  [6, "Лист для скорой", "/s/emergency-sheet/", "/home-care-kit/emergency/#back=emergency-sheet"],
  [7, "Что даёт заключение", "/s/conclusion/", "/pal-norms/indications/#back=conclusion"],
  [8, "Переход в 18 лет", "/s/turning-18/", "/obrashchenie-kit/turning-18/#back=turning-18"],
  [9, "Что подписать заранее", "/s/prepare/", "/home-care-kit/ahead/#back=prepare"],
  [10, "Куда звонить в регионе", "/s/who-to-call/", "/pal-directory/#back=who-to-call"],
];

for (const [n, name, entry, target] of IDEAS) {
  test(`идея ${n} «${name}» с главной за 2 клика`, async ({ page }) => {
    await go(page, "/");
    await follow(page, entry.slice(1));
    await follow(page, target);
    expect(new URL(page.url()).pathname).toBe(target.split("#")[0]);
  });
}

test("идея 10: карточка региона с главной за 1 клик", async ({ page }) => {
  await go(page, "/");
  await follow(page, "/pal-directory/regions/ru-mow/");
  await expect(page.locator("h1")).toContainText("Москва");
});

test("хаб: у каждой ситуации ссылки в инструменты с #back ведут обратно", async ({ page }) => {
  await go(page, "/");
  const situations = await page.$$eval('main a[href^="s/"]', (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  expect(situations.length).toBe(10);
  for (const s of situations) {
    const id = s.split("/")[1];
    await go(page, `/${s}`);
    const hrefs = await page.$$eval(`main a[href*="#back=${id}"]`, (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
    expect(hrefs.length, s).toBeGreaterThan(0);
    for (const href of hrefs) {
      await go(page, href);
      await answerDevice(page);
      const back = page.locator(`a[href$="/s/${id}/"]`, { hasText: "Вернуться" });
      await expect(back.first(), href).toBeVisible();
      await expect.poll(() => new URL(page.url()).hash, href).not.toContain("back=");
    }
  }
});

test.describe("сквозные переходы с параметрами", () => {
  test("изделие: не выдают, дело с кодом изделия", async ({ page }) => {
    await go(page, "/pal-devices-data/devices/303260/");
    await follow(page, "/obrashchenie-kit/case/#new=1&s=oral-refusal&device=303260");
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    await expect(page.locator("input[name=scenario][value=oral-refusal]")).toBeChecked();
    await page.locator("input[name=role][value=self]").check();
    await page.getByRole("button", { name: "Дальше" }).click();
    await page.selectOption("#ok-region", "RU-KGD");
    await page.getByRole("button", { name: "Дальше" }).click();
    await page.locator("[data-for]:not([hidden]) [data-quick='0']").first().click();
    await page.getByRole("button", { name: /Готово/ }).click();
    const code = page.locator("[data-caseline] a", { hasText: "изделие с кодом 303260" });
    await expect(code).toHaveAttribute("href", /\/pal-devices-data\/devices\/303260\/$/);
    await Promise.all([page.waitForURL(/\/pal-devices-data\/devices\/303260\/$/), code.click()]);
  });

  test("изделие: чек-лист выписки, сроки и основание в нормах", async ({ page }) => {
    for (const href of ["/home-care-kit/discharge/", "/pal-norms/deadlines/505n-transfer/", "/pal-norms/acts/505n/"]) {
      await go(page, "/pal-devices-data/devices/303260/");
      await follow(page, href);
    }
  });

  test("нормы: срок прошёл, жалоба с правилом и датой", async ({ page }) => {
    const from = isoShift(-45);
    await go(page, `/pal-norms/deadlines/#rule=59fz-answer&from=${from}`);
    const href = `/obrashchenie-kit/case/#new=1&s=no-answer&rule=59fz-answer&from=${from}`;
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    await follow(page, href);
    await expect(page.locator("[data-wizard-count]")).toHaveText("Шаг 2 из 4");
    await expect.poll(() => new URL(page.url()).hash).toBe("");
  });

  test("регион: номера в карту на ночь", async ({ page }) => {
    await go(page, "/pal-directory/regions/ru-mow/");
    await follow(page, "/home-care-kit/night/#region=RU-MOW");
    await answerDevice(page);
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    expect(await page.evaluate(() => localStorage.getItem("op:region"))).toBe("RU-MOW");
    await expect(page.locator("#hc-region")).toHaveValue("RU-MOW");
  });

  test("регион: написать сюда, регион выбран в деле", async ({ page }) => {
    await go(page, "/pal-directory/regions/ru-mow/");
    await follow(page, "/obrashchenie-kit/case/#new=1&region=RU-MOW");
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    await expect(page.locator("#ok-region")).toHaveValue("RU-MOW");
  });

  test("регион: адрес в соседний справочник по #region", async ({ page }) => {
    await go(page, "/pal-directory/#region=RU-KGD");
    await expect(page).toHaveURL(/\/pal-directory\/regions\/ru-kgd\/$/);
  });

  test("заключение: показания дословно и обратно к листу", async ({ page }) => {
    await go(page, "/home-care-kit/conclusion/");
    const stub = page.locator("[data-hc-ind-link]");
    if (await stub.count()) {
      await expect(stub.locator("a")).toHaveAttribute("href", /publication\.pravo\.gov\.ru\/document\/\d+/);
    } else {
      await follow(page, "/pal-norms/indications/");
      await follow(page, "/home-care-kit/conclusion/");
    }
    await go(page, "/pal-norms/indications/");
    await follow(page, "/obrashchenie-kit/scenarios/vk-refused/");
  });

  test("заключение: не пришло, дело об устном отказе", async ({ page }) => {
    await go(page, "/home-care-kit/conclusion/");
    await follow(page, "/obrashchenie-kit/case/#new=1&s=oral-refusal&back=conclusion");
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    await expect(page.locator("input[name=scenario][value=oral-refusal]")).toBeChecked();
    await expect(page.locator('a[href$="/s/conclusion/"]', { hasText: "Вернуться" }).first()).toBeVisible();
  });

  test("18 лет, выписка, лист для скорой: переходы в листы и изделия", async ({ page }) => {
    for (const [from, to] of [
      ["/obrashchenie-kit/turning-18/", "/home-care-kit/ahead/"],
      ["/obrashchenie-kit/turning-18/", "/pal-devices-data/"],
      ["/obrashchenie-kit/scenarios/discharge/", "/home-care-kit/discharge/"],
      ["/home-care-kit/emergency/", "../night/"],
    ]) {
      await go(page, from);
      await follow(page, to);
    }
  });

  test("отказ по изделию из сценария в нормы и обратно в дело", async ({ page }) => {
    await go(page, "/pal-norms/escalation/");
    await follow(page, "/obrashchenie-kit/scenarios/no-answer/");
    await go(page, "/pal-norms/escalation/");
    await follow(page, "/obrashchenie-kit/case/");
  });
});
