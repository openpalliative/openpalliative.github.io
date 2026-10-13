import { test } from "node:test";
import assert from "node:assert/strict";
import { ruDate, ruDateLong, plural, phoneHref, daysBetween } from "../../opsite/ui/js/format.js";

test("ruDate и ruDateLong", () => {
  assert.equal(ruDate("2026-11-14"), "14.11.2026");
  assert.equal(ruDateLong("2026-11-04"), "4 ноября 2026");
  assert.equal(ruDate(""), "");
});

test("plural", () => {
  assert.equal(plural(1, "день", "дня", "дней"), "1 день");
  assert.equal(plural(3, "день", "дня", "дней"), "3 дня");
  assert.equal(plural(11, "день", "дня", "дней"), "11 дней");
  assert.equal(plural(21, "день", "дня", "дней"), "21 день");
  assert.equal(plural(112, "день", "дня", "дней"), "112 дней");
});

test("phoneHref", () => {
  assert.equal(phoneHref("8-800-700-84-36"), "tel:+78007008436");
  assert.equal(phoneHref("112"), "tel:112");
  assert.equal(phoneHref("+7 (912) 000-00-00"), "tel:+79120000000");
});

test("daysBetween через смену года и високосный день", () => {
  assert.equal(daysBetween("2027-12-31", "2028-01-01"), 1);
  assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2);
  assert.equal(daysBetween("2026-10-11", "2026-10-11"), 0);
});
