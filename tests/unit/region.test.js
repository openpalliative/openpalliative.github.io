import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRegion } from "../../opsite/ui/js/region-match.js";

const regions = [
  { id: "RU-ALT", name: "Алтайский край", capital: "Барнаул", aliases: [] },
  { id: "RU-MOW", name: "Москва", capital: "", aliases: ["Мск"] },
  { id: "RU-MOS", name: "Московская область", capital: "", aliases: ["Подмосковье"] },
  { id: "RU-KHM", name: "Ханты-Мансийский автономный округ - Югра", capital: "Ханты-Мансийск", aliases: ["ХМАО", "Югра"] },
];

test("поиск региона по названию, столице и сокращению", () => {
  assert.equal(matchRegion("барнаул", regions)[0].id, "RU-ALT");
  assert.equal(matchRegion("мск", regions)[0].id, "RU-MOW");
  assert.equal(matchRegion("хмао", regions)[0].id, "RU-KHM");
  assert.deepEqual(matchRegion("моск", regions).map((r) => r.id), ["RU-MOW", "RU-MOS"]);
  assert.deepEqual(matchRegion("ёжик", regions), []);
});
