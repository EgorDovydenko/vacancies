import axios from "axios";
import { ParsedVacancy, Source, WorkFormat, Country } from "../types";
import logger from "../logger";
import { config } from "../config";
import { sleep, detectCategory, detectCountry } from "../scraper-utils";

/**
 * GetMatch — getmatch.ru
 * Платформа для быстрого найма IT-специалистов (однодневные офферы).
 * Данные доступны напрямую через REST API без авторизации.
 *
 * Эндпоинт: GET https://getmatch.ru/api/offers?limit=N&offset=N
 * Страна определяется через location_requirements[].location_id (строковый ID).
 * Формат работы берётся из location_items[].format ("remote"/"office"/"hybrid").
 */

const BASE_URL = "https://getmatch.ru";
const API_URL = `${BASE_URL}/api/offers`;
const PAGE_SIZE = 50;

// ─── Словарь location_id → Country ───────────────────────────────────────────

const LOCATION_ID_TO_COUNTRY: Record<string, Country> = {
  russia: "RU",
  belarus: "BY",
  georgia: "GE",
  armenia: "AM",
  kazakhstan: "KZ",
};

// ─── Типы API ─────────────────────────────────────────────────────────────────

interface GetmatchLocationRequirement {
  location_id: string;
  format: string;
  exclude: boolean;
  /** Иерархия предков: ["moscow", "mo__russia", "russia", ...] */
  ancestors?: string[];
  city?: string;
  /** Человекочитаемое название страны на русском: "Россия", "Беларусь" и т.д. */
  country?: string;
}

interface GetmatchLocationItem {
  label: string;
  format: string;
  exclude: boolean;
}

interface GetmatchCompany {
  id: string | null;
  name: string;
  url: string;
}

interface GetmatchOffer {
  id: number;
  published_at: string;
  is_active: boolean;
  position: string;
  url: string;
  salary_hidden: boolean;
  salary_display_from: number | null;
  salary_display_to: number | null;
  salary_currency: string | null;
  /** Текстовое описание зарплаты — присутствует даже когда salary_hidden=true */
  salary_description: string | null;
  stack: string[];
  location_requirements: GetmatchLocationRequirement[];
  location_items: GetmatchLocationItem[];
  company: GetmatchCompany | null;
}

interface GetmatchResponse {
  meta: { total: number; offset: number; limit: number };
  offers: GetmatchOffer[];
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

/**
 * Определяет страну из location_requirements.
 * Порядок поиска:
 *   1. location_id напрямую (если совпадает со словарём, напр. "russia")
 *   2. ancestors[] — иерархия предков, один из них всегда содержит корневой ID страны
 *   3. Текстовое поле country (русскоязычное название) через detectCountry()
 */
function getCountry(locs: GetmatchLocationRequirement[]): Country | null {
  const included = locs.filter((l) => !l.exclude);
  for (const loc of included) {
    // 1. Прямое совпадение
    const direct = LOCATION_ID_TO_COUNTRY[loc.location_id];
    if (direct) return direct;

    // 2. Поиск по ancestors (напр. location_id="moscow__mo__russia", ancestors=["russia",...])
    for (const ancestor of loc.ancestors ?? []) {
      const fromAncestor = LOCATION_ID_TO_COUNTRY[ancestor];
      if (fromAncestor) return fromAncestor;
    }

    // 3. Текстовое поле country ("Россия", "Беларусь" и т.д.)
    if (loc.country) {
      const detected = detectCountry(loc.country);
      if (detected) return detected;
    }
  }
  return null;
}

/**
 * Определяет формат работы из location_items (массив форматов по всем локациям).
 * API возвращает "remote" / "office" / "hybrid" по-английски.
 */
function getWorkFormat(items: GetmatchLocationItem[]): WorkFormat[] {
  const formats = new Set<WorkFormat>();
  for (const item of items) {
    if (item.exclude) continue;
    const f = item.format?.toLowerCase();
    if (f === "remote") formats.add("remote");
    else if (f === "office") formats.add("office");
    else if (f === "hybrid") formats.add("hybrid");
  }
  return formats.size > 0 ? [...formats] : ["office"];
}

/**
 * Форматирует зарплату.
 * Приоритет:
 *   1. Числовые поля salary_display_from / salary_display_to (когда не скрыты)
 *   2. salary_description — текстовое описание, присутствует даже при salary_hidden=true
 *      (напр. "от 300 000 ₽/‍мес на руки")
 */
function formatSalary(offer: GetmatchOffer): string | null {
  const from = offer.salary_display_from;
  const to = offer.salary_display_to;
  const cur = offer.salary_currency ?? "";

  // Числовые поля приоритетнее текстовых
  if (from ?? to) {
    if (from && to)
      return `${from.toLocaleString("ru")}–${to.toLocaleString("ru")} ${cur}`.trim();
    if (from) return `от ${from.toLocaleString("ru")} ${cur}`.trim();
    if (to) return `до ${to.toLocaleString("ru")} ${cur}`.trim();
  }

  // Fallback: текстовое описание зарплаты (есть даже при salary_hidden=true)
  const desc = offer.salary_description?.trim();
  if (desc) return desc;

  return null;
}

/** Извлекает город из первой подходящей локации */
function getCity(locs: GetmatchLocationRequirement[]): string | null {
  const included = locs.filter((l) => !l.exclude);
  for (const loc of included) {
    const city = loc.city?.trim();
    if (city) return city;
  }
  return null;
}

// ─── Загрузка одной страницы ──────────────────────────────────────────────────

async function fetchPage(offset: number): Promise<GetmatchResponse> {
  const { data } = await axios.get<GetmatchResponse>(API_URL, {
    params: { limit: PAGE_SIZE, offset },
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "ru-RU,ru;q=0.9",
      Referer: "https://getmatch.ru/vacancies",
    },
    timeout: 15_000,
  });
  return data;
}

// ─── Источник ─────────────────────────────────────────────────────────────────

/** Целевые страны для фильтрации вакансий */
const TARGET_COUNTRIES = new Set<Country>(["BY", "RU", "GE", "AM", "KZ"]);

export const getmatchSource: Source = {
  name: "getmatch.ru",
  countries: ["BY", "RU", "GE", "AM", "KZ"],

  async scrapeAll(): Promise<ParsedVacancy[]> {
    const { requestDelayMs, maxVacanciesPerRun } = config.bot;
    const results: ParsedVacancy[] = [];
    const seenIds = new Set<string>();

    // Загружаем первую страницу, чтобы узнать total
    logger.info("[getmatch.ru] Начало парсинга");
    const firstPage = await fetchPage(0);
    const total = firstPage.meta.total;
    logger.info(`[getmatch.ru] Всего вакансий на платформе: ${total}`);

    const allOffers: GetmatchOffer[] = [...firstPage.offers];

    // Загружаем остальные страницы (ограничиваем разумным потолком)
    const maxPages = Math.min(Math.ceil(total / PAGE_SIZE), 10);
    for (let page = 1; page < maxPages; page++) {
      await sleep(requestDelayMs);
      try {
        const { offers } = await fetchPage(page * PAGE_SIZE);
        allOffers.push(...offers);
        logger.info(
          `[getmatch.ru] Страница ${page + 1}/${maxPages}: загружено ${offers.length}`,
        );
      } catch (err) {
        logger.error(`[getmatch.ru] Ошибка страницы ${page}: ${String(err)}`);
        break;
      }
    }

    logger.info(
      `[getmatch.ru] Загружено всего: ${allOffers.length} вакансий, фильтруем...`,
    );

    for (const offer of allOffers) {
      if (results.length >= maxVacanciesPerRun) break;
      if (!offer.is_active) continue;

      const sourceId = `getmatch_${offer.id}`;
      if (seenIds.has(sourceId)) continue;
      seenIds.add(sourceId);

      const country = getCountry(offer.location_requirements);

      // Пропускаем вакансии не из наших стран
      if (country !== null && !TARGET_COUNTRIES.has(country)) continue;

      const category = detectCategory(offer.position);
      const workFormat = getWorkFormat(offer.location_items);
      const stack = (offer.stack ?? []).slice(0, 6);
      const city = getCity(offer.location_requirements);

      results.push({
        sourceId,
        title: offer.position,
        company: offer.company?.name ?? "Не указана",
        salary: formatSalary(offer),
        stack,
        workFormat,
        country,
        city,
        url: `${BASE_URL}${offer.url}`,
        source: "getmatch.ru",
        category,
        publishedAt: offer.published_at
          ? new Date(offer.published_at)
          : new Date(),
      });
    }

    logger.info(`[getmatch.ru] Отобрано: ${results.length} вакансий`);
    return results;
  },
};
