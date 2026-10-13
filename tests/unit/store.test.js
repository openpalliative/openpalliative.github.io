import { test } from "node:test";
import assert from "node:assert/strict";
import { openStore, validateBackup, wipeAll, StoreError, BLOCKED_TEXT } from "../../opsite/ui/js/store.js";
import { readJsonFile, FileError } from "../../opsite/ui/js/files.js";
import { PREFIXES } from "../../opsite/ui/js/tools.js";

const ok = { format: "openpalliative-backup/1", repo: "obrashchenie-kit", entries: [{ key: "case:1", value: { a: 1 } }, { key: 7, value: "x" }] };

test("копия: свой файл проходит", () => {
  assert.equal(validateBackup(ok, "obrashchenie-kit").length, 2);
});

test("копия: чужой JSON, массив, entries null, битые ключи", () => {
  assert.throws(() => validateBackup({ hello: 1 }, "obrashchenie-kit"), StoreError);
  assert.throws(() => validateBackup([ok], "obrashchenie-kit"), StoreError);
  assert.throws(() => validateBackup({ ...ok, repo: "home-care-kit" }, "obrashchenie-kit"), /другого инструмента/);
  assert.throws(() => validateBackup({ ...ok, entries: null }, "obrashchenie-kit"), /нет списка записей/);
  assert.throws(() => validateBackup({ ...ok, entries: [{ key: {}, value: 1 }] }, "obrashchenie-kit"), /неверный ключ/);
  assert.throws(() => validateBackup({ ...ok, entries: [{ key: "", value: 1 }] }, "obrashchenie-kit"), /неверный ключ/);
  assert.throws(() => validateBackup({ ...ok, entries: [{ key: NaN, value: 1 }] }, "obrashchenie-kit"), /неверный ключ/);
  assert.throws(() => validateBackup({ ...ok, entries: ["x"] }, "obrashchenie-kit"), /не в том виде/);
});

test("импорт с заменой проверяет файл до очистки базы", async () => {
  const idb = { open() { throw new Error("база не должна открываться"); } };
  const store = openStore("obrashchenie-kit", { indexedDB: idb });
  await assert.rejects(store.importAll({ ...ok, entries: null }, { replace: true }), StoreError);
});

test("файл больше 5 МБ и не JSON отвергаются по-русски", async () => {
  const huge = { size: 50 * 1024 * 1024, text: () => { throw new Error("не должен читаться"); } };
  await assert.rejects(readJsonFile(huge), (e) => e instanceof FileError && /больше|большой/.test(e.message));
  const notJson = { size: 10, text: async () => "<html>" };
  await assert.rejects(readJsonFile(notJson), (e) => e instanceof FileError && /не тот формат/.test(e.message));
  assert.deepEqual(await readJsonFile({ size: 2, text: async () => "{}" }), {});
});

function fakeIdb({ blocked = false } = {}) {
  const deleted = [];
  return {
    deleted,
    databases: async () => [{ name: "op-obrashchenie-kit" }, { name: "other" }],
    deleteDatabase(name) {
      const req = {};
      setTimeout(() => {
        if (blocked) return;
        deleted.push(name);
        req.onsuccess?.();
      }, 1);
      return req;
    },
  };
}

test("wipeAll: ключи по списку префиксов, кэши и регистрации до баз", async () => {
  const order = [];
  const data = { "op:prefs": "1", "ok:x": "1", "hc:y": "1", "zz:z": "1", "keep": "1" };
  const proxy = { ...data };
  Object.defineProperty(proxy, "removeItem", { enumerable: false, value: (k) => { order.push(`ls:${k}`); delete proxy[k]; delete data[k]; } });
  const cacheStorage = { keys: async () => ["a"], delete: async (k) => { order.push(`cache:${k}`); } };
  const serviceWorker = { getRegistrations: async () => [{ unregister: async () => { order.push("sw"); } }] };
  const idb = fakeIdb();
  await wipeAll({ indexedDB: idb, storage: proxy, caches: cacheStorage, serviceWorker });
  assert.deepEqual(Object.keys(data).sort(), ["keep", "zz:z"]);
  assert.ok(order.indexOf("sw") < order.length);
  assert.ok(idb.deleted.includes("op-obrashchenie-kit") && idb.deleted.includes("op-home-care-kit"));
  assert.ok(!idb.deleted.includes("other"));
  assert.ok(PREFIXES.includes("ok") && PREFIXES.includes("hc") && PREFIXES.includes("op"));
});

test("wipeAll: заблокированная база даёт понятную ошибку", async () => {
  await assert.rejects(wipeAll({ indexedDB: fakeIdb({ blocked: true }), storage: null, caches: null, serviceWorker: null, timeout: 20 }),
    (e) => e instanceof StoreError && e.message === BLOCKED_TEXT);
});
