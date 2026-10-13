import json
import re
from pathlib import Path

import pytest
import yaml

from opsite.build import build, check_situations
from opsite.data import read_yaml

HUB = Path(__file__).resolve().parents[2]
ORG = HUB.parent
STEP_KEYS = {"repo", "entry", "path", "label", "params", "soon", "anchor"}
FULL_LABELS = {
    "discharge": ["Что делать, если выписывают без нужных бумаг"],
    "refused": ["Жалобу переслали тому, на кого вы жалуетесь", "Пришёл ответ, но непонятно, что он значит"],
    "device": ["Говорят, что этого больше нет в перечне"],
    "dying": ["Что подписать, пока человек может"],
}


def situations() -> list[dict]:
    return yaml.safe_load((HUB / "content/situations.yaml").read_text(encoding="utf-8"))["situations"]


def entrypoints() -> dict:
    out = {}
    for f in (HUB / "vendor").glob("*/v1/entrypoints.json"):
        out[f.parts[-3]] = {e["id"]: e for e in json.loads(f.read_text(encoding="utf-8"))["items"]}
    return out


def steps():
    for s in situations():
        for key in ("today", "later", "if_failed"):
            for step in s.get(key) or []:
                yield s["id"], key, step


@pytest.fixture(scope="module")
def site():
    build(HUB)
    return HUB / "_site"


def test_situations_pass_schema():
    check_situations(read_yaml(HUB / "content/situations.yaml"))


def test_steps_have_no_extra_keys_and_labels_are_whole():
    for sid, key, step in steps():
        assert set(step) <= STEP_KEYS, f"{sid}/{key}: {step}"
        assert "entry" in step or "path" in step, f"{sid}/{key}: {step}"


def test_related_point_to_existing_situations():
    ids = {s["id"] for s in situations()}
    for s in situations():
        assert set(s.get("related") or []) <= ids, s["id"]


def test_entries_exist_in_vendor():
    eps = entrypoints()
    for sid, key, step in steps():
        if "entry" in step:
            assert step["entry"] in eps.get(step["repo"], {}), f"{sid}/{key}: нет entry {step['repo']}/{step['entry']}"


def test_full_labels_on_pages(site):
    for sid, labels in FULL_LABELS.items():
        html = (site / "s" / sid / "index.html").read_text(encoding="utf-8")
        for label in labels:
            assert label in html, f"{sid}: {label}"


def test_urgent_pages_have_numbers_on_top(site):
    for s in situations():
        html = (site / "s" / s["id"] / "index.html").read_text(encoding="utf-8")
        main = re.sub(r"<template.*?</template>", "", html.split('<main', 1)[1].split("</main>", 1)[0], flags=re.S)
        now = main.index('class="op-now')
        first_block = main.index('class="hub-sit__block"')
        if s.get("urgent"):
            assert now < first_block, s["id"]
            assert "Номера экстренных служб" not in main
        else:
            assert now > first_block, s["id"]
        assert main.count('href="tel:112"') == 1


def test_steps_to_hub_are_not_labelled_with_project_name(site):
    for s in situations():
        html = (site / "s" / s["id"] / "index.html").read_text(encoding="utf-8")
        assert '<span>openpalliative</span></div>' not in html


def test_tools_page_links_every_entrypoint(site):
    html = (site / "tools/index.html").read_text(encoding="utf-8")
    for repo, eps in entrypoints().items():
        card = html.split(f'data-repo="{repo}"', 1)[1].split("</article>", 1)[0]
        listed = card.split('class="hub-eps"', 1)[1]
        assert len(re.findall(r"<a href=", listed)) == len(eps), repo


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def test_license_table_matches_license_data():
    lic = yaml.safe_load((HUB / "content/licenses.yaml").read_text(encoding="utf-8"))
    assert {r["repo"] for r in lic["repos"]} == {"pal-norms", "pal-devices-data", "pal-directory",
                                                 "obrashchenie-kit", "home-care-kit"}
    checked = 0
    for r in lic["repos"]:
        path = ORG / r["repo"] / "LICENSE-DATA"
        if not path.is_file():
            continue
        text = norm(path.read_text(encoding="utf-8"))
        for row in r["rows"]:
            assert norm(row["terms"]) in text, f"{r['repo']}: «{row['terms']}» нет в LICENSE-DATA"
            checked += 1
    if not checked:
        pytest.skip("репо инструментов рядом нет")


def test_orgs_links_to_human_data_pages(site):
    html = (site / "orgs/index.html").read_text(encoding="utf-8")
    assert "index.json" not in html
    for t in yaml.safe_load((HUB / "opsite/tools.yaml").read_text(encoding="utf-8"))["tools"]:
        assert f'href="/{t["repo"]}/data/"' in html


def test_sources_numbers_come_from_data(site):
    html = (site / "sources/index.html").read_text(encoding="utf-8")
    lines = json.loads((HUB / "vendor/pal-directory/v1/region-lines.json").read_text(encoding="utf-8"))
    unverified = sum(1 for i in lines["items"] if i.get("verified") is False)
    row = html.split('<span class="op-code">region-lines</span>', 1)[1].split("</tr>", 1)[0]
    assert f">{unverified}</td>" in row


def test_sources_cover_every_vendored_dataset(site):
    html = (site / "sources/index.html").read_text(encoding="utf-8")
    total = verified = 0
    for f in sorted((HUB / "vendor").glob("*/v1/*.json")):
        if f.name == "index.json" or f.name.endswith(".schema.json"):
            continue
        env = json.loads(f.read_text(encoding="utf-8"))
        items = [i for i in env["items"] if isinstance(i, dict)]
        total += len(items)
        verified += sum(1 for i in items if i.get("verified") is True)
        assert f'<span class="op-code">{env["dataset"]}</span>' in html
    assert f"<strong>{total}</strong> записей" in html
    assert f"<strong>{verified}</strong> сверены с источником" in html
    assert "Прочерк значит" not in html
