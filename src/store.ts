import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "./config";
import logger from "./logger";

const DB_PATH = path.join(process.cwd(), "data", "published.json");

type StoreData = Record<string, number>; // id → unix timestamp (ms)

/**
 * Персистентное хранилище опубликованных вакансий.
 *
 * - Хранит пары `id → timestamp` в JSON-файле.
 * - Автоматически удаляет записи старше `STORE_TTL_DAYS` дней
 *   (устаревшие вакансии могут появиться снова — это нормально).
 * - Поддерживает миграцию из старого формата (массив строк).
 */
export class PublishedStore {
  private data: StoreData = {};

  constructor() {
    this.load();
  }

  // ─── Persistence ───────────────────────────────────────────────────────────

  private load(): void {
    try {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(DB_PATH)) return;

      const raw: unknown = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));

      // Автомиграция из старого формата (массив строк → Record<id, timestamp>)
      if (Array.isArray(raw)) {
        const now = Date.now();
        for (const id of raw as string[]) this.data[id] = now;
        logger.info(
          `PublishedStore: мигрировано ${raw.length} записей из старого формата`,
        );
      } else {
        this.data = raw as StoreData;
      }

      const before = this.size;
      this.purgeExpired();
      const removed = before - this.size;
      if (removed > 0)
        logger.info(`PublishedStore: удалено устаревших: ${removed}`);
      logger.info(
        `PublishedStore: загружено ${this.size} записей (TTL ${config.bot.storeTtlDays} д.)`,
      );
    } catch (err) {
      logger.error("PublishedStore: ошибка загрузки", err);
    }
  }

  private persist(): void {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      logger.error("PublishedStore: ошибка сохранения", err);
    }
  }

  // ─── TTL-очистка ───────────────────────────────────────────────────────────

  private purgeExpired(): void {
    const cutoff = Date.now() - config.bot.storeTtlDays * 24 * 60 * 60 * 1_000;
    for (const [id, ts] of Object.entries(this.data)) {
      if (ts < cutoff) delete this.data[id];
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  has(id: string): boolean {
    return id in this.data;
  }

  add(id: string): void {
    this.data[id] = Date.now();
    this.persist();
  }

  get size(): number {
    return Object.keys(this.data).length;
  }
}
