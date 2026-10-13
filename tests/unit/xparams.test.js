import { test } from "node:test";
import assert from "node:assert/strict";
import { xurl, readParams, parseFragment } from "../../opsite/ui/js/xparams.js";

test("xurl строит фрагмент только из белого списка", () => {
  assert.equal(xurl("obrashchenie-kit", "case/", { new: 1, s: "oral-refusal", back: "device" }),
    "/obrashchenie-kit/case/#new=1&s=oral-refusal&back=device");
  assert.equal(xurl("openpalliative.github.io", "now/"), "/now/");
  assert.throws(() => xurl("home-care-kit", "night/", { name: "Иванов" }));
});

test("readParams отбрасывает чужие и кривые значения и чистит адрес", () => {
  let replaced = null;
  const loc = { hash: "#device=303260&region=RU-KGD&name=x&s=../evil&from=1999-01-01", pathname: "/ok/case/", search: "" };
  const hist = { state: null, replaceState: (_s, _t, url) => { replaced = url; } };
  const got = readParams(["device", "region", "s", "from", "name"], { region: (v) => v === "RU-KGD" },
    { location: loc, history: hist });
  assert.deepEqual(got, { device: "303260", region: "RU-KGD" });
  assert.equal(replaced, "/ok/case/");
});

test("якорь без = не трогаем", () => {
  assert.equal(parseFragment("#folder"), null);
});

test("watchParams читает параметры при загрузке и при смене якоря", async () => {
  const { watchParams } = await import("../../opsite/ui/js/xparams.js");
  const listeners = {};
  const target = { addEventListener: (t, fn) => { listeners[t] = fn; }, removeEventListener: () => {} };
  const loc = { hash: "#region=RU-KGD", pathname: "/x/", search: "" };
  globalThis.location = loc;
  globalThis.history = { state: null, replaceState: () => { loc.hash = ""; } };
  const got = [];
  watchParams(["region"], (p) => got.push(p.region), {}, { target });
  loc.hash = "#region=RU-MOW";
  listeners.hashchange();
  assert.deepEqual(got, ["RU-KGD", "RU-MOW"]);
});
