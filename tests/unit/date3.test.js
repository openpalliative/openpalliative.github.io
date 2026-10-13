import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDate3 } from "../../opsite/ui/js/date3.js";

test("несуществующие даты", () => {
  assert.match(checkDate3("31", "2", "2026").error, /Такой даты нет/);
  assert.match(checkDate3("30", "2", "2024").error, /Такой даты нет/);
  assert.equal(checkDate3("29", "2", "2024").iso, "2024-02-29");
});

test("границы min и max", () => {
  assert.match(checkDate3("1", "1", "2030", { max: "2026-10-11" }).error, /слишком поздняя/);
  assert.match(checkDate3("1", "1", "2999", { max: "today" }).error, /позже сегодняшней/);
  assert.match(checkDate3("1", "1", "1990", { min: "2000-01-01" }).error, /давняя/);
  assert.equal(checkDate3("11", "10", "2026", { min: "2000-01-01", max: "2026-10-11" }).iso, "2026-10-11");
});

test("пустые и неполные поля", () => {
  assert.match(checkDate3("", "", "").error, /Укажите дату/);
  assert.match(checkDate3("1", "", "2026").error, /Заполните/);
  assert.match(checkDate3("1", "1", "26").error, /четырьмя цифрами/);
});
