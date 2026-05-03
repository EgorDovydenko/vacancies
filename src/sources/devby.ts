import axios from "axios";
import * as cheerio from "cheerio";
import { ParsedVacancy, Country, Source } from "../types";
import logger from "../logger";
import { config } from "../config";
import { parseSalary } from "../utils";
import {
  BROWSER_HEADERS,
  sleep,
  detectWorkFormat,
  detectCategory,
  detectCountry,
} from "../scraper-utils";

/**
 * dev.by / jobs.devby.io — IT-площадка Беларуси
 * Сайт: https://jobs.devby.io
 * HTML-парсинг (публичный, без API-ключа).
 */

const BASE_URL = "https://jobs.devby.io";

/** Загружает страницу вакансии dev.by и возвращает обогащённые данные */
async function fetchVacancyDetails(
  url: string,
): Promise<Partial<ParsedVacancy>> {
  try {
    const { data: html } = await axios.get<string>(url, {
      headers: BROWSER_HEADERS,
      timeout: 15_000,
    });
    const $ = cheerio.load(html);

    // Стек — теги из блока .vacancy__tags
    const stack: string[] = [];
    $(".vacancy__tags a").each((_i, el) => {
      if (stack.length >= 4) return false;
      const t = $(el).text().trim();
      if (t) stack.push(t);
    });

    // Город из блока "Город: <значение>"
    let rawCity = "";
    $(".vacancy__info-block__item").each((_i, el) => {
      const label = $(el).clone().children().remove().end().text().trim();
      if (label.startsWith("Город:")) {
        rawCity = $(el).find(".vacancy__info-block__item-").text().trim();
        return false;
      }
    });

    // Режим работы
    let rawWorkMode = "";
    $(".vacancy__info-block__item").each((_i, el) => {
      const label = $(el).clone().children().remove().end().text().trim();
      if (label.startsWith("Режим работы:")) {
        rawWorkMode = $(el).find(".vacancy__info-block__item-").text().trim();
        return false;
      }
    });

    // Определяем страну и город
    const city = rawCity ? rawCity.split(",")[0]?.trim() : "";
    const country = detectCountry(rawCity);
    const workFormat = detectWorkFormat(rawWorkMode || $.root().text());

    return {
      ...(stack.length > 0 ? { stack } : {}),
      ...(city ? { city } : {}),
      ...(country === null ? {} : { country }),
      workFormat,
    };
  } catch {
    return {};
  }
}

export const devBySource: Source = {
  name: "dev.by",
  countries: ["BY"],

  async scrape(_country: Country): Promise<ParsedVacancy[]> {
    const { requestDelayMs, maxVacanciesPerRun } = config.bot;
    const results: ParsedVacancy[] = [];
    const seenIds = new Set<string>();

    const pageUrl = `${BASE_URL}/vacancies`;
    logger.info(`[dev.by] Парсинг: ${pageUrl}`);

    try {
      const { data: html } = await axios.get<string>(pageUrl, {
        headers: BROWSER_HEADERS,
        timeout: 15_000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(html);
      let count = 0;

      $("a.vacancies-list-item__link_block").each((_i, el) => {
        if (count >= maxVacanciesPerRun) return false;

        const $el = $(el);
        const href = $el.attr("href") ?? "";
        const title = $el.text().trim();
        if (!title || !href) return;

        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
        const idMatch = /\/vacancies\/(\d+)/.exec(href);
        const sourceId = `devby_${idMatch ? idMatch[1] : encodeURIComponent(href)}`;

        if (seenIds.has(sourceId)) return;
        seenIds.add(sourceId);

        const $card = $el.parent().parent();
        const company = $card
          .find(".vacancies-list-item__company")
          .first()
          .text()
          .trim();

        const cardText = $card.text();
        const rawSalary = $card
          .find(".vacancies-list-item__salary")
          .first()
          .text()
          .trim();
        const salary = parseSalary(rawSalary) ?? parseSalary(cardText);

        results.push({
          sourceId,
          title,
          company: company || "Не указан",
          salary: salary ?? null,
          stack: [], // будет заполнен в enrichVacancy
          workFormat: detectWorkFormat(cardText),
          country: null, // будет определена в enrichVacancy по городу
          city: null, // будет определён в enrichVacancy
          url: fullUrl,
          source: "dev.by",
          category: detectCategory(title),
          publishedAt: new Date(),
        });
        count++;
      });

      logger.info(`[dev.by] Найдено ${count} вакансий`);
      await sleep(requestDelayMs);
    } catch (err) {
      logger.error(`[dev.by] Ошибка при парсинге: ${String(err)}`);
    }

    return results;
  },

  async enrichVacancy(vacancy: ParsedVacancy): Promise<Partial<ParsedVacancy>> {
    return fetchVacancyDetails(vacancy.url);
  },
};
