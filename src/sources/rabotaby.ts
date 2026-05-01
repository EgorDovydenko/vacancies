import axios from "axios";
import * as cheerio from "cheerio";
type Cheerio$ = ReturnType<typeof cheerio.load>;
import { ParsedVacancy, Country, JobCategory, Source } from "../types";
import logger from "../logger";
import { config } from "../config";
import { extractStack, parseSalary } from "../utils";
import {
  BROWSER_HEADERS,
  sleep,
  detectWorkFormat,
  detectCountry,
  extractCity,
} from "../scraper-utils";

// Языки вида "Английский — B2 — Средне-продвинутый" — не считаем стеком
const LANGUAGE_RE = /^[а-яёА-ЯЁ]+\s*—\s*(A1|A2|B1|B2|C1|C2)/i;

/** Загружает страницу вакансии и возвращает до 4 ключевых навыков (без языков) */
async function fetchVacancySkills(url: string): Promise<string[]> {
  try {
    const { data: html } = await axios.get<string>(url, {
      headers: BROWSER_HEADERS,
      timeout: 15_000,
    });
    const $ = cheerio.load(html);
    const skills: string[] = [];
    $("[data-qa='skills-element']").each((_i, el) => {
      if (skills.length >= 4) return false;
      const text = $(el).text().trim();
      if (text && !LANGUAGE_RE.test(text)) skills.push(text);
    });
    return skills;
  } catch {
    return [];
  }
}

// ─── Константы ────────────────────────────────────────────────────────────────

const BASE_URL = "https://rabota.by";

/**
 * industry=7 — IT/Интернет/Телеком на rabota.by (движок hh.ru).
 * Фильтрует нерелевантные сферы до выдачи результатов.
 */
const IT_INDUSTRY = "7";

/** Поисковые запросы по категориям */
const CATEGORIES: Record<JobCategory, string[]> = {
  frontend: [
    "frontend developer",
    "frontend разработчик",
    "react разработчик",
    "vue разработчик",
    "angular разработчик",
  ],
  backend: [
    "backend developer",
    "backend разработчик",
    "node.js разработчик",
    "php разработчик",
    "python разработчик",
    "golang разработчик",
  ],
  fullstack: ["fullstack developer", "fullstack разработчик"],
};

// ─── Парсинг карточки ─────────────────────────────────────────────────────────

interface CardData {
  sourceId: string;
  title: string;
  company: string;
  salary: string | null;
  stack: string[];
  location: string;
  cardText: string;
  url: string;
}

/** Извлекает данные из одного DOM-элемента карточки вакансии */
function parseCard($: Cheerio$, el: cheerio.Element): CardData | null {
  const $link = $(el);
  const title =
    $link.find("[data-qa='serp-item__title-text']").text().trim() ||
    $link.text().trim();
  const href = $link.attr("href") ?? "";

  if (!title || !href?.includes("/vacancy/")) return null;

  const idMatch = /\/vacancy\/(\d+)/.exec(href);
  if (!idMatch) return null;

  const $card = $link.closest("[data-qa='vacancy-serp__vacancy']");
  const company =
    $card
      .find("[data-qa='vacancy-serp__vacancy-employer-text']")
      .text()
      .trim() || $card.find("[data-qa='trusted-employer-link']").text().trim();
  const salaryRaw = $card
    .find("[data-qa='vacancy-serp__compensation']")
    .text()
    .trim();
  const location = $card
    .find("[data-qa='vacancy-serp__vacancy-address']")
    .text()
    .trim();
  const cardText = $card.text();

  return {
    sourceId: `rabotaby_${idMatch[1]}`,
    title,
    company: company || "Не указан",
    salary: parseSalary(salaryRaw) ?? parseSalary(cardText),
    stack: extractStack(title, cardText),
    location,
    cardText,
    url: `${BASE_URL}/vacancy/${idMatch[1]}`,
  };
}

// ─── Source ──────────────────────────────────────────────────────────────────

export const rabotaBySource: Source = {
  name: "rabota.by",
  countries: ["BY"],

  async scrape(_country: Country): Promise<ParsedVacancy[]> {
    const { requestDelayMs, maxVacanciesPerRun } = config.bot;
    const results: ParsedVacancy[] = [];
    const seenIds = new Set<string>();

    for (const [category, keywords] of Object.entries(CATEGORIES) as [
      JobCategory,
      string[],
    ][]) {
      for (const keyword of keywords) {
        try {
          logger.info(`[rabota.by] Парсинг: ${category} / "${keyword}"`);

          const url =
            `${BASE_URL}/search/vacancy?` +
            `text=${encodeURIComponent(keyword)}&industry=${IT_INDUSTRY}&sort=date`;

          const { data: html } = await axios.get<string>(url, {
            headers: BROWSER_HEADERS,
            timeout: 15_000,
          });

          const $ = cheerio.load(html);
          const cards: CardData[] = [];

          $("[data-qa='serp-item__title']").each((_i, el) => {
            if (cards.length >= maxVacanciesPerRun) return false;
            const card = parseCard($, el);
            if (!card || seenIds.has(card.sourceId)) return;
            seenIds.add(card.sourceId);
            cards.push(card);
          });

          for (const card of cards) {
            results.push({
              sourceId: card.sourceId,
              title: card.title,
              company: card.company,
              salary: card.salary,
              stack: card.stack,
              workFormat: detectWorkFormat(card.cardText),
              country: detectCountry(card.location, "BY"),
              city: extractCity(card.location, "Минск"),
              url: card.url,
              source: "rabota.by",
              category,
              publishedAt: new Date(),
            });
          }

          logger.info(
            `[rabota.by] ${category} / "${keyword}": найдено ${cards.length} вакансий`,
          );
        } catch (err) {
          logger.error(
            `[rabota.by] Ошибка при парсинге ${category} / "${keyword}": ${String(err)}`,
          );
        }
        await sleep(requestDelayMs);
      }
    }

    return results;
  },

  async enrichVacancy(vacancy: ParsedVacancy): Promise<Partial<ParsedVacancy>> {
    const skills = await fetchVacancySkills(vacancy.url);
    if (skills.length > 0) return { stack: skills };
    return {};
  },
};
