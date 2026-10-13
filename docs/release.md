# Общие шаги и хаб: как выпустить

Команды `gh` выполняет владелец организации openpalliative после решения о публикации. Всё ниже бесплатно на плане Free для публичных репо. Шаги одинаковы для шести репо, особенности каждого репо в его разделе ниже

Переменная для примеров:

```sh
REPOS="pal-norms pal-devices-data pal-directory obrashchenie-kit home-care-kit openpalliative.github.io"
```

## 1. До первого пуша: Pages через Actions

В каждом репо Pages должны собираться из Actions, а не из ветки. Сейчас Pages не включены (API отвечает 404), поэтому первый `pages.yml` без этого шага упадёт на `deploy-pages`

```sh
for r in $REPOS; do gh api -X POST "repos/openpalliative/$r/pages" -f build_type=workflow; done
```

Если Pages уже включены из ветки, тот же вызов с `-X PUT`

## 2. Разрешить Actions создавать pull request

Без этого `create-pull-request` в `watch.yml` и `sync-data.yml` падает с ошибкой прав. Права токена по умолчанию оставить только на чтение: каждому workflow нужные права выданы в самом файле

```sh
gh api -X PUT orgs/openpalliative/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
for r in $REPOS; do gh api -X PUT "repos/openpalliative/$r/actions/permissions/workflow" -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true; done
```

В интерфейсе это Settings > Actions > General > Workflow permissions: «Read repository contents and packages permissions» и галочка «Allow GitHub Actions to create and approve pull requests», сначала в организации, потом в репо

## 3. Метки

```sh
sh scripts/labels --dry-run   # посмотреть команды
sh scripts/labels             # создать все метки во всех шести репо
```

Список в `scripts/labels.tsv`: `review:data`, `review:legal`, `review:medical`, `facts`, `audit`, `alias`, `report:number`, `watch:format`, `watch:freeze`, `watch:old-source`, `watch:unreachable`, `watch:route`, `good first issue`. Тест `tests/py/test_labels.py` следит, чтобы каждая метка из пайплайнов и шаблонов была в списке

## 4. Безопасность

В каждом репо:

```sh
for r in $REPOS; do
  gh api -X PUT "repos/openpalliative/$r/private-vulnerability-reporting"
  gh api -X PUT "repos/openpalliative/$r/vulnerability-alerts"
  gh api -X PUT "repos/openpalliative/$r/automated-security-fixes"
  gh api -X PATCH "repos/openpalliative/$r" --input - <<'JSON'
{"security_and_analysis": {"secret_scanning": {"status": "enabled"}, "secret_scanning_push_protection": {"status": "enabled"}}}
JSON
done
```

- private vulnerability reporting: на него ссылаются `SECURITY.md` и `CODE_OF_CONDUCT.md`, другой почты для отчётов нет
- жалобы на содержимое: в каждом репо Settings > Moderation options > Reported content, «Prior contributors and collaborators». На это ссылается `CODE_OF_CONDUCT.md`
- права токена по умолчанию только чтение (шаг 2)
- в организации включить обязательную двухфакторную аутентификацию: Settings > Authentication security > «Require two-factor authentication»

## 5. Защита main

Ruleset на `main` в каждом репо: без удаления ветки и force push, изменения только через pull request, обязательная проверка `gate` из `checks.yml`. Обязательного ревью CODEOWNERS и одобрений не ставить, пока мейнтейнер один

```sh
for r in $REPOS; do gh api -X POST "repos/openpalliative/$r/rulesets" --input - <<'JSON'
{"name": "main", "target": "branch", "enforcement": "active",
 "conditions": {"ref_name": {"include": ["~DEFAULT_BRANCH"], "exclude": []}},
 "rules": [
  {"type": "deletion"},
  {"type": "non_fast_forward"},
  {"type": "pull_request", "parameters": {"required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false,
   "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false}},
  {"type": "required_status_checks", "parameters": {"strict_required_status_checks_policy": false,
   "required_status_checks": [{"context": "gate"}]}}
 ]}
JSON
done
```

Боты в `main` напрямую не пишут, всё идёт pull request: `sync/data` у потребителей, `watch/...` у производителей. Pull request, открытый токеном `GITHUB_TOKEN`, сам не запускает проверки, поэтому workflow после `create-pull-request` запускает `gh workflow run checks.yml --ref <ветка>`, и на коммите появляется проверка `gate`. Если какому-то производителю нужен прямой коммит снимка, его раздел описывает обход (ruleset с bypass для GitHub Actions только в этом репо). Слияние человеком запускает `pages.yml` обычным push

## 6. Порядок пуша

Git инициализирует и пушит Кирилл после просмотра. Порядок важен, потому что потребители забирают снимки с сайтов производителей:

1. **pal-norms**
2. **pal-devices-data**
3. **pal-directory**
4. дождаться зелёного `pages` у всех трёх и проверить, что отвечают `https://openpalliative.github.io/<repo>/data/v1/index.json`
5. **obrashchenie-kit** и **home-care-kit**, затем у каждого `gh workflow run sync-data.yml --repo openpalliative/<repo>`
6. **openpalliative.github.io** последним, затем `gh workflow run sync-data.yml --repo openpalliative/openpalliative.github.io`. Раньше `sync-data --from pages` не найдёт снимки соседей и оставит старые

В репо уже лежат локальные снимки в `vendor/`, поэтому первая сборка любого сайта от соседей не зависит

## 7. Первые прогоны наблюдателей

У pal-norms, pal-devices-data и pal-directory сразу после пуша запустить наблюдателя вручную и записать, отвечают ли источники раннерам GitHub:

```sh
gh workflow run watch.yml --repo openpalliative/pal-norms          # publication.pravo.gov.ru
gh workflow run watch.yml --repo openpalliative/pal-devices-data   # открытые данные Росздравнадзора
gh workflow run watch.yml --repo openpalliative/pal-directory      # файл горячих линий Росздравнадзора
gh run list --workflow watch.yml --repo openpalliative/<repo> --limit 1
```

| Источник | Отвечает раннерам GitHub | Дата проверки |
|---|---|---|
| publication.pravo.gov.ru | не проверено | |
| roszdravnadzor.gov.ru | не проверено | |

Если источник не отвечает, наблюдатель пишет понятную ошибку в отчёт прогона. Тогда расписание этого наблюдателя выключить вручную (`gh workflow disable watch.yml --repo openpalliative/<repo>`) и проверять источник через `scripts/watch-local` производителя

## 8. WATCH_RUNNER

Решение 11.10.2026: `WATCH_RUNNER` не задаём, наблюдатели работают на обычных раннерах GitHub. Если понадобится свой раннер:

- это переменная (`vars`, не `secrets`) уровня репо производителя с JSON-строкой для `runs-on`, например `'["self-hosted","linux","ru"]'`. Пустая переменная значит `"ubuntu-24.04"`
- раннеру нужны git, gh и uv, для pal-norms ещё `poppler-utils`, `tesseract-ocr` и `tesseract-ocr-rus`
- self-hosted раннер только на уровне репо производителя, не организации; ephemeral; в репо нет workflow на `pull_request` и `pull_request_target`, которые могли бы попасть на этот раннер; в Settings > Actions > General включено «Require approval for all outside collaborators»
- включать только после решения Кирилла, по умолчанию `scripts/watch-local`
- раннер в России ставит и обслуживает мейнтейнер в России

```sh
gh variable set WATCH_RUNNER --repo openpalliative/<repo> --body '["self-hosted","linux","ru"]'
```

## 9. PD_DATA_MODE

Решение 11.10.2026: `real`, на Pages реальные номера регионов из таблицы горячих линий Росздравнадзора с источником и датой. В `pal-directory/.github/workflows/pages.yml` и `release.yml` по умолчанию стоит `links` (без номеров регионов), поэтому решение исполняется переменной репо вместе с включением расписания наблюдателя:

```sh
gh variable set PD_DATA_MODE --repo openpalliative/pal-directory --body real
gh variable set WATCH_ENABLED --repo openpalliative/pal-directory --body true
```

Хаб от этого режима не зависит: синтетические номера он отбрасывает при сборке

## 10. Оформление

Репо `.github` с профилем организации. Готовое содержимое лежит в `docs/org-github/` хаба:

```sh
gh repo create openpalliative/.github --public --description "Профиль и общие файлы openpalliative"
# скопировать docs/org-github/ в корень нового репо: profile/README.md, profile/mark-light.svg, profile/mark-dark.svg,
# CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md. FUNDING.yml не добавлять
```

Discussions в хабе (на них ссылается страница «О проекте»):

```sh
gh repo edit openpalliative/openpalliative.github.io --enable-discussions
```

Описание, сайт и топики:

```sh
gh repo edit openpalliative/openpalliative.github.io \
  --description "С чего начать, если близкому нужна паллиативная помощь: ситуации, номера региона и все инструменты" \
  --homepage https://openpalliative.github.io/ \
  --add-topic palliative-care --add-topic russia --add-topic github-pages --add-topic static-site --add-topic accessibility
gh repo edit openpalliative/obrashchenie-kit --homepage https://openpalliative.github.io/obrashchenie-kit/ \
  --description "Заявления и жалобы: попросить ответ на бумаге, посчитать срок и понять следующий шаг"
gh repo edit openpalliative/home-care-kit --homepage https://openpalliative.github.io/home-care-kit/ \
  --description "Листы для дома: карта на ночь и праздники, лист для скорой, чек-лист выписки"
gh repo edit openpalliative/pal-directory --homepage https://openpalliative.github.io/pal-directory/ \
  --description "Куда звонить: номера регионов с назначением, источником и датой проверки"
```

Описания pal-norms и pal-devices-data в их разделах. Social preview загружается только вручную: Settings > General > Social preview, файл `docs/social-preview.png` репо (1280 x 640)

Профиль организации: название openpalliative, сайт https://openpalliative.github.io, аватар `opsite/ui/brand/h-heart-avatar-light.svg` хаба (переведённый в PNG)

## 11. Проверка живых сайтов

После зелёного `pages` у всех шести:

```sh
pnpm live-check   # node scripts/live-check.mjs https://openpalliative.github.io
```

Скрипт проверяет `/robots.txt` и `/sitemap.xml` хаба, `sitemap.xml` пяти инструментов, что несуществующий вложенный адрес `/pal-norms/no-such-page/deeper/` отдаёт 404 со стилями, и что главные страницы в headless chromium не делают ни одного запроса за пределы `openpalliative.github.io`

Плюс глазами: https://openpalliative.github.io/, `/now/`, одна ситуация `/s/night-pain/`, выбор региона, переход в каждый инструмент и обратно

## 12. Раз в месяц

GitHub выключает расписание в публичном репо после 60 дней без активности. Последний шаг `watch.yml` и `sync-data.yml` включает workflow обратно, но раз в месяц всё равно проверить:

```sh
for r in $REPOS; do gh api "repos/openpalliative/$r/actions/workflows" --jq ".workflows[] | \"$r \(.path) \(.state)\""; done
```

Всё, что не `active`, включить: `gh workflow enable <файл> --repo openpalliative/<repo>`

## 13. Workflows: что проверено и какие замечания оставлены

Шаблоны в `scripts/repo-template/.github/workflows/` и workflows хаба:

- actionlint 1.7.12 с shellcheck 0.10.0 (`sh scripts/actionlint`): 0 замечаний
- `uvx zizmor --offline` (zizmor 1.30.1): находок medium и выше нет
- issue forms, `config.yml` и `dependabot.yml` проходят схемы SchemaStore

Оставленные низкие и информационные находки zizmor в режиме pedantic:

- `undocumented-permissions`: права у job без поясняющих комментариев. По правилам проекта единственный комментарий в workflow это версия экшена рядом с SHA, а права и так минимальны и видны в одной строке
- `concurrency-limits` у `release.yml`: релиз запускается только тегом `v*` вручную, два одновременных релиза одного тега невозможны, `gh release create --verify-tag` упадёт на повторе
- `anonymous-definition`: у job нет `name`, имя job (`gate`, `build`, `deploy`) и есть имя проверки, на него ссылается ruleset
- `superfluous-actions` у `create-pull-request`: то же можно сделать через `git` и `gh`, но экшен закреплён по SHA и делает обновление существующего pull request надёжнее

Пины, сверенные `git ls-remote` 11.10.2026:

| Экшен | Версия | SHA |
|---|---|---|
| actions/checkout | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| astral-sh/setup-uv | v10.3.0 | `1c37ad07a6a961277cf70c0d37d6f313000f5884` |
| actions/setup-node | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| pnpm/action-setup | v6.1.0 | `ea17c68df8912ef543352723c149a84f56e3d413` (коммит под аннотированным тегом) |
| actions/upload-artifact | v7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| actions/upload-pages-artifact | v5.0.0 | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| actions/deploy-pages | v5.0.1 | `368f82528645a54fb793d4d04e342629a3f51346` |
| peter-evans/create-pull-request | v8.1.1 | `5f6978faf089d4d20b00c7766989d076bb2fc7f1` |

`actions/configure-pages` убран: база пути берётся из `site.yaml`, а экшену нужны права на Pages в job сборки, где по правилам только `contents: read`. Базовый путь проверяет шаг `base` в `pages.yml`

## 14. Хаб: особенности

- пушится последним, см. шаг 6
- `pages.yml` проверяет, что в корне `_site` есть `index.html`, `404.html`, `sitemap.xml`, `robots.txt` и нет папок пяти инструментов: их отдают Pages соседних репо
- `sync-data.yml` по вторникам берёт `entrypoints` у пяти инструментов и `regions`, `region-lines`, `federal-lines` у pal-directory и открывает pull request `sync/data` с меткой `review:data`
- релизов у хаба нет, `release.yml` есть только у инструментов
- Discussions включаются в хабе (шаг 10)
