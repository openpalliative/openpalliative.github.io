import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, escapeText, foldLine } from "../../opsite/ui/js/ics.js";

test("экранирование", () => {
  assert.equal(escapeText("a;b,c"), "a\\;b\\,c");
  assert.equal(escapeText("a,b;c\\d\nе"), "a\\,b\\;c\\\\d\\nе");
});

test("точка с запятой в SUMMARY экранирована в файле", () => {
  const ics = buildIcs([{ uid: "b@openpalliative", date: "2026-11-14", summary: "Ответ; жалоба" }], { now: new Date("2026-10-11T10:00:00Z") });
  assert.match(ics, /SUMMARY:Ответ\\; жалоба\r\n/);
});

test("перенос длинных строк по 75 октетов", () => {
  const line = "SUMMARY:" + "ж".repeat(80);
  const folded = foldLine(line);
  for (const part of folded.split("\r\n")) assert.ok(new TextEncoder().encode(part).length <= 75);
  assert.equal(folded.split("\r\n").map((p, i) => (i ? p.slice(1) : p)).join(""), line);
});

test("календарь со сроком и напоминанием", () => {
  const ics = buildIcs([{ uid: "a1@openpalliative", date: "2026-12-31", summary: "Срок ответа", alarmsDaysBefore: [3] }],
    { now: new Date("2026-10-11T10:00:00Z") });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /DTSTART;VALUE=DATE:20261231\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20270101\r\n/);
  assert.match(ics, /TRIGGER:-P3D\r\n/);
  assert.match(ics, /DTSTAMP:20261011T100000Z/);
  assert.doesNotMatch(ics.replace(/\r\n/g, ""), /\n/);
});
