import json

BADGE_KEYS = ("maturity", "offline", "printable")
HUB_PAGES = {"now/": ("Помощь прямо сейчас", "phone"), "": ("Главная", "phone")}
STEP_BLOCKS = (("today", "Сегодня"), ("later", "Потом"), ("if_failed", "Если не получилось"))


def _entries(ctx) -> dict:
    out = {}
    for repo, datasets in ctx.vendor.items():
        env = datasets.get("entrypoints")
        if env:
            out[repo] = {e["id"]: e for e in env["items"]}
    return out


def _badges(entry: dict) -> dict:
    return {k: entry.get(k) for k in BADGE_KEYS}


def _resolve(link: dict, back: str, entries: dict, tools: dict) -> dict:
    repo = link["repo"]
    item = {"label": link["label"], "repo": repo, "path": link.get("path", ""), "params": None,
            "anchor": link.get("anchor", ""), "ready": True, "entry": None}
    if repo == "hub":
        title, icon = HUB_PAGES.get(item["path"], HUB_PAGES[""])
        return {**item, "tool_title": title, "icon": icon}
    tool = tools[repo]
    item.update(tool_title=tool["title"], icon=tool["icon"])
    known = entries.get(repo)
    if "entry" in link:
        entry = (known or {}).get(link["entry"])
        item["ready"] = entry is not None
        if entry:
            item["path"] = entry["path"]
            item["entry"] = _badges(entry)
    else:
        item["ready"] = known is not None
    params = dict(link.get("params") or {})
    if not item["anchor"]:
        params["back"] = back
    item["params"] = params
    return item


def situations(ctx) -> list[dict]:
    raw = ctx.content.get("situations", {}).get("situations", [])
    entries = _entries(ctx)
    tools = {t["repo"]: t for t in ctx.tools}
    by_id = {s["id"]: s for s in raw}
    out = []
    for s in raw:
        blocks = []
        for key, title in STEP_BLOCKS:
            links = [_resolve(link, s["id"], entries, tools) for link in s.get(key) or []]
            if links:
                blocks.append({"key": key, "title": title, "links": links})
        related = [by_id[r] for r in s.get("related") or [] if r in by_id]
        out.append({**s, "urgent": s.get("urgent") in (True, "true"), "blocks": blocks, "related_items": related})
    return out


def _counts(env: dict) -> dict:
    counts = env.get("counts") or {}
    items = [i for i in env.get("items") or [] if isinstance(i, dict)]
    return {"count": counts.get("items", len(items)),
            "verified": sum(1 for i in items if i.get("verified") is True),
            "unverified": sum(1 for i in items if i.get("verified") is False)}


def _sources(items: list) -> list[dict]:
    return [{"title": s.get("title", ""), "date": s.get("retrieved_at") or s.get("date") or "",
             "version": s.get("version") or ""} for s in items if isinstance(s, dict)]


def data_sources(ctx) -> list[dict]:
    tools = {t["repo"]: t for t in ctx.tools}
    groups = []
    for repo in [t["repo"] for t in ctx.tools]:
        rows = []
        vdir = ctx.root / "vendor" / repo / "v1" / "index.json"
        if not vdir.is_file():
            continue
        index = json.loads(vdir.read_text(encoding="utf-8"))
        loaded = ctx.vendor.get(repo, {})
        for d in index.get("datasets") or []:
            env = loaded.get(d["name"])
            row = {"repo": repo, "tool": tools[repo]["title"], "name": d["name"], "version": d.get("version", ""),
                   "data_date": d.get("data_date", ""), "count": d.get("items"), "verified": d.get("verified"),
                   "unverified": d.get("unverified"), "sources": _sources(d.get("source") or [])}
            if env:
                row.update(_counts(env))
                row["sources"] = _sources(env.get("source") or [])
            rows.append(row)
        groups.append({"repo": repo, "tool": tools[repo]["title"], "rows": rows})
    return groups


def data_totals(groups: list[dict]) -> dict:
    rows = [r for g in groups for r in g["rows"]]
    full = [r for r in rows if r.get("verified") is not None]
    return {"datasets": len(rows), "full": len(full), "count": sum(r["count"] or 0 for r in full),
            "verified": sum(r["verified"] for r in full), "unverified": sum(r["unverified"] or 0 for r in full)}


def line_sources(ctx) -> list[str]:
    env = ctx.vendor.get("pal-directory", {}).get("region-lines") or {}
    return sorted({s["title"] for s in env.get("source") or [] if s.get("title")})


def context(ctx) -> dict:
    regions = ctx.vendor.get("pal-directory", {}).get("regions")
    sources = data_sources(ctx)
    return {"situations": situations(ctx), "regions": regions["items"] if regions else [],
            "entries": _entries(ctx), "data_sources": sources, "data_totals": data_totals(sources),
            "line_sources": line_sources(ctx)}


def pages(ctx):
    for s in ctx.site["situations"]:
        yield f"s/{s['id']}/", "situation.html.j2", {"sit": s}
