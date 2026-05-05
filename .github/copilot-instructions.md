# Инструкции для GitHub Copilot — проект vacancies-bot

## Язык общения

Всегда общайся с пользователем **на русском языке**. Комментарии в коде — на русском.

---

## Описание проекта

Telegram-бот для автоматической публикации IT-вакансий из нескольких источников.
Целевые страны: **BY, RU, GE, AM, KZ**.
Категории вакансий: **frontend, backend, fullstack**.

---

## Стек технологий

| Слой         | Технология               |
| ------------ | ------------------------ |
| Язык         | TypeScript (strict mode) |
| Runtime      | Node.js                  |
| HTTP-клиент  | axios                    |
| HTML-парсинг | cheerio                  |
| Планировщик  | cron                     |
| Telegram API | node-telegram-bot-api    |
| Конфигурация | dotenv                   |
| Логирование  | winston (или аналог)     |
| Сборка       | tsc                      |
| Dev-режим    | ts-node + nodemon        |

---

## Архитектура

```
src/
  index.ts          — точка входа, запуск cron
  config.ts         — все переменные окружения (только здесь)
  publisher.ts       — основной цикл публикации
  formatter.ts       — форматирование сообщений для Telegram
  store.ts           — хранилище опубликованных вакансий (data/published.json)
  telegram.ts        — отправка в Telegram
  types.ts           — все типы и интерфейсы
  utils.ts           — parseSalary, extractStack
  scraper-utils.ts   — утилиты парсеров: detectWorkFormat, detectCountry, detectCategory, extractCity
  search-queries.ts  — централизованный реестр поисковых запросов по категориям
  sources/
    index.ts         — реестр источников (getSources)
    hh.ts            — hh.ru (REST API)
    rabotaby.ts      — rabota.by (HTML, движок hh.ru)
    devby.ts         — jobs.devby.io (HTML)
    habr.ts          — career.habr.com (JSON из <script> тега, React SPA)
    getmatch.ts      — getmatch.ru (REST API /api/offers, JSON)
data/
  published.json     — персистентное хранилище ID опубликованных вакансий
```

### Интерфейс Source (src/types.ts)

- `scrape(country)` — для источников с фильтрацией по стране (hh, rabota.by, dev.by)
- `scrapeAll()` — для источников без привязки к стране (habr.career): один прогон, страна определяется из данных вакансии
- `enrichVacancy(vacancy)` — опционально, обогащение данными со страницы вакансии

---

## Правила определения локации

Используй **только** функции из `src/scraper-utils.ts`:

- `detectCountry(text, fallback?)` — определяет страну по названию города из словаря `CITY_TO_COUNTRY`. Если город не найден — возвращает `null` (не подставлять дефолт BY!)
- `extractCity(text)` — извлекает название города из строки локации
- В форматтере: если `country === null` — показывать только 🌍 и город, **без флага и кода страны**

---

## Правила определения формата работы

Используй **только** `detectWorkFormat(text)` из `src/scraper-utils.ts`:

| Формат   | Ключевые слова                           |
| -------- | ---------------------------------------- |
| `remote` | удалённо, удалённый, дистанционн, remote |
| `hybrid` | гибридный формат, гибрид, hybrid         |
| `office` | на месте работодателя, в офисе, office   |

- Функция возвращает массив `WorkFormat[]` — один элемент может содержать несколько форматов одновременно
- Если ничего не распознано — возвращает `["office"]` по умолчанию

---

## Поисковые запросы

Все запросы хранятся **только** в `src/search-queries.ts`.
Никогда не дублируй списки запросов внутри парсеров.
Стратегия: поиск по одному ключевому слову (`"frontend"`, `"react"`) — платформы ищут по подстроке.

---

## Важные правила при работе с кодом

1. **Строгая типизация** — `strict: true` в tsconfig. Никаких `any`, `as any`, `!` (non-null assertion) без крайней необходимости.
2. **Конфигурация только через `config.ts`** — не читать `process.env` напрямую в других файлах.
3. **Логи через `logger`** — не использовать `console.log` в продакшн-коде.
4. **Дедупликация** — перед публикацией всегда проверять `store.has(sourceId)`.
5. **Guard от параллельных циклов** — флаг `cycleRunning` в `publisher.ts`, не удалять.
6. **Задержки между запросами** — всегда использовать `sleep(requestDelayMs)` между HTTP-запросами к сайтам.

---

## Управление временными файлами

- Временные и отладочные файлы называются с префикса `_` (например `_debug_habr.js`, `_check_habr.mjs`)
- **После завершения задачи** — удалять все файлы с префиксом `_` из корня проекта
- В `.gitignore` уже прописан паттерн `_*` для таких файлов
- Никогда не коммитить отладочные файлы

---

## Переменные окружения (.env)

- Если добавляешь новую переменную — обновляй манифест с учетом этого

```env
TELEGRAM_BOT_TOKEN=       # обязательно
TELEGRAM_CHANNEL_ID=      # обязательно
HH_API_TOKEN=             # опционально
PUBLISH_INTERVAL_MINUTES= # интервал cron, по умолч. 60
REQUEST_DELAY_MS=         # задержка между запросами, по умолч. 2000
MAX_VACANCIES_PER_RUN=    # лимит публикаций за цикл, по умолч. 5
STORE_TTL_DAYS=           # TTL записей в store, по умолч. 30
SOURCE_HH=true/false
SOURCE_RABOTABY=true/false
SOURCE_DEVBY=true/false
SOURCE_HABR=true/false
SOURCE_GETMATCH=true/false
```

---

## npm-скрипты

```bash
npm run dev          # запуск в dev-режиме (ts-node)
npm run dev:watch    # запуск с hot-reload (nodemon)
npm run build        # компиляция TypeScript
npm run start        # запуск скомпилированного кода
npm run store:clear  # очистить хранилище опубликованных вакансий
npm run store:show   # показать количество записей в store
```
