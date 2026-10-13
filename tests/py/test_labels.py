import re
import subprocess
from pathlib import Path

HUB = Path(__file__).resolve().parents[2]
ORG = HUB.parent
REPOS = ["openpalliative.github.io", "pal-norms", "pal-devices-data", "pal-directory", "obrashchenie-kit",
         "home-care-kit"]
PREFIXED = re.compile(r"\b(?:review|watch|report):[a-z][a-z-]*")
YAML_LABELS = re.compile(r"^\s*labels:\s*(.+)$", re.M)
PY_LABELS = re.compile(r"""\blabels"?\s*[:=]\s*\[\s*((?:"[^"]+"\s*,?\s*)+)\]|"--label",\s*"([^"]+)\"""")


def listed() -> list[str]:
    rows = (HUB / "scripts" / "labels.tsv").read_text(encoding="utf-8").splitlines()
    return [r.split("\t")[0] for r in rows if r.strip()]


def scan_roots() -> list[Path]:
    roots = [HUB / ".github", HUB / "scripts" / "repo-template" / ".github"]
    for repo in REPOS:
        roots += [ORG / repo / "pipeline", ORG / repo / ".github"]
    return [r for r in roots if r.is_dir()]


def used() -> dict[str, str]:
    found = {}
    for root in scan_roots():
        for p in root.rglob("*"):
            if not p.is_file() or p.suffix not in (".py", ".yml", ".yaml") or "tests" in p.parts:
                continue
            text = p.read_text(encoding="utf-8")
            names = set(PREFIXED.findall(text))
            if p.suffix in (".yml", ".yaml"):
                for value in YAML_LABELS.findall(text):
                    if "${{" in value:
                        continue
                    names |= {v.strip(" \"'") for v in value.strip("[] ").split(",") if v.strip(" \"'")}
            else:
                for group, single in PY_LABELS.findall(text):
                    names |= set(re.findall(r'"([^"]+)"', group)) | ({single} if single else set())
            for n in names:
                found.setdefault(n, str(p.relative_to(ORG)))
    return found


def test_every_used_label_is_in_the_list():
    known = set(listed())
    missing = {n: f for n, f in used().items() if n not in known}
    assert not missing, f"метки без строки в scripts/labels.tsv: {missing}"


def test_list_covers_pipeline_and_template_labels():
    need = {"review:data", "review:legal", "review:medical", "facts", "audit", "alias", "report:number",
            "watch:format", "watch:freeze", "watch:old-source", "watch:unreachable", "watch:route", "good first issue"}
    assert need <= set(listed())
    assert len(listed()) == len(set(listed()))


def test_dry_run_prints_and_does_not_call_gh(tmp_path):
    out = subprocess.run(["sh", str(HUB / "scripts" / "labels"), "--dry-run"], capture_output=True, text=True,
                         env={"PATH": "/usr/bin:/bin"}, check=True).stdout.splitlines()
    assert len(out) == len(listed()) * len(REPOS)
    for name in listed():
        for repo in REPOS:
            assert f'gh label create "{name}" --force --repo openpalliative/{repo} ' in "\n".join(out) + " "
