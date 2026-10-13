<picture>
  <source media="(prefers-color-scheme: dark)" srcset="opsite/ui/brand/h-heart-mark-dark.svg">
  <img src="opsite/ui/brand/h-heart-mark-light.svg" width="56" height="56" alt="">
</picture>

# openpalliative

`openpalliative.github.io` · главная страница проекта: с чего начать, если близкому нужна паллиативная помощь, и все инструменты в одном месте

*The hub of openpalliative: where to start and all tools in one place. English summary at the end*

**Статус:** готовится к первой публикации · **Версия общего UI:** в `opsite/VERSION` · **Последняя проверка юристом и медиком:** ещё не было

> **Это не служба помощи, здесь не ответят быстро.** Если человеку плохо прямо сейчас, звоните **112** или **103**. Номера горячих линий собраны на странице https://openpalliative.github.io/now/

## Что это

Сайт https://openpalliative.github.io начинается с вопроса «Что случилось?». Человек выбирает свою ситуацию, например «Ночью сильная боль» или «Выписывают из больницы», и видит короткий план: что сделать сегодня, куда звонить в своём регионе и какой инструмент поможет дальше

Здесь же общая платформа для всех сайтов проекта: сборщик `opsite`, общий вид страниц и проверки текста

## Инструменты

| Инструмент | Что делает | Сайт | Код |
|---|---|---|---|
| Заявления и жалобы | Попросить ответ на бумаге, посчитать срок и понять следующий шаг | [открыть](https://openpalliative.github.io/obrashchenie-kit/) | [obrashchenie-kit](https://github.com/openpalliative/obrashchenie-kit) |
| Листы для дома | Карта на ночь и праздники, лист для скорой, чек-лист выписки | [открыть](https://openpalliative.github.io/home-care-kit/) | [home-care-kit](https://github.com/openpalliative/home-care-kit) |
| Кто выдаёт изделия | Аппараты, кровати, расходники и питание: кто выдаёт и по какому документу | [открыть](https://openpalliative.github.io/pal-devices-data/) | [pal-devices-data](https://github.com/openpalliative/pal-devices-data) |
| Куда звонить | Номера вашего региона с назначением, источником и датой проверки | [открыть](https://openpalliative.github.io/pal-directory/) | [pal-directory](https://github.com/openpalliative/pal-directory) |
| Нормы и сроки | Дословные цитаты из официальных публикаций, сроки ответа и куда обращаться дальше | [открыть](https://openpalliative.github.io/pal-norms/) | [pal-norms](https://github.com/openpalliative/pal-norms) |

## Для кого

- **Семьи и те, кто ухаживает:** понять, что делать в своей ситуации, и найти нужный номер или документ. GitHub для этого не нужен, хватит браузера на телефоне
- **Хосписы, НКО, юристы:** развернуть все сайты у себя, под своим адресом и названием
- **Разработчики:** взять сборщик `opsite`, схемы данных и проверки текста для своего проекта

## Что есть на хабе

- «Что случилось?» и 10 ситуаций на `/s/<id>/`: от ночной боли до подготовки к последним дням
- «Сейчас» на `/now/`: экстренные номера с источником и датой сверки
- выбор региона: номера рядом с вами из pal-directory
- все инструменты на `/tools/`, о проекте, принципы, приватность, как помочь, страница на английском
- общий UI: шрифт, цвета, иконки, шапка, подвал, плашки «черновик» и статусы

## Чего не делает

- не даёт медицинских и юридических советов и ничего не оценивает
- не отправляет документы за вас и не подключается к госсервисам
- не хранит ваши данные на сервере, сервера у проекта нет
- не собирает деньги и не связан с фондами, медицинскими организациями и госорганами

## Данные и приватность

Всё, что вы вводите, например выбранный регион и размер шрифта, хранится в браузере этого устройства. Аналитики, cookie, счётчиков и внешних шрифтов нет. Страницы не загружают ничего с чужих серверов, это проверяют тесты. Сайт размещён на GitHub Pages: как любой хостинг, GitHub видит адрес и браузер посетителя, у проекта доступа к этим журналам нет. Подробнее на https://openpalliative.github.io/privacy/

## Откуда данные и как они обновляются

Хаб сам ничего не собирает из интернета. Он берёт готовые снимки у соседних репо и складывает их в `vendor/`:

- **ситуации и входы в инструменты:** набор `entrypoints` каждого инструмента
- **регионы и номера рядом с вами:** наборы `regions`, `region-lines` и `federal-lines` из pal-directory. Номера взяты из таблицы горячих линий Росздравнадзора, у каждого источник и дата
- **112 и 103:** `content/now.yaml`, у проверенных строк ссылка на официальную публикацию и дата сверки

Как это обновляется:

1. Наблюдатели в pal-norms, pal-devices-data и pal-directory раз в неделю читают официальные публикации на publication.pravo.gov.ru и открытые данные Росздравнадзора
2. Служебные снимки (хеши, даты проверки) семьи не видят, они попадают в репо без ручной проверки. Всё, что меняет показанное семьям, приходит pull request с меткой `review:data`, `review:legal` или `review:medical` и ждёт человека
3. Раз в неделю `sync-data.yml` хаба забирает новые снимки с сайтов соседей и открывает pull request с меткой `review:data`
4. После слияния в `main` сайт пересобирается сам (`pages.yml`)

## Что пока не проверено

- Юрист и медик в России тексты ещё не проверяли. Юридические и медицинские страницы идут с плашкой «черновик, нужна проверка юристом (или медиком)»
- Номера регионов взяты из официальной таблицы, но звонком не проверялись
- Номер федеральной горячей линии помощи неизлечимо больным людям не сверен с мейнтейнером в России и показан со статусом «Не проверено»
- Всё, что не сверено с источником, помечено `verified: false` и так и показано на странице

## Как запустить у себя

Нужны [uv](https://docs.astral.sh/uv/) (Python 3.12 он поставит сам), Node 24 и pnpm

```sh
git clone https://github.com/openpalliative/openpalliative.github.io
cd openpalliative.github.io
uv sync --frozen
uv run python -m opsite build      # собрать _site/
sh scripts/serve-one               # открыть http://localhost:8700/
```

Все шесть сайтов вместе, как на GitHub Pages: склонируйте репо рядом в одну папку и запустите

```sh
sh scripts/serve-all               # собирает все репо и отдаёт на http://localhost:8080/
```

Для публикации подойдёт любой статический хостинг: содержимое `_site/` загружается как есть. Сервер и база данных не нужны

### Проверки

```sh
pnpm install --frozen-lockfile
sh scripts/gate.sh                 # ворота: pytest, сборка, opsite check, unit, e2e, скриншоты
pnpm test:e2e:browsers             # e2e в chromium, firefox и webkit (только headless)
pnpm test:e2e:all                  # обход sitemap всех шести сборок на 8080: ссылки, доступность, сеть
sh scripts/actionlint              # проверка workflows всех шести репо (actionlint и shellcheck с проверкой sha256)
sh scripts/lint-docs               # проверка README, CONTRIBUTING и шаблонов теми же правилами текста
```

### Общий UI и новые репо

- `opsite/` правится только здесь. После правки `uv run python -m opsite manifest`, потом `sh scripts/sync-ui-all` копирует его во все пять репо инструментов. В одном репо: `sh scripts/sync-ui`
- `sh scripts/sync-data` забирает снимки соседей в `vendor/`: локально из их `_site/`, с флагом `--from pages` с GitHub Pages
- `sh scripts/init-repo REPO PREFIX PORT "Название" "Что делает" [--pwa] [--draft legal|medical|both|none]` создаёт новый репо инструмента из `scripts/repo-template`: workflows, файлы сообщества, тесты, копия `opsite/`
- `sh scripts/labels --dry-run` печатает команды, которые создают все метки в шести репо

Как всё устроено: [ARCHITECTURE.md](ARCHITECTURE.md)

## Как помочь

- **Юристам:** сверить цитаты и сроки, pull request с меткой `review:legal`
- **Медикам:** проверить листы для дома и подписи, метка `review:medical`
- **Разработчикам:** задачи `good first issue`, доступность, тесты, печать
- **Всем:** прочитать страницу вслух человеку старше 60 и рассказать, где было непонятно
- **Нужен мейнтейнер в России:** юрист и разработчик. Чтобы проект не зависел от одного человека, нужно минимум двое. Подробнее на https://openpalliative.github.io/help-us/

Пожалуйста, не пишите в issues ФИО, диагнозы, адреса, телефоны и номера документов и не прикладывайте сканы, даже свои. Подробнее в [CONTRIBUTING.md](CONTRIBUTING.md), об уязвимостях в [SECURITY.md](SECURITY.md), правила общения в [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Вклад можно делать под псевдонимом

## Лицензия

- Код: [MIT](LICENSE)
- Тексты страниц и ситуаций: CC BY-SA 4.0, снимки соседей на их условиях, см. [LICENSE-DATA](LICENSE-DATA)
- Официальные тексты законов и приказов не охраняются авторским правом (п. 6 ст. 1259 ГК РФ)

### Сторонние лицензии

| Что | Где | Лицензия |
|---|---|---|
| Шрифт Onest | `opsite/ui/fonts/` | SIL Open Font License 1.1, текст в `opsite/ui/fonts/OFL.txt` |
| Иконки Lucide 1.48.0, только нужные, без изменений | `opsite/ui/icons/` | ISC, часть иконок из Feather (MIT), текст в `opsite/ui/icons/LICENSE` |
| Знак «Ладони и сердце» и логотипы openpalliative | `opsite/ui/brand/` | нарисованы для проекта, MIT вместе с кодом. Если разворачиваете копию под своим названием, поставьте свой знак, чтобы вашу копию не путали с проектом |
| Playwright и axe-core | только для тестов, в сайт не попадают | Apache 2.0 и MPL 2.0 |

## Важно

**Не медицинская консультация.** Сайт ничего не оценивает и не назначает. По вопросам лечения и обезболивания обращайтесь к лечащему врачу или в выездную паллиативную службу

**Не юридическая консультация.** Нормы и шаблоны помогают разобраться и составить документ, но не заменяют юриста. Рядом с каждым текстом указано, проверял ли его юрист

**Ни с кем не связаны.** Проект не связан с фондами, медицинскими организациями и государственными органами и не собирает деньги

**Сторонние ссылки** даны для удобства. Мы не отвечаем за их содержание и не связаны с их владельцами

---

## English

**openpalliative.github.io** is the hub of openpalliative: plain-language, open-source tools for families caring for a seriously ill person in Russia. It starts with "What happened?", leads to one of 10 situations with a short plan and the phone numbers for your region, and links to five tools: requests and complaints with legal deadlines, printable sheets for home, who provides medical devices, regional phone numbers, and official norms with verbatim quotes

- Static sites on GitHub Pages, no backend. What a person enters stays in their browser
- Every norm and phone number links to an official source and shows when it was checked. Unverified items are marked as such
- Not medical or legal advice. Not a helpline: in an emergency in Russia call 112
- This repo also holds `opsite`, the shared builder and UI used by all six sites
- Code MIT, texts CC BY-SA 4.0, see `LICENSE-DATA`. Onest font OFL 1.1, Lucide icons ISC
- We are looking for maintainers in Russia, a lawyer and a developer

Contributions are welcome without knowing Russian: accessibility, tests, offline support, printing, English docs. See [CONTRIBUTING.md](CONTRIBUTING.md)
