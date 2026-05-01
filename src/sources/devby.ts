import axios from "axios";
import * as cheerio from "cheerio";
import { ParsedVacancy, Country, Source } from "../types";
import logger from "../logger";
import { config } from "../config";
import { extractStack, parseSalary } from "../utils";
import {
  BROWSER_HEADERS,
  sleep,
  detectWorkFormat,
  detectCategory,
} from "../scraper-utils";

/**
 * dev.by / jobs.devby.io — IT-площадка Беларуси
 * Сайт: https://jobs.devby.io
 * HTML-парсинг (публичный, без API-ключа).
 */

const BASE_URL = "https://jobs.devby.io";

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

        // Теги технологий, явно указанные на сайте
        const tagStack: string[] = [];
        $card
          .find(".vacancies-list-item__technology-tag__name")
          .each((_j, tag) => {
            const t = $(tag).text().trim();
            if (t) tagStack.push(t);
          });

        const cardText = $card.text();
        const detectedStack = extractStack(title, tagStack.join(" "), cardText);
        // Явные теги имеют приоритет над autodetect; если autodetect нашёл больше — берём его
        const stack =
          detectedStack.length >= tagStack.length ? detectedStack : tagStack;

        const rawSalary = $card
          .find(".vacancies-list-item__salary")
          .first()
          .text()
          .trim();
        const salary = parseSalary(rawSalary);

        results.push({
          sourceId,
          title,
          company: company || "Не указан",
          salary: salary ?? null,
          stack,
          workFormat: detectWorkFormat(cardText),
          country: "BY",
          city: "Минск",
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
};
