<picture>
  <source media="(prefers-color-scheme: dark)" srcset="mark-dark.svg">
  <img src="mark-light.svg" width="72" height="72" alt="openpalliative">
</picture>

# openpalliative

Открытые инструменты для тех, кто ухаживает за тяжелобольным близким, и для хосписов и НКО, которые им помогают

*Open-source tools for families caring for a seriously ill person in Russia, and for the hospices and nonprofits that help them*

> **Это не служба помощи, здесь не ответят быстро.** Если человеку плохо прямо сейчас, звоните **112** или **103**. Номера горячих линий собраны на странице https://openpalliative.github.io/now/
>
> **Не медицинская и не юридическая консультация.** Инструменты помогают разобраться и составить документ. Решения принимают человек, врач и юрист

## С чего начать

Откройте https://openpalliative.github.io и выберите, что случилось. Сайт покажет короткий план, номера вашего региона и нужный инструмент. GitHub для этого не нужен, хватит браузера на телефоне

## Инструменты

| Инструмент | Что делает | Код |
|---|---|---|
| [Заявления и жалобы](https://openpalliative.github.io/obrashchenie-kit/) | Попросить ответ на бумаге, посчитать срок и понять следующий шаг | [obrashchenie-kit](https://github.com/openpalliative/obrashchenie-kit) |
| [Листы для дома](https://openpalliative.github.io/home-care-kit/) | Карта на ночь и праздники, лист для скорой, чек-лист выписки | [home-care-kit](https://github.com/openpalliative/home-care-kit) |
| [Кто выдаёт изделия](https://openpalliative.github.io/pal-devices-data/) | Аппараты, кровати, расходники и питание: кто выдаёт и по какому документу | [pal-devices-data](https://github.com/openpalliative/pal-devices-data) |
| [Куда звонить](https://openpalliative.github.io/pal-directory/) | Номера вашего региона с назначением, источником и датой проверки | [pal-directory](https://github.com/openpalliative/pal-directory) |
| [Нормы и сроки](https://openpalliative.github.io/pal-norms/) | Дословные цитаты из официальных публикаций, сроки ответа и куда обращаться дальше | [pal-norms](https://github.com/openpalliative/pal-norms) |

Хаб и общая платформа: [openpalliative.github.io](https://github.com/openpalliative/openpalliative.github.io)

## Как мы работаем

- **Без сервера.** То, что вводит семья, хранится только на её устройстве. Мы этого не видим
- **Официальные источники.** У каждой нормы и каждого номера ссылка на источник и дата проверки. Непроверенное так и подписано
- **Черновик, пока не проверил человек.** Юридические и медицинские тексты идут с плашкой «черновик», пока их не проверил юрист или медик в России
- **Открыто.** Код под MIT, тексты под CC BY-SA 4.0, данные на условиях их источников. Любой хоспис или НКО может развернуть сайты у себя
- **Просто.** Крупный текст, телефон, слабый интернет, печать на обычном принтере
- **Ни с кем не связаны.** Мы не фонд, не медицинская организация и не госорган. Денег не собираем

## Как помочь

- **Юристам в России:** сверить цитаты и сроки, метка `review:legal`
- **Врачам и медсёстрам:** проверить листы для дома и подписи, метка `review:medical`
- **Разработчикам:** доступность, тесты, работа без интернета, печать, метка `good first issue`
- **Всем:** прочитать страницу вслух человеку старше 60 и рассказать, где было непонятно
- **Ищем мейнтейнеров в России:** юриста и разработчика. Чтобы проект не зависел от одного человека, нужно минимум двое

Пожалуйста, не пишите в issues ФИО, диагнозы, адреса, телефоны и номера документов и не прикладывайте сканы, даже свои. Подробнее в [CONTRIBUTING](https://github.com/openpalliative/.github/blob/main/CONTRIBUTING.md). Вклад можно делать под псевдонимом

Проект не собирает деньги. Если хотите помочь деньгами, поддержите хоспис или фонд в своём регионе

---

## English

Plain-language, open-source tools for families caring for a seriously ill person in Russia: requests and complaints with legal deadlines, printable sheets for home, who provides medical devices, regional phone numbers, and official norms with verbatim quotes. Start at https://openpalliative.github.io

- **Not a helpline.** In an emergency in Russia call 112
- **Not medical or legal advice**
- **No backend.** Everything a family enters stays on their device
- **Official sources only.** Every norm and phone number links to its source and shows when it was checked. Unverified items are marked as such
- **Open licenses.** Code MIT, texts CC BY-SA 4.0, data on the terms of their sources
- **Independent.** Not affiliated with any foundation, healthcare provider or government body. We do not accept donations

You can help without knowing Russian: accessibility, tests, offline support, printing, English docs. See [CONTRIBUTING](https://github.com/openpalliative/.github/blob/main/CONTRIBUTING.md)
