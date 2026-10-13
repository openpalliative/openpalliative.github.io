import json
import time
import shutil
from pathlib import Path

import pytest

from opsite import check, render
from opsite.build import build
from opsite.data import BuildError, coerce, content_sha256, make_envelope, validate
from opsite.lint import check_text, lint_html
from opsite.syncdata import run as sync_run

HUB = Path(__file__).resolve().parents[2]


def rules(found):
    return {f.rule for f in found if f.level == "error"}


def test_lint_catches_forbidden_text():
    assert "dash" in rules(check_text("срок — 30 дней", "x", 1))
    assert "dash" not in rules(check_text("срок — 30 дней", "x", 1, verbatim=True))
    assert "emoji" in rules(check_text("готово ✅", "x", 1))
    assert "act-number" in rules(check_text("по приказу № 345н", "x", 1))
    assert "act-number" in rules(check_text("по закону 59-ФЗ", "x", 1))
    assert "act-number" not in rules(check_text("звоните 8-800-700-84-36", "x", 1))
    assert "dose" in rules(check_text("давать 10 мг", "x", 1))
    assert "drug" in rules(check_text("Морфин в ампулах", "x", 1))
    assert "ai-words" in rules(check_text("сделано с помощью ИИ", "x", 1))
    assert "ai-words" not in rules(check_text("линии и инструменты", "x", 1))
    assert "territory" in rules(check_text("Херсонская область", "x", 1))
    assert "territory" not in rules(check_text("город Крымск", "x", 1))
    assert "stoplist" in rules(check_text("https://vk.com/x", "x", 1))


def test_lint_words_are_warnings_only():
    found = check_text("лежачий больной", "x", 1)
    assert {f.level for f in found} == {"warning"}
    assert not check_text("Данные от 11.10.2026", "x", 1)


def test_lint_html_verbatim_and_inline_script(tmp_path):
    page = tmp_path / "p.html"
    page.write_text('<main><blockquote data-verbatim>а — б</blockquote><p>ок</p>'
                    '<script>alert(1)</script><a onclick="x()">x</a></main>', encoding="utf-8")
    got = rules(lint_html(page, "p.html"))
    assert "dash" not in got
    assert {"inline-script", "inline-handler"} <= got


def test_coerce_by_schema():
    schema = {"type": "object", "properties": {"verified": {"type": "boolean"}, "n": {"type": "integer"},
                                               "at": {"type": ["string", "null"]}}}
    assert coerce({"verified": "false", "n": "3", "at": ""}, schema) == {"verified": False, "n": 3, "at": None}


def test_validate_message_in_russian():
    with pytest.raises(BuildError) as e:
        validate({"items": [{"_line": "14"}]}, {"type": "object", "properties": {"items": {"type": "array", "items": {
            "type": "object", "required": ["phone"]}}}}, "data/region-lines.csv")
    assert "строка 14" in str(e.value) and "phone" in str(e.value)


def test_envelope_hash_ignores_generated_at():
    meta = {"version": "2026.10.11", "data_date": "2026-10-11"}
    items = [{"id": "a", "verified": True, "verified_at": "2026-10-11", "_line": "2"}]
    a = make_envelope(dataset="x", repo="r", items=items, source=[], meta=meta)
    b = make_envelope(dataset="x", repo="r", items=items, source=[], meta=meta)
    assert a["content_sha256"] == b["content_sha256"] == content_sha256([], [{k: v for k, v in items[0].items()
                                                                            if k != "_line"}])
    assert "_line" not in a["items"][0]


def test_filters():
    assert render.ru_date("2026-11-04") == "04.11.2026"
    assert render.ru_date_long("2026-11-04") == "4 ноября 2026"
    assert render.plural(22, "день", "дня", "дней") == "22 дня"
    assert render.tel("8-800-700-84-36") == "tel:+78007008436"
    assert render.fragment({"new": 1, "s": "oral-refusal"}) == "#new=1&s=oral-refusal"
    with pytest.raises(BuildError):
        render.fragment({"fio": "x"})


def test_out_paths():
    assert render.out_path_for(Path("index.html.j2")) == "index.html"
    assert render.out_path_for(Path("now.html.j2")) == "now/index.html"
    assert render.out_path_for(Path("ui/demo.html.j2")) == "ui/demo/index.html"


def test_hub_builds_and_passes_check(tmp_path):
    root = tmp_path / "hub"
    shutil.copytree(HUB, root, ignore=shutil.ignore_patterns("_site", "_reports", "node_modules", ".venv", "__pycache__"))
    ctx = build(root)
    out = root / "_site"
    assert (out / "index.html").is_file() and (out / "404.html").is_file()
    assert (out / "ui" / "VERSION").read_text().strip() == ctx.opsite_version
    html = (out / "now" / "index.html").read_text(encoding="utf-8")
    assert 'href="../ui/css/base.css"' in html and "tel:112" in html
    assert 'href="/ui/css/base.css"' in (out / "404.html").read_text(encoding="utf-8")
    assert check.run(root) == 0


def _tool(tmp_path: Path, name: str) -> Path:
    root = tmp_path / name
    (root / "templates" / "pages").mkdir(parents=True)
    shutil.copytree(HUB / "opsite", root / "opsite", ignore=shutil.ignore_patterns("__pycache__"))
    (root / "site.yaml").write_text(
        f"repo: {name}\ntitle: Проба\ntagline: Проверка сборки\nprefix: pr\nport: 8790\nbase: /{name}/\n"
        f"pwa: true\nstale_after_days: 90\ndraft_default: legal\ngithub: https://github.com/openpalliative/{name}\n",
        encoding="utf-8")
    (root / "templates" / "pages" / "index.html.j2").write_text(
        '{% extends "op/base.html.j2" %}{% block title %}Проба{% endblock %}'
        '{% block main %}<div class="op-wrap op-page"><h1>Проба</h1>{{ op.data_date("2026-10-11") }}</div>{% endblock %}',
        encoding="utf-8")
    (root / "pipeline").mkdir()
    (root / "data" / "schema").mkdir(parents=True)
    (root / "data" / "schema" / "entrypoints.schema.json").write_text(
        (HUB / "opsite" / "schema" / "entrypoints.schema.json").read_text(encoding="utf-8"), encoding="utf-8")
    (root / "pipeline" / "__init__.py").write_text("", encoding="utf-8")
    (root / "pipeline" / "export.py").write_text(
        "from opsite.data import make_envelope\n"
        "def datasets(root):\n"
        "    items = [{'id': 'start', 'title': 'Начать', 'summary': 'Проба', 'path': '', 'audience': ['family'],\n"
        "              'situations': ['refused'], 'offline': True, 'printable': False, 'maturity': 'demo',\n"
        "              'verified': True, 'verified_at': '2026-10-11'}]\n"
        f"    return [make_envelope(dataset='entrypoints', repo='{name}', items=items, source=[],\n"
        "                          meta={'version': '2026.10.11', 'data_date': '2026-10-11'})]\n",
        encoding="utf-8")
    return root


def test_tool_build_pwa_and_sync(tmp_path):
    tool = _tool(tmp_path, "probe-kit")
    build(tool)
    out = tool / "_site"
    assert (out / "sw.js").is_file() and (out / "manifest.webmanifest").is_file()
    assert json.loads((out / "data" / "v1" / "index.json").read_text())["datasets"][0]["name"] == "entrypoints"
    page = (out / "index.html").read_text(encoding="utf-8")
    assert "Черновик" in page and 'href="/now/"' in page
    assert check.run(tool) == 0
    consumer = tmp_path / "consumer"
    consumer.mkdir()
    (consumer / "deps.yaml").write_text("probe-kit:\n  major: 1\n  datasets: [entrypoints]\n", encoding="utf-8")
    assert sync_run(consumer, "local") == 0
    assert (consumer / "vendor" / "probe-kit" / "v1" / "entrypoints.json").is_file()
    assert "content_sha256" in (consumer / "deps.yaml").read_text(encoding="utf-8")
    before = (consumer / "deps.yaml").read_text(encoding="utf-8")
    vendored = (consumer / "vendor" / "probe-kit" / "v1" / "entrypoints.json").read_bytes()
    time.sleep(1.1)
    build(tool)
    assert sync_run(consumer, "local") == 0
    assert (consumer / "deps.yaml").read_text(encoding="utf-8") == before
    assert (consumer / "vendor" / "probe-kit" / "v1" / "entrypoints.json").read_bytes() == vendored


def test_manual_edit_of_opsite_copy_fails_check(tmp_path):
    tool = _tool(tmp_path, "probe-kit")
    build(tool)
    with open(tool / "opsite" / "ui" / "css" / "base.css", "a", encoding="utf-8") as f:
        f.write("\n.x { color: red; }\n")
    assert check.run(tool) == 1


def _hub_copy(tmp_path: Path) -> Path:
    root = tmp_path / "hub"
    shutil.copytree(HUB, root, ignore=shutil.ignore_patterns("_site", "_reports", "node_modules", ".venv", "__pycache__"))
    return root


def test_hub_seo_lang_and_commit(tmp_path, monkeypatch):
    monkeypatch.setenv("GITHUB_SHA", "0123456789abcdef")
    root = _hub_copy(tmp_path)
    build(root)
    out = root / "_site"
    assert json.loads((out / "build.json").read_text())["commit"] == "0123456"
    home = (out / "index.html").read_text(encoding="utf-8")
    assert "0123456" in home and "/commit/0123456" in home
    assert home.count('rel="canonical"') == 1 and 'href="https://openpalliative.github.io/"' in home
    assert 'hreflang="ru"' in home and 'hreflang="en"' in home
    assert 'property="og:image" content="https://openpalliative.github.io/ui/brand/og/openpalliative.github.io.png"' in home
    en = (out / "en" / "index.html").read_text(encoding="utf-8")
    assert '<html lang="en"' in en and 'hreflang="ru"' in en and 'content="en_US"' in en
    robots = (out / "robots.txt").read_text(encoding="utf-8")
    assert robots.startswith("User-agent: *\nAllow: /") and robots.count("Sitemap: https://") == 6
    smap = (out / "sitemap.xml").read_text(encoding="utf-8")
    assert "ui/demo" not in smap and "<loc>https://openpalliative.github.io/now/</loc>" in smap
    assert not (out / "sitemap.txt").exists()
    assert "Черновик" not in (out / "404.html").read_text(encoding="utf-8")
    now = (out / "now" / "index.html").read_text(encoding="utf-8")
    assert now.count('href="tel:112"') == 1 and "op-footer__tels" not in now
    assert "112 и 103 сверены с источником" in home and "проверены" not in home.split("op-now")[1][:2000]
    about = (out / "about" / "index.html").read_text(encoding="utf-8")
    assert "op-footer__tels" in about and 'href="tel:112"' in about
    assert "form-action &#39;none&#39;" in about and "unsafe-inline" not in about
    assert "<title>О проекте - openpalliative</title>" in about


def test_site_url_from_environment(tmp_path, monkeypatch):
    monkeypatch.setenv("OP_SITE_URL", "https://mirror.example.org")
    root = _hub_copy(tmp_path)
    build(root)
    assert "<loc>https://mirror.example.org/now/</loc>" in (root / "_site" / "sitemap.xml").read_text(encoding="utf-8")


def test_manifest_bumps_version(tmp_path):
    base = tmp_path / "opsite"
    shutil.copytree(HUB / "opsite", base, ignore=shutil.ignore_patterns("__pycache__"))
    (base / "VERSION").write_text("0.3.0\n")
    check.write_manifest(base)
    assert not check.manifest_changed(base)
    (base / "now.yaml").write_text((base / "now.yaml").read_text() + "\n", encoding="utf-8")
    assert check.manifest_changed(base)
    assert check.bump_version(base) == "0.3.1"
