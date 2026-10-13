import { test, expect, pdfPages } from "../../opsite/tests/fixtures.js";

const TZ = "Europe/Moscow";

function isoShift(days) {
  const [y, m, d] = new Date().toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86400000).toISOString().slice(0, 10);
}

async function fromHub(page, situation, href) {
  const r = await page.goto("/");
  expect(r?.status()).toBeLessThan(400);
  await Promise.all([page.waitForURL((u) => u.pathname === `/s/${situation}/`), page.locator(`main a[href="s/${situation}/"]`).first().click()]);
  const link = page.locator(`main a[href="${href}"]`).filter({ visible: true }).first();
  const path = href.split("#")[0];
  await Promise.all([page.waitForURL((u) => u.pathname === path), link.click()]);
  await expect(page.locator("h1")).toHaveCount(1);
}

async function noDeviceSave(page) {
  const no = page.locator('[data-hc-ask]:not([hidden]) [data-hc-ask-answer="no"]');
  if (await no.isVisible()) await no.click();
}

async function gotoStep(page, id) {
  await page.locator(`.op-steps a.op-steps__step[href="#hc-step-${id}"]`).click();
  await expect(page.locator(`[data-hc-step="${id}"]`)).toBeVisible();
}

async function fillField(page, id, value) {
  await page.locator("hc-sheet[data-ready]").waitFor({ state: "attached" });
  const input = page.locator(`[data-hc-field="${id}"]`);
  if (!(await input.isVisible())) {
    const where = await input.evaluate((i) => ({
      step: i.closest("[data-hc-step]")?.dataset.hcStep,
      part: i.closest("fieldset.hc-group")?.dataset.title,
    }));
    if (where.step && !(await page.locator(`[data-hc-step="${where.step}"]`).isVisible())) await gotoStep(page, where.step);
    if (where.part && !(await input.isVisible())) {
      await page.locator("[data-hc-sub] summary").click();
      await page.locator("[data-hc-sub-list]").getByRole("button", { name: where.part, exact: true }).click();
    }
  }
  await input.fill(value);
  await expect(input).toHaveValue(value);
}

async function fillDate3(scope, iso) {
  const [y, m, d] = iso.split("-");
  await scope.locator("[data-part=d]").fill(String(Number(d)));
  await scope.locator("[data-part=m]").selectOption(String(Number(m)));
  await scope.locator("[data-part=y]").fill(y);
}

test("1. выписка: с главной до листа «до того, как забрать домой» на печать", async ({ page }) => {
  await fromHub(page, "discharge", "/home-care-kit/discharge/#back=discharge");
  await page.getByLabel("Да, есть").check();
  await expect(page.locator('[data-hc-branch="has-vk"]').first()).toBeVisible();
  await expect(page.locator('[data-hc-branch="no-vk"]').first()).toBeHidden();
  const n = await pdfPages(page);
  expect(n).toBeGreaterThanOrEqual(1);
  expect(n).toBeLessThanOrEqual(2);
});

test("2. трекер дела: с главной до дела со сроком и готового документа", async ({ page }) => {
  await fromHub(page, "refused", "/obrashchenie-kit/case/#new=1&s=oral-refusal&back=refused");
  await expect(page.locator("input[name=scenario][value=oral-refusal]")).toBeChecked();
  await page.locator("input[name=role][value=self]").check();
  await page.getByRole("button", { name: "Дальше" }).click();
  await page.selectOption("#ok-region", "RU-KGD");
  await page.getByRole("button", { name: "Дальше" }).click();
  await page.locator("[data-for]:not([hidden]) [data-quick='0']").first().click();
  await page.getByRole("button", { name: /Готово/ }).click();
  const view = page.locator("[data-view=case]");
  await expect(view).toBeVisible();
  const doc = view.locator('a[href*="docs/"]').filter({ visible: true }).first();
  await expect(doc).toBeVisible();
  await doc.click();
  await expect(page.locator(".op-steps__count")).toHaveText("Шаг 1 из 3");
  await page.locator(".ok-step[data-step='1']").waitFor();
  const wraps = page.locator(".ok-step[data-step='1'] [data-field]:visible");
  for (let i = 0; i < (await wraps.count()); i++) {
    const w = wraps.nth(i);
    const type = await w.getAttribute("data-type");
    const id = await w.getAttribute("data-field");
    if (type === "date") {
      if (id !== "signed_at") await fillDate3(w.locator("[data-date3]"), isoShift(-3));
    } else if (type === "select") {
      await w.locator("select").selectOption({ index: 1 });
    } else {
      const input = w.locator("input, textarea").first();
      if (!(await input.inputValue())) await input.fill(`Пример ${id}`);
    }
  }
  await page.getByRole("button", { name: /Дальше: проверить/ }).click();
  await expect(page.locator("[data-preview] .ok-sheet")).toBeVisible();
  await page.getByRole("button", { name: "Всё верно" }).click();
  await expect(page.locator("[data-ready]")).toContainText("Документ готов");
});

test("3. изделия: с главной до карточки изделия и «Кто выдаёт»", async ({ page }) => {
  await fromHub(page, "device", "/pal-devices-data/#back=device");
  const field = page.getByLabel("Как вы это называете?");
  await field.fill("откашливатель");
  await field.press("Enter");
  const first = page.locator(".dv-result").first();
  await expect(first).toContainText("303260");
  await first.locator("a").first().click();
  await expect(page).toHaveURL(/\/pal-devices-data\/devices\/303260\/$/);
  await expect(page.locator(".dv-who__answer")).toContainText("Выдаёт");
});

test("4. карта на ночь: с главной до заполненного листа на 2 страницы", async ({ page }) => {
  await fromHub(page, "night-pain", "/home-care-kit/night/#back=night-pain");
  await noDeviceSave(page);
  await fillField(page, "hospice_phone", "+7 000 000-00-11");
  await fillField(page, "address", "ул. Садовая, д. 1");
  await gotoStep(page, "check");
  for (const box of await page.locator("[data-hc-verify] input").all()) await box.check();
  await page.getByRole("button", { name: "Номера проверены" }).click();
  await expect(page.locator("[data-hc-validity]")).toContainText("Данные верны до");
  expect(await pdfPages(page)).toBe(2);
});

test("5. нормы и сроки: с главной до посчитанной даты ответа", async ({ page }) => {
  await fromHub(page, "refused", "/pal-norms/deadlines/#back=refused");
  const radio = page.locator('input[name="rule"]').first();
  if (!(await radio.isVisible())) await radio.locator("xpath=ancestor::details[1]/summary").click();
  await radio.check();
  const [y, m, d] = isoShift(-5).split("-");
  await page.locator("#pn-date-d").fill(String(Number(d)));
  await page.locator("#pn-date-m").selectOption(String(Number(m)));
  await page.locator("#pn-date-y").fill(y);
  await page.getByRole("button", { name: "Посчитать" }).click();
  await expect(page.locator(".pn-res__date")).toBeVisible();
  await expect(page.locator(".pn-res__formula")).not.toBeEmpty();
  await expect(page.locator(".pn-res__steps li").first()).toBeVisible();
});

test("6. лист для скорой: с главной до листа с кодом на 1 страницу", async ({ page }) => {
  await fromHub(page, "emergency-sheet", "/home-care-kit/emergency/#back=emergency-sheet");
  await noDeviceSave(page);
  await fillField(page, "child_name", "Миша");
  await gotoStep(page, "print");
  const box = page.locator('[data-hc-qr-box="a4"]');
  await expect(box).toBeVisible();
  await expect(box.locator("svg")).toBeAttached();
  expect(await pdfPages(page)).toBe(1);
});

test("7. заключение: с главной до показаний группы дословно", async ({ page }) => {
  await fromHub(page, "conclusion", "/pal-norms/indications/#back=conclusion");
  const groups = page.locator("details.pn-ind__group");
  if (await groups.count()) {
    const select = page.getByLabel("Показать одну группу");
    await select.selectOption(await select.locator("option").nth(1).getAttribute("value"));
    await expect(groups.filter({ visible: true })).toHaveCount(1);
    await expect(groups.filter({ visible: true }).locator("blockquote, .op-cite").first()).toBeVisible();
  } else {
    await expect(page.locator("main")).toContainText("публикац");
  }
  await page.goto("/home-care-kit/conclusion/");
  await expect(page.locator("h1")).toHaveCount(1);
});

test("8. переход в 18 лет: с главной до вех, печати и календаря", async ({ page }) => {
  await fromHub(page, "turning-18", "/obrashchenie-kit/turning-18/#back=turning-18");
  const year = Number(isoShift(0).slice(0, 4));
  await fillDate3(page.locator("#ok-birth"), `${year - 17}-06-15`);
  await page.getByRole("button", { name: "Посчитать" }).click();
  await expect(page.locator("[data-list] li")).toHaveCount(4);
  expect(await pdfPages(page)).toBe(1);
  const [ics] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Добавить в календарь" }).click()]);
  expect(ics.suggestedFilename()).toMatch(/\.ics$/);
});

test("9. что подписать заранее: с главной до исходов и печати", async ({ page }) => {
  await fromHub(page, "prepare", "/home-care-kit/ahead/#back=prepare");
  const first = page.locator("[data-hc-q]:visible");
  await expect(first).toHaveCount(1);
  await first.locator('[data-hc-answer="no"]').click();
  expect(await page.locator("[data-hc-outcome]:visible").count()).toBeGreaterThan(0);
  expect(await pdfPages(page)).toBeGreaterThanOrEqual(1);
});

test("10. куда звонить: с главной до карточки региона с номерами", async ({ page }) => {
  await fromHub(page, "who-to-call", "/pal-directory/#back=who-to-call");
  const input = page.getByLabel("Ваш регион");
  await input.fill("калин");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/pal-directory\/regions\/ru-kgd\/$/);
  await expect(page.locator("h1")).toHaveText("Калининградская область");
  expect(await page.locator('main a[href^="tel:"]').count()).toBeGreaterThan(0);
  expect(await pdfPages(page)).toBe(1);
});
