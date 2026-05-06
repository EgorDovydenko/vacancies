import { Pool } from "pg";
import { config } from "./config";
import logger from "./logger";

// ─── Пул подключений ─────────────────────────────────────────────────────────

let pool: Pool | null = null;

function getPool(): Pool {
  pool ??= new Pool({
    connectionString: config.database.url,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  });
  return pool;
}

// ─── Миграция: создание таблицы при первом запуске ───────────────────────────

async function ensureTable(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS published_vacancies (
      id          TEXT PRIMARY KEY,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Персистентное хранилище опубликованных вакансий на PostgreSQL.
 *
 * - Хранит пары id → published_at в таблице published_vacancies.
 * - Автоматически удаляет записи старше STORE_TTL_DAYS дней.
 * - Таблица создаётся автоматически при первом запуске (init).
 */
export class PublishedStore {
  /**
   * Инициализация: создаёт таблицу если не существует и удаляет устаревшие записи.
   * Вызывать один раз при старте приложения.
   */
  async init(): Promise<void> {
    try {
      await ensureTable();
      const removed = await this.purgeExpired();
      if (removed > 0) {
        logger.info(`PublishedStore: удалено устаревших записей: ${removed}`);
      }
      const total = await this.size;
      logger.info(
        `PublishedStore: инициализирован. Записей в БД: ${total} (TTL ${config.bot.storeTtlDays} д.)`,
      );
    } catch (err) {
      logger.error("PublishedStore: ошибка инициализации", err);
      throw err;
    }
  }

  // ─── TTL-очистка ───────────────────────────────────────────────────────────

  private async purgeExpired(): Promise<number> {
    const result = await getPool().query(
      `DELETE FROM published_vacancies
       WHERE published_at < NOW() - INTERVAL '1 day' * $1`,
      [config.bot.storeTtlDays],
    );
    return result.rowCount ?? 0;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async has(id: string): Promise<boolean> {
    const result = await getPool().query(
      "SELECT 1 FROM published_vacancies WHERE id = $1",
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async add(id: string): Promise<void> {
    await getPool().query(
      `INSERT INTO published_vacancies (id) VALUES ($1)
       ON CONFLICT (id) DO NOTHING`,
      [id],
    );
  }

  get size(): Promise<number> {
    return getPool()
      .query("SELECT COUNT(*) FROM published_vacancies")
      .then((r) => Number(r.rows[0].count));
  }

  /** Очищает всё хранилище (используется в npm run store:clear) */
  async clear(): Promise<void> {
    await getPool().query("DELETE FROM published_vacancies");
  }

  /** Закрывает пул подключений */
  async close(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
}
