import { sources } from "./sources";
import { sendMessage } from "./telegram";
import { formatVacancy } from "./formatter";
import { PublishedStore } from "./store";
import { Vacancy, Country } from "./types";
import logger from "./logger";
import { sleep } from "./scraper-utils";

// ─── Константы ────────────────────────────────────────────────────────────────

/** Страны, по которым ищем вакансии */
const TARGET_COUNTRIES: readonly Country[] = ["BY", "RU", "GE", "AM", "KZ"];

/** Пауза между отправками в Telegram (избегаем rate-limit) */
const SEND_DELAY_MS = 3_000;

// ─── Singleton store ─────────────────────────────────────────────────────────

const store = new PublishedStore();

// ─── Публикация одной вакансии ────────────────────────────────────────────────

async function publishVacancy(vacancy: Vacancy, tag: string): Promise<void> {
  await sendMessage(formatVacancy(vacancy));
  store.add(vacancy.id);
  logger.info(
    `[${tag}] ✓ Опубликована: "${vacancy.title}" @ ${vacancy.company}`,
  );
  await sleep(SEND_DELAY_MS);
}

// ─── Обработка одного источника/страны ───────────────────────────────────────

async function processSource(
  source: (typeof sources)[number],
  country: Country,
): Promise<number> {
  const parsed = await source.scrape(country);
  const tag = `${source.name}/${country}`;
  logger.info(`[${tag}] Получено: ${parsed.length} вакансий`);

  let published = 0;

  for (const item of parsed) {
    if (store.has(item.sourceId)) {
      logger.debug(`[${tag}] Уже опубликована: ${item.sourceId}`);
      continue;
    }
    const vacancy: Vacancy = { ...item, id: item.sourceId };
    try {
      await publishVacancy(vacancy, tag);
      published++;
    } catch (err) {
      logger.error(`[${tag}] Ошибка отправки в Telegram: ${String(err)}`);
    }
  }

  return published;
}

// ─── Основной цикл ────────────────────────────────────────────────────────────

/**
 * Запускает полный цикл публикации:
 * обходит все источники × страны, публикует новые вакансии.
 */
export async function runPublishCycle(): Promise<void> {
  logger.info("═══ Запуск цикла публикации ═══");
  let total = 0;

  for (const source of sources) {
    for (const country of TARGET_COUNTRIES) {
      if (!source.countries.includes(country)) continue;
      try {
        total += await processSource(source, country);
      } catch (err) {
        logger.error(
          `[${source.name}/${country}] Критическая ошибка: ${String(err)}`,
        );
      }
    }
  }

  logger.info(
    `═══ Цикл завершён. Опубликовано: ${total}. В базе: ${store.size} ═══`,
  );
}
