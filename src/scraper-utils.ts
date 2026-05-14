/**
 * Утилиты, общие для всех HTML-парсеров (scrapers).
 * Сюда выносится всё, что продублировано в hh.ts, rabotaby.ts, devby.ts.
 */

import { Country, JobCategory, WorkFormat } from "./types";

// ─── HTTP ─────────────────────────────────────────────────────────────────────

/** Стандартный User-Agent для HTML-запросов (эмуляция браузера) */
export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Cache-Control": "no-cache",
  "Upgrade-Insecure-Requests": "1",
} as const;

/** Небloкирующая задержка */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ─── Формат работы ────────────────────────────────────────────────────────────

// Фразы с rabota.by / hh.ru / dev.by:
//   "Формат работы: удалённо", "Можно удалённо", "удалённый формат", "remote"
//   "Формат работы: ... гибрид", "гибридный формат", "hybrid"
//   "Формат работы: на месте работодателя", "Работа на месте работодателя", "в офисе", "office"
const REMOTE_RE = /удал[её]нн|дистанционн|remote/i;
const HYBRID_RE = /гибридный\s+формат|гибрид|hybrid/i;
const OFFICE_RE_1 = /на\s+месте\s+работодателя/i;
const OFFICE_RE_2 = /в\s+офисе|\boffice\b/i;

/**
 * Определяет формат(ы) работы по тексту.
 * Поддерживает одновременно несколько форматов (через "или", "/", ",").
 * Если не удалось определить — возвращает ["office"].
 */
export function detectWorkFormat(text: string): WorkFormat[] {
  const formats: WorkFormat[] = [];
  if (OFFICE_RE_1.test(text) || OFFICE_RE_2.test(text)) formats.push("office");
  if (HYBRID_RE.test(text)) formats.push("hybrid");
  if (REMOTE_RE.test(text)) formats.push("remote");
  // Дефолт — офис (когда ничего не нашли, или явно указан офис)
  return formats.length > 0 ? formats : ["office"];
}

// ─── Категория вакансии ───────────────────────────────────────────────────────

const FRONTEND_RE =
  /frontend|фронтенд|front-end|\bvue\b|\breact\b|\bangular\b|\bsvelte\b/i;

const BACKEND_RE =
  /backend|бэкенд|back-end|\bphp\b|\bjava\b|\bpython\b|\bnode\.?js\b|\bgo\b|\bgolang\b|\bruby\b|\brust\b|\bscala\b|\bkotlin\b|\b\.net\b|\bc#\b|\bspring\b|\bdjango\b|\blaravel\b|\bexpress\b/i;

const FULLSTACK_RE =
  /fullstack|full-stack|фуллстек|фулл-стек/i;

const QA_RE =
  /\bqa\b|quality assurance|тестировщик|тестирование|test engineer|sdet|автотест|ручное тестирование|manual test|automation test|appium|selenium|cypress|playwright/i;

const DEVOPS_RE =
  /devops|dev-ops|sre\b|site reliability|infrastructure|инфраструктур|cloud engineer|platform engineer|\bdocker\b|\bkubernetes\b|\bk8s\b|\bterraform\b|\bansible\b|\bci\/cd\b|\bjenkins\b|\bhelm\b|\blinux admin\b/i;

const DESIGN_RE =
  /ui\/ux|ux\/ui|\bux\b|\bui\b|web design|веб-дизайн|дизайнер|designer|figma|graphic design|product design/i;

/**
 * Определяет категорию вакансии по заголовку.
 * Порядок проверок: специализированные категории → fullstack → other.
 */
export function detectCategory(title: string): JobCategory {
  if (DEVOPS_RE.test(title)) return "devops";
  if (QA_RE.test(title)) return "qa";
  if (DESIGN_RE.test(title)) return "design";
  if (FULLSTACK_RE.test(title)) return "fullstack";
  if (FRONTEND_RE.test(title)) return "frontend";
  if (BACKEND_RE.test(title)) return "backend";
  return "other";
}

// ─── Страна по городу ─────────────────────────────────────────────────────────

const CITY_TO_COUNTRY: ReadonlyMap<string, Country> = new Map([
  // BY
  ["минск", "BY"],
  ["брест", "BY"],
  ["гродно", "BY"],
  ["витебск", "BY"],
  ["гомель", "BY"],
  ["могилёв", "BY"],
  // RU
  ["москва", "RU"],
  ["санкт-петербург", "RU"],
  ["питер", "RU"],
  ["екатеринбург", "RU"],
  ["новосибирск", "RU"],
  ["казань", "RU"],
  ["нижний", "RU"],
  ["краснодар", "RU"],
  ["томск", "RU"],
  ["брянск", "RU"],
  ["воронеж", "RU"],
  ["самара", "RU"],
  ["уфа", "RU"],
  ["челябинск", "RU"],
  ["ростов", "RU"],
  ["пермь", "RU"],
  ["красноярск", "RU"],
  // KZ
  ["астана", "KZ"],
  ["алматы", "KZ"],
  ["алма-ата", "KZ"],
  ["нур-султан", "KZ"],
  ["шымкент", "KZ"],
  // GE
  ["тбилиси", "GE"],
  ["батуми", "GE"],
  // AM
  ["ереван", "AM"],
]);

/**
 * Определяет страну по строке с городом/локацией.
 * Возвращает null если город не распознан — вакансия из неизвестной локации.
 * @param fallback - явно задать дефолт (используется если источник точно знает страну)
 */
export function detectCountry(
  locationText: string,
  fallback: Country | null = null,
): Country | null {
  const lower = locationText.toLowerCase();
  for (const [city, country] of CITY_TO_COUNTRY) {
    if (lower.includes(city)) return country;
  }
  return fallback;
}

/**
 * Извлекает первый город из строки локации.
 * Пример: "Минск, Беларусь" → "Минск"
 */
export function extractCity(
  locationText: string,
  fallback = "Не указан",
): string {
  return locationText.split(",")[0]?.trim() || fallback;
}
