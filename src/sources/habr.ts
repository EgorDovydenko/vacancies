import axios from "axios";
import * as cheerio from "cheerio";
import { ParsedVacancy, Source } from "../types";
import logger from "../logger";
import { config } from "../config";
import {
  BROWSER_HEADERS,
  sleep,
  detectWorkFormat,
  detectCategory,
  detectCountry,
} from "../scraper-utils";
import { SEARCH_QUERIES } from "../search-queries";

/**
 * Хабр Карьера — career.habr.com
 * Крупнейшая IT-площадка СНГ.
 *
 * Хабр — React SPA: HTML не содержит карточек вакансий, но вкладывает все
 * данные страницы как JSON в тег <script> (ключ `vacancies.list`).
 * Фильтрация по стране — через поле `locations` каждой вакансии.
 * Параметр locations[] в URL не работает — фильтруем на нашей стороне.
 */

const BASE_URL = "https://career.habr.com";

// ─── Типы JSON-данных Хабра ─────────────────────────────────────────────────

interface HabrSkill {
  title: string;
}
interface HabrLocation {
  title: string;
  href: string;
}
interface HabrCompany {
  title: string;
}
interface HabrSalary {
  from: number | null;
  to: number | null;
  currency: string | null;
  formatted: string;
}

interface HabrVacancy {
  id: number;
  href: string;
  title: string;
  company: HabrCompany | null;
  salary: HabrSalary | null;
  skills: HabrSkill[];
  locations: HabrLocation[];
  remoteWork: boolean;
  employment: string | null;
  publishedDate: string | null;
  qualification: string | null;
}

interface HabrPageData {
  vacancies?: {
    list: HabrVacancy[];
    meta: { totalResults: number; perPage: number; totalPages: number };
  };
}

// ─── Парсинг JSON из HTML ─────────────────────────────────────────────────────

function extractPageData(html: string): HabrPageData | null {
  const $ = cheerio.load(html);
  let result: HabrPageData | null = null;
  $("script").each((_i, el) => {
    if (result) return false; // уже нашли
    const content = $(el).html() ?? "";
    if (content.includes('"vacancies"') && content.length > 500) {
      try {
        result = JSON.parse(content) as HabrPageData;
      } catch {
        // не тот script
      }
    }
  });
  return result;
}

// ─── Форматирование зарплаты ─────────────────────────────────────────────────

function formatHabrSalary(s: HabrSalary | null): string | null {
  if (!s) return null;
  if (s.formatted) return s.formatted;
  if (!s.from && !s.to) return null;
  const cur = s.currency ?? "";
  if (s.from && s.to) return `${s.from}–${s.to} ${cur}`.trim();
  if (s.from) return `от ${s.from} ${cur}`.trim();
  if (s.to) return `до ${s.to} ${cur}`.trim();
  return null;
}

// ─── Обработка одного запроса ─────────────────────────────────────────────────

async function scrapeQuery(
  query: string,
  seenIds: Set<string>,
  maxCount: number,
): Promise<ParsedVacancy[]> {
  const url = `${BASE_URL}/vacancies?q=${encodeURIComponent(query)}&type=all&sort=date`;

  const { data: html } = await axios.get<string>(url, {
    headers: BROWSER_HEADERS,
    timeout: 15_000,
  });

  const pageData = extractPageData(html);
  if (!pageData?.vacancies) {
    logger.warn(`[habr.career] JSON не найден: ${url}`);
    return [];
  }

  const { list, meta } = pageData.vacancies;
  logger.info(
    `[habr.career] "${query}": всего ${meta.totalResults}, в выдаче ${list.length}`,
  );

  const results: ParsedVacancy[] = [];

  for (const v of list) {
    if (results.length >= maxCount) break;

    const sourceId = `habr_${v.id}`;
    if (seenIds.has(sourceId)) continue;
    seenIds.add(sourceId);

    const firstLocation = (v.locations ?? [])[0]?.title ?? null;
    const stack = (v.skills ?? []).slice(0, 5).map((s) => s.title);
    const workFormat = detectWorkFormat(
      [v.remoteWork ? "удалённо" : "", v.employment ?? ""].join(" "),
    );

    results.push({
      sourceId,
      title: v.title,
      company: v.company?.title ?? "Не указан",
      salary: formatHabrSalary(v.salary),
      stack,
      workFormat,
      country: detectCountry(firstLocation ?? ""),
      city: firstLocation,
      url: `${BASE_URL}${v.href}`,
      source: "habr.career",
      category: detectCategory(v.title),
      publishedAt: v.publishedDate ? new Date(v.publishedDate) : new Date(),
    });
  }

  return results;
}

// ─── Источник ─────────────────────────────────────────────────────────────────

export const habrSource: Source = {
  name: "habr.career",
  countries: ["BY", "RU", "GE", "AM", "KZ"],

  async scrapeAll(): Promise<ParsedVacancy[]> {
    const { requestDelayMs, maxVacanciesPerRun } = config.bot;
    const results: ParsedVacancy[] = [];
    const seenIds = new Set<string>();

    for (const [category, queries] of Object.entries(SEARCH_QUERIES)) {
      for (const query of queries) {
        try {
          logger.info(`[habr.career] ${category} / "${query}"`);
          const found = await scrapeQuery(query, seenIds, maxVacanciesPerRun);
          logger.info(`[habr.career] "${query}": найдено ${found.length}`);
          results.push(...found);
        } catch (err) {
          logger.error(`[habr.career] Ошибка "${query}": ${String(err)}`);
        }
        await sleep(requestDelayMs);
      }
    }

    return results;
  },
};
