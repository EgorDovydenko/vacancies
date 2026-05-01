/**
 * Общие утилиты для извлечения стека и зарплаты из текста вакансии.
 */

// Ключевые слова стека — порядок важен (более длинные фразы раньше)
const STACK_KEYWORDS: string[] = [
  // Multi-word first
  "react native",
  "next.js",
  "node.js",
  "styled-components",
  "github actions",
  "gitlab ci",
  // Frontend
  "react",
  "vue",
  "angular",
  "svelte",
  "nuxt",
  "typescript",
  "javascript",
  "html",
  "css",
  "sass",
  "scss",
  "webpack",
  "vite",
  "rollup",
  "babel",
  "redux",
  "mobx",
  "zustand",
  "graphql",
  "apollo",
  "tailwind",
  "bootstrap",
  "jest",
  "cypress",
  "playwright",
  "storybook",
  // Backend
  "express",
  "nestjs",
  "fastify",
  "koa",
  "hapi",
  "python",
  "django",
  "flask",
  "fastapi",
  "sqlalchemy",
  "golang",
  "gin",
  "echo",
  "fiber",
  "java",
  "spring",
  "hibernate",
  "php",
  "laravel",
  "symfony",
  "yii",
  "ruby",
  "rails",
  "rust",
  "actix",
  "c#",
  ".net",
  // Databases
  "postgresql",
  "postgres",
  "mysql",
  "mariadb",
  "sqlite",
  "mongodb",
  "redis",
  "elasticsearch",
  "clickhouse",
  "cassandra",
  "dynamodb",
  // DevOps
  "docker",
  "kubernetes",
  "k8s",
  "helm",
  "terraform",
  "ansible",
  "aws",
  "gcp",
  "azure",
  "nginx",
  "linux",
  // Mobile
  "flutter",
  "swift",
  "kotlin",
  "android",
  "ios",
  // Testing
  "selenium",
  "puppeteer",
];

/**
 * Нормализует текст: слэши/запятые/скобки заменяются пробелами,
 * чтобы "Python/Django", "React, TypeScript" корректно разбивались на токены.
 */
function normalizeText(text: string): string {
  return text
    .replace(/[/\\,;|()\[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Извлекает список технологий из произвольного набора текстов.
 */
export function extractStack(...texts: string[]): string[] {
  const combined = normalizeText(texts.join(" "));
  const found: string[] = [];
  const added = new Set<string>();
  for (const kw of STACK_KEYWORDS) {
    if (added.has(kw)) continue;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      "(?<![a-z0-9\\-])" + escaped + "(?![a-z0-9\\-])",
      "i",
    );
    if (re.test(combined)) {
      found.push(kw);
      added.add(kw);
    }
  }
  return found;
}

// Валюты: символы и текстовые коды
const CURRENCY_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\$/, label: "USD" },
  { re: /usd/i, label: "USD" },
  { re: /\u20ac|eur/i, label: "EUR" },
  { re: /byn/i, label: "BYN" },
  { re: /\u0431\u0435\u043b.*\u0440\u0443\u0431/i, label: "BYN" },
  { re: /\bBr\b/, label: "BYN" },
  { re: /\u20bd|\brub\b|\brur\b/i, label: "RUB" },
  { re: /\u0440\u0443\u0431/i, label: "RUB" },
  { re: /\u20b8|kzt/i, label: "KZT" },
  { re: /\u0442\u0435\u043d\u0433\u0435/i, label: "KZT" },
  { re: /\u20be|gel/i, label: "GEL" },
  { re: /\u058f|amd/i, label: "AMD" },
];

/**
 * Парсит строку зарплаты. Безопасно применять к полному тексту карточки:
 * без валюты (например, "Опыт 3-6 лет", "2024 год") вернёт null.
 *
 * Алгоритм: находим позицию валютного символа, затем ищем числа
 * в окне ±60 символов вокруг неё — это исключает "Опыт 3–6 лет" далеко
 * от "$" или "₽".
 */
export function parseSalary(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // 1. Найти позицию валюты в тексте
  let currency = "";
  let curPos = -1;
  for (const { re, label } of CURRENCY_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      currency = label;
      curPos = m.index;
      break;
    }
  }
  if (!currency) return null;

  // 2. Вырезаем окно вокруг валюты (60 символов в каждую сторону)
  const WIN = 60;
  const window = text.slice(Math.max(0, curPos - WIN), curPos + WIN);

  // Паттерн числа с возможными пробелами внутри: "900 000", "1 200 000"
  const NUM = "\\d[\\d\\s]{0,8}\\d|\\d{2,}";

  // 3. Ищем диапазон в окне: "900 000 – 1 200 000" / "1500-3000"
  const rangeRe = new RegExp(
    "(" + NUM + ")\\s*[-\u2013\u2014]\\s*(" + NUM + ")",
  );
  const rangeMatch = rangeRe.exec(window);
  if (rangeMatch) {
    const from = (rangeMatch[1] ?? "").replace(/\s/g, "");
    const to = (rangeMatch[2] ?? "").replace(/\s/g, "");
    // Фильтруем мусор вроде "3–6" (< 100) и одиночные годы (1900-2100 оба)
    const bothSmall = +from < 100 || +to < 100;
    const bothYear = +from > 1900 && +from < 2100 && +to > 1900 && +to < 2100;
    if (!bothSmall && !bothYear) {
      return from + "\u2013" + to + "\u00a0" + currency;
    }
  }

  // 4. Одиночное число в окне
  const numRe = new RegExp("(" + NUM + ")");
  const numMatch = numRe.exec(window);
  if (numMatch) {
    const val = (numMatch[1] ?? "").replace(/\s/g, "");
    if (!val || +val < 100) return null;
    // Признак "от"/"до" ищем в том же окне
    const hasFrom = /(?:^|\s)от(?:\s|$)|(?:^|\s)from(?:\s|$)/i.test(window);
    // "до вычета", "до уплаты", "до удержания" — не признак "до X"
    const hasTo = /(?:^|\s)до\s+\d|up to/i.test(window);
    const prefix = hasFrom ? "от\u00a0" : hasTo ? "до\u00a0" : "";
    return prefix + val + "\u00a0" + currency;
  }

  return null;
}
