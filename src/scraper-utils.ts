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
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
} as const;

/** Небloкирующая задержка */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ─── Формат работы ────────────────────────────────────────────────────────────

const REMOTE_RE = /удалённ|удалёнк|remote/i;
const HYBRID_RE = /гибрид|hybrid/i;

/**
 * Определяет формат работы по тексту.
 * Если не удалось определить явно — возвращает ["office"].
 */
export function detectWorkFormat(text: string): WorkFormat[] {
  const formats: WorkFormat[] = [];
  if (REMOTE_RE.test(text)) formats.push("remote");
  if (HYBRID_RE.test(text)) formats.push("hybrid");
  return formats.length > 0 ? formats : ["office"];
}

// ─── Категория вакансии ───────────────────────────────────────────────────────

const FRONTEND_RE =
  /frontend|фронтенд|front-end|\bvue\b|\breact\b|\bangular\b|\bsvelte\b/i;
const BACKEND_RE =
  /backend|бэкенд|back-end|\bphp\b|\bjava\b|\bpython\b|\bnode\.?js\b|\bgo\b|\bgolang\b|\bruby\b|\brust\b/i;

/**
 * Определяет категорию вакансии по заголовку.
 * При неоднозначности — fullstack.
 */
export function detectCategory(title: string): JobCategory {
  if (FRONTEND_RE.test(title)) return "frontend";
  if (BACKEND_RE.test(title)) return "backend";
  return "fullstack";
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
 * @param fallback - страна по умолчанию, если город не распознан
 */
export function detectCountry(
  locationText: string,
  fallback: Country = "BY",
): Country {
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
