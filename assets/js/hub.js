const tpl = document.getElementById("hub-federal");

function nowAbove(box) {
  const now = document.querySelector("main .op-now");
  return Boolean(now && now.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function addFederal(box) {
  const more = box.querySelector(":scope > .op-region__more");
  const note = box.querySelector(":scope > .op-region__note");
  const lines = box.querySelector(":scope > .op-lines");
  if (!tpl || !more || (lines && !note) || box.querySelector(".hub-federal")) return;
  if (note) note.textContent = "Номера вашего региона ниже взяты из открытого источника и ещё не сверены";
  const block = tpl.content.cloneNode(true);
  if (nowAbove(box)) {
    block.querySelector(".op-lines")?.remove();
    block.querySelector(".hub-federal__lead").textContent =
      "По вашему региону проверенных номеров пока нет. Звоните на номера вверху страницы, они работают по всей стране";
  } else {
    for (const a of block.querySelectorAll("a[data-tel]")) a.href = a.dataset.tel;
  }
  box.insertBefore(block, note || more);
}

const titles = (document.querySelector(".hub-region")?.dataset.sourceTitles || "").split("|").filter(Boolean);

function splitSource(text) {
  const at = Math.min(...titles.map((t) => text.indexOf(t)).filter((i) => i >= 0));
  if (!Number.isFinite(at)) return null;
  return { rest: text.slice(0, at).replace(/[.\s]+$/, ""), source: text.slice(at) };
}

function shareSource(box) {
  const list = box.querySelector(":scope > .op-lines");
  if (!titles.length || !list || box.querySelector(".hub-source")) return;
  const metas = [...list.querySelectorAll(":scope > .op-line > .op-line__meta")];
  const parts = metas.map((m) => splitSource(m.textContent));
  if (metas.length < 2 || parts.some((x) => !x) || new Set(parts.map((x) => x.source)).size !== 1) return;
  metas.forEach((m, i) => {
    if (parts[i].rest) m.textContent = parts[i].rest;
    else m.remove();
  });
  const p = document.createElement("p");
  p.className = "op-line__meta hub-source";
  p.textContent = `Источник: ${parts[0].source}`;
  list.after(p);
}

for (const box of document.querySelectorAll(".op-region__lines")) {
  const sync = () => {
    addFederal(box);
    shareSource(box);
  };
  new MutationObserver(sync).observe(box, { childList: true });
  sync();
}

for (const details of document.querySelectorAll("details[data-close-on-js]")) {
  const sync = () => {
    if (location.hash === `#${details.id}`) details.open = true;
  };
  details.open = false;
  sync();
  let was = false;
  window.addEventListener("beforeprint", () => { was = details.open; details.open = true; });
  window.addEventListener("afterprint", () => { details.open = was; });
  window.addEventListener("hashchange", sync);
  for (const a of document.querySelectorAll(`a[href$="#${details.id}"]`)) a.addEventListener("click", () => { details.open = true; });
}
