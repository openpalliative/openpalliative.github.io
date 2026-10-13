# Как устроен хаб openpalliative

Хаб это два в одном: сайт `https://openpalliative.github.io/` и общая платформа для всех шести сайтов проекта. Платформа живёт в папке `opsite/`, пять репо инструментов держат её копию

## 1. Шесть репо и адреса

| Репо | Адрес на Pages | Порт локально | Роль |
|---|---|---|---|
| openpalliative.github.io | `/` | 8700 | хаб и платформа `opsite` |
| pal-norms | `/pal-norms/` | 8701 | производитель: нормы, сроки, календарь |
| pal-devices-data | `/pal-devices-data/` | 8702 | производитель: изделия, потребитель норм |
| obrashchenie-kit | `/obrashchenie-kit/` | 8703 | потребитель: заявления и жалобы |
| home-care-kit | `/home-care-kit/` | 8704 | потребитель: листы для дома |
| pal-directory | `/pal-directory/` | 8705 | производитель: регионы и номера |

Все сайты статические. Сервера, базы, аналитики и запросов к чужим адресам в рантайме нет. Каждый репо собирается сам и публикуется своим `pages.yml` на свой путь. Хаб публикуется в корень и не содержит папок инструментов: GitHub Pages отдаёт `/pal-norms/` из репо pal-norms

Ссылки внутри сайта относительные, поэтому тот же `_site/` работает на Pages, на зеркале и под любым префиксом. Ссылки в соседние репо строит `xurl()` от корня. Исключение `404.html`: в нём пути от `site.base`, потому что Pages отдаёт его на любом вложенном адресе

## 2. opsite

`opsite` это сборщик, проверки и общий UI. Зависимости сборки: jinja2, pyyaml, jsonschema, markdown-it-py, всё через uv. Node нужен только для тестов

### Команды

| Команда | Что делает |
|---|---|
| `uv run python -m opsite build` | собирает `_site/` из `content/`, `templates/`, `data/`, `vendor/` и `site_hooks.py` репо. `--org-root` задаёт префикс ссылок в соседние репо |
| `uv run python -m opsite check` | линт текста в исходниках и в собранном HTML, CSP, ссылки, сеть (ни одного внешнего адреса в рантайме), бюджеты первой загрузки, SEO, дрейф копии `opsite/`, свежесть снимков, эталонные страницы, `MANIFEST.sha256`. `--ci` пишет аннотации GitHub, `--org ../_site` проверяет межрепные ссылки в общей сборке |
| `uv run python -m opsite lint` | только линт исходников |
| `uv run python -m opsite serve` | отдаёт `_site/` по тому же пути, что на Pages, на порту из `site.yaml`. `--dir` отдаёт готовую папку как есть |
| `uv run python -m opsite sync-data` | забирает снимки соседей в `vendor/`, см. раздел 4 |
| `uv run python -m opsite manifest` | только в хабе: копирует `content/now.yaml` в `opsite/now.yaml`, собирает `opsite/situations.json` из `content/situations.yaml`, пишет `ui/js/tools.js`, при изменениях поднимает `opsite/VERSION` и переписывает `opsite/MANIFEST.sha256` |

### Что внутри

- `opsite/templates/op/`: каркас страницы и макросы (`op.now`, `op.draft`, `op.region`, `op.row`, `op.steps`, `op.date_field` и другие)
- `opsite/ui/`: `css/` (токены, база, компоненты, печать), `js/` (модули без сборки), `fonts/` (Onest и OFL), `icons/` (Lucide и ISC), `brand/` (знак, иконки сайта, картинки Open Graph)
- `opsite/schema/`: JSON Schema для `site.yaml`, `deps.yaml`, конверта датасета, `index.json`, `entrypoints`, `now`, `situations` и фронтматтера страниц
- `opsite/lint/`: правила текста. `words.yaml` (как не пишем и как пишем), `stoplist.yaml` (домены, на которые не ссылаемся), `territories.yaml` (территории, данных по которым нет), `drugs.txt` (названия препаратов, которых нет на листах). Ошибки: длинное тире, эмодзи, упоминания генераторов текста, номер акта литералом вне цитаты, доза, препарат, домен из стоп-листа, территория, инлайн-скрипт, атрибут `style`, обработчик `on*=`
- `opsite/tools.yaml`: пять инструментов (репо, префикс, название, иконка). Из него строятся подвал, `/tools/` и ключи, которые чистит «Удалить всё»
- `opsite/now.yaml` и `opsite/situations.json`: копии из `content/` хаба, чтобы шапка и `op.now` во всех репо были одинаковыми
- `opsite/tests/`: общий спек Playwright `pages.spec.js` и фикстуры (сторож сети, axe, нарушения CSP, ошибки консоли), `test_platform.py`
- `opsite/VERSION` и `opsite/MANIFEST.sha256`: версия платформы и sha256 каждого файла

## 3. Поток общего UI: sync-ui

1. Правка `opsite/` делается только в хабе
2. В хабе `uv run python -m opsite manifest`: новые хеши, при изменениях новая `VERSION`
3. `sh scripts/sync-ui-all` проходит по пяти соседним папкам и в каждой запускает `scripts/sync-ui`. В одном репо: `sh scripts/sync-ui`, хаб ищется в `../openpalliative.github.io` или в `OP_HUB`
4. `sync-ui` копирует `opsite/` через `rsync --delete` и сверяет копию с `MANIFEST.sha256`. Если у копии и у хаба одна `VERSION`, а хеши разные, копирование отказывается: значит, кто-то правил копию или забыл `manifest` в хабе
5. `opsite check` в репо инструмента предупреждает о дрейфе копии

В репо инструментов `opsite/` не правят и не присылают pull request с изменениями в нём

## 4. Поток данных: sync-data

Производители публикуют наборы в `/<repo>/data/v1/`: `index.json` со списком наборов, версией, датой данных и sha256, рядом каждый набор в конверте (`items`, `source`, `data_date`, `verified` у записей) и его схема

Потребитель описывает, что ему нужно, в `deps.yaml`: репо, мажорная версия и наборы. `opsite sync-data`:

1. `--from local` (по умолчанию) читает `../<repo>/_site/data/v1/`, `--from pages` читает `https://openpalliative.github.io/<repo>/data/v1/`
2. мажор из `index.json` должен совпасть с `major` в `deps.yaml`, иначе ошибка
3. каждый файл сверяется с sha256 из `index.json` и проверяется по схеме
4. если содержимое не изменилось, ничего не трогает. Иначе пишет файлы в `vendor/<repo>/v1/` и обновляет `deps.yaml` (`version`, `data_date`, `content_sha256`, `synced_at`)
5. если источник недоступен, оставляет старый снимок и предупреждает. С `--strict` выходит с ошибкой

Хаб берёт `entrypoints` у всех пяти инструментов и у pal-directory ещё `regions`, `region-lines` и `federal-lines`. В рантайме сайт читает только свои файлы и `vendor/`, к соседям и к Pages не ходит

В CI это делает `sync-data.yml` раз в неделю: `sync-data --from pages`, сборка, `check --ci` и pull request `sync/data` с меткой `review:data`, на ветке которого запускается `checks.yml`. Хаб синхронизируется последним, когда сайты соседей уже опубликованы

## 5. Как хаб собирает ситуации

- `content/situations.yaml`: 10 ситуаций (`night-pain`, `discharge`, `refused`, `device`, `conclusion`, `dying`, `who-to-call`, `emergency-sheet`, `turning-18`, `prepare`). У каждой заголовок, подсказка, иконка, флаг `urgent`, роли номеров региона и три блока шагов: «Сегодня», «Потом», «Если не получилось»
- шаг ссылается на страницу хаба (`repo: hub`) или на вход инструмента (`repo` и `entry`). `site_hooks.py` находит вход в `vendor/<repo>/v1/entrypoints.json` и берёт из него путь и отметки (`maturity`, `offline`, `printable`). Если входа нет, шаг показан как «Готовим», без ссылки
- к ссылке в инструмент добавляется `?back=<id ситуации>`, чтобы инструмент мог вернуть человека в его ситуацию
- `site_hooks.pages()` отдаёт сборщику страницы `s/<id>/` по шаблону `templates/situation.html.j2`
- `site_hooks.data_sources()` собирает таблицу «откуда данные» из `vendor/*/v1/index.json`: набор, версия, дата, число проверенных и непроверенных записей

## 6. Откуда региональные номера

- регионы и номера берутся только из снимков pal-directory в `vendor/pal-directory/v1/`. В pal-directory они взяты из таблицы горячих линий Росздравнадзора, у каждого номера источник, дата и `verified`
- при сборке хаб пишет `region-index.json` (название, столица, сокращения для поиска региона) и `region-lines/<iso>.json` на каждый регион. Записи со `hidden: true` и `origin: synthetic` в эти файлы не попадают никогда
- выбранный регион хранится в `localStorage` под ключом `op:region` и общий для всех сайтов, потому что origin один. Без региона показаны номера, которые работают по всей стране, из `content/now.yaml`
- проверенные номера показываются крупно, непроверенные обычным размером со статусом «Не проверено». Если проверенных нет, хаб пишет об этом и предлагает федеральные номера. Всегда есть ссылка на карточку региона в pal-directory

### Режимы данных pal-directory: PD_DATA_MODE

Переменная окружения сборки pal-directory, в CI `vars.PD_DATA_MODE`:

- `real`: реальные номера из таблицы Росздравнадзора с источником и датой. Это режим по умолчанию и режим для Pages
- `demo`: вместо `region-lines` синтетика с номерами вида `8 (000) ...` без `tel:` и плашка «Пример на выдуманных данных». Только для тестов

Хаб от режима не зависит: синтетические строки он отбрасывает при сборке, а без номеров показывает ссылку на карточку региона

## 7. Зоны

Чтобы несколько человек могли работать в одном репо, не мешая друг другу:

| Зона | Что |
|---|---|
| данные | `data/`, `pipeline/`, `raw/`, тесты данных |
| страницы | `templates/`, `assets/`, `content/`, `lib/`, e2e и скриншоты |
| инфраструктура | `.github/`, `README.md`, `docs/`, лицензии, файлы сообщества, `scripts/` для проверок |
| общий UI | `opsite/`, только в хабе |

## 8. Новый репо: init-repo

`sh scripts/init-repo REPO PREFIX PORT "Название" "Что делает" [--pwa] [--draft legal|medical|both|none]` копирует `scripts/repo-template/` в соседнюю папку и подставляет значения. Существующие файлы не трогает. В шаблоне:

- `site.yaml`, `pyproject.toml`, `package.json`, `playwright.config.js`, `deps.yaml`, версии Node и Python
- `.github/workflows/`: `checks.yml`, `pages.yml`, `release.yml`, `sync-data.yml`, `watch.yml`. Ненужные удалите: `watch.yml` нужен только производителям, `sync-data.yml` только потребителям
- `.github/`: шаблоны issue и pull request, `CODEOWNERS`, `dependabot.yml`
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- `scripts/`: `gate.sh`, `sync-ui`, `sync-data`, `serve-one`, `e2e-browsers`, `tools/install`
- тесты: unit, e2e, `pages.json`

В конце `init-repo` запускает `sync-ui`, так что копия `opsite/` появляется сразу

## 9. Workflows

Все экшены закреплены по 40-символьному SHA с комментарием версии. У workflow `permissions: {}`, права выдаются на уровне job по минимуму. У каждого job есть `timeout-minutes`. `checkout` везде с `persist-credentials: false`, pull request создаёт `peter-evans/create-pull-request` своим токеном. Кэш uv и pnpm включён только в `checks.yml`, там, где ничего не публикуется

| Workflow | Когда | Что |
|---|---|---|
| `checks.yml` | pull request, push в `main`, вручную | actionlint, pytest, сборка, `check --ci`, unit, e2e в chromium, firefox и webkit, скриншоты. Повторный push в тот же pull request отменяет прошлый прогон |
| `pages.yml` | push в `main`, вручную | `build` с правом только на чтение собирает и проверяет `_site/`, `deploy` с `pages: write` и `id-token: write` публикует |
| `sync-data.yml` | вторник, вручную | новые снимки соседей, pull request с меткой `review:data`, запуск `checks.yml` на его ветке, в конце `PUT .../workflows/sync-data.yml/enable`, чтобы GitHub не выключил расписание через 60 дней без активности |
| `watch.yml` | понедельник, вручную, только у производителей | наблюдатель читает официальные источники. В шаблоне служебные снимки уходят pull request с меткой `facts`, остальное issue, у производителей детали в их ARCHITECTURE.md. Раннер задаётся `vars.WATCH_RUNNER` (JSON-строка), по умолчанию `ubuntu-24.04` |
| `release.yml` | тег `v*`, у инструментов | ворота, архив сайта и отдельный архив данных, `SHA256SUMS`, релиз на GitHub |

Проверка локально: `sh scripts/actionlint` (actionlint 1.7.12 и shellcheck 0.10.0, бинарники ставит `scripts/tools/install` с проверкой sha256) и `uvx zizmor --offline .github/workflows`

## 10. Тесты

- `pnpm test:unit`: модули `opsite/ui/js`
- `pnpm test:e2e`: Playwright в headless chromium по `tests/e2e/` и общему `opsite/tests/pages.spec.js`. Проекты `desktop`, `mobile`, `nojs`
- `pnpm test:e2e:browsers`: то же в chromium, firefox и webkit. Браузер выбирает переменная `OP_BROWSER`, отчёты в `_reports/pw-<браузер>/`
- `pnpm shots`: скриншоты в `_reports/shots/`
- `pnpm test:e2e:all`: `playwright.all.config.js` поднимает общую сборку на 8080 (`scripts/serve-all --no-build`) и обходит `sitemap.xml` всех шести сайтов: ответ страницы, один `h1`, нет горизонтальной прокрутки, axe, сторож сети, ссылки внутри сайта и в соседние репо, скриншоты в `_reports/shots/all/`
- `sh scripts/gate.sh`: все ворота подряд, итог в `_reports/gate.json`
