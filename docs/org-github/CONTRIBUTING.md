# Как помочь openpalliative

Спасибо, что хотите помочь. Проект делают добровольцы, и любой вклад важен: исправленная опечатка, сверенная цитата, понятнее написанная фраза

Вклад можно делать под псевдонимом

[English below](#english)

## Сначала о приватности

Всё, что вы пишете в issues, pull request и обсуждениях, видят все. Поэтому:

- не пишите ФИО, диагнозы, адреса, телефоны и номера документов, даже свои
- не прикладывайте сканы, фото и тексты настоящих обращений, выписок и ответов
- не присылайте списки подопечных, пациентов или семей
- если в сообщение случайно попали личные данные, отредактируйте его или напишите мейнтейнерам через кнопку «Report content», мы скроем

Проект не ведёт учёт людей и не будет этого делать. Мы не принимаем функции, которые хранят данные о подопечных на сервере, собирают контакты, ведут карточки семей или работают как CRM. Всё, что вводит семья, остаётся в её браузере

## Кому что можно сделать

- **Юристу.** Сверить цитату нормы или срок ответа. Откройте issue «Ошибка в цитате» или «Ошибка в сроке» в репо pal-norms, приложите ссылку на официальную публикацию на publication.pravo.gov.ru и номер страницы скана. Pull request с меткой `review:legal` ждут именно вас
- **Медику.** Проверить, понятно ли и безопасно ли написаны листы для дома и подписи к изделиям. Pull request с меткой `review:medical`. Мы не пишем доз, порогов, названий препаратов и советов по лечению, и не просим их добавить
- **Переводчику.** Английская страница хаба `/en/` и разделы English в README. Интерфейс инструментов остаётся русским
- **Разработчику.** Задачи с меткой `good first issue`, доступность, тесты, печать, работа без интернета
- **Всем.** Прочитать страницу вслух человеку старше 60 и написать, где было непонятно. Это самый ценный вклад

## Как устроен проект

Шесть репо, каждый собирается в статический сайт для GitHub Pages:

| Репо | Что внутри |
|---|---|
| openpalliative.github.io | хаб: «Что случилось?», ситуации, «Сейчас», о проекте. Здесь же общий UI и сборщик `opsite/` |
| pal-norms | нормы, дословные цитаты, сроки ответа, календарь |
| pal-devices-data | кто выдаёт изделия и по какому документу |
| pal-directory | номера и адресаты по регионам |
| obrashchenie-kit | заявления и жалобы со сроками |
| home-care-kit | листы для дома и для скорой |

Внутри репо работа делится на зоны, чтобы правки не сталкивались:

- **данные:** `data/`, `pipeline/`, `raw/` и тесты данных
- **страницы:** `templates/`, `assets/`, `content/`, `lib/`, e2e и скриншоты
- **инфраструктура:** `.github/`, `README.md`, `docs/`, лицензии и эти файлы
- **общий UI:** папка `opsite/`. Её правят только в хабе

### Папка opsite/

`opsite/` в репо инструментов это копия из хаба. Не меняйте её там и не присылайте pull request с изменениями в `opsite/` в репо инструментов, такие правки потеряются при следующей синхронизации. Нужна правка общего UI, присылайте её в хаб. После слияния в хабе:

```sh
uv run python -m opsite manifest   # в хабе: поднимает версию и MANIFEST.sha256
sh scripts/sync-ui                 # в репо инструмента: забирает копию из ../openpalliative.github.io
```

`scripts/sync-ui-all` в хабе обновляет копию во всех пяти репо разом

### Ворота

Перед pull request прогоните в своём репо:

```sh
sh scripts/gate.sh
```

Это `uv sync`, `pnpm install`, pytest, сборка, `opsite check` (текст, ссылки, сеть, бюджеты), unit-тесты, e2e в headless-браузере и скриншоты. Pull request с красными воротами не сливаем. Для workflows в хабе есть `sh scripts/actionlint`

## Правила для данных и текста

- У каждой записи есть источник: официальная публикация на publication.pravo.gov.ru или открытые данные Росздравнадзора. Цитата нормы только дословно, с `eoNumber` и ссылкой
- То, что не сверено с источником, помечаем `verified: false`, и это видно на странице. Номера, коды, сроки и пункты не придумываем и не подставляем «по памяти»
- Юридические и медицинские тексты идут с плашкой «черновик, нужна проверка юристом (или медиком)»
- Без длинных тире (пишем `-`), эмодзи, восклицательных знаков и капса
- Без медицинских порогов, доз, названий препаратов и советов по лечению
- Без имитаций отказа от реанимации и других медицинских решений
- Пишем просто и по-человечески, для человека в стрессе: «вы», короткие фразы, следующий шаг
- Данные по территориям, которые линтер помечает правилом `territory`, не добавляем

`opsite check` и `uv run python -m opsite lint` ловят большую часть этого автоматически

## Как прислать правку

1. Форкните репо и сделайте ветку
2. Внесите правку в своей зоне и прогоните ворота
3. Откройте pull request и заполните чек-лист в шаблоне: источник, `verified`, нет личных данных
4. Если правка меняет то, что видят семьи (цитаты, сроки, номера, тексты листов), её посмотрит человек с меткой `review:legal`, `review:medical` или `review:data`

## Лицензия вклада

Отправляя pull request, вы соглашаетесь, что код распространяется по MIT, а тексты и данные на условиях LICENSE-DATA того репо, куда вы присылаете правку

Поведение в проекте: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Уязвимости: [SECURITY.md](SECURITY.md)

---

## English

openpalliative is a set of static sites with plain-language tools for families caring for a seriously ill person in Russia. The interface is in Russian, but you can help without knowing it

- **Privacy first.** Issues and pull requests are public. Never post names, diagnoses, addresses, phone numbers, document numbers or scans, even your own. No lists of patients or families. We do not accept CRM-like features or anything that stores data about people on a server
- **Zones.** `opsite/` (shared UI and site builder) is edited only in the hub repo `openpalliative.github.io`, then copied with `scripts/sync-ui`. Do not send pull requests that change `opsite/` in tool repos
- **Gate.** Run `sh scripts/gate.sh` before opening a pull request: pytest, build, text and link checks, unit tests, headless e2e
- **Facts.** Every norm, deadline and phone number needs an official source. Anything unverified stays `verified: false` and is shown as such. No doses, drug names or treatment advice
- **Ways to help.** Accessibility, tests, offline support, printing, English docs. Lawyers and medics in Russia: see the labels `review:legal` and `review:medical`

Code is MIT, texts and data follow `LICENSE-DATA`. Pseudonymous contributions are welcome
