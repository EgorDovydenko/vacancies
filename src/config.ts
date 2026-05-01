/**
 * Централизованная типизированная конфигурация приложения.
 * Все переменные окружения читаются только здесь.
 * Используются ленивые геттеры — чтение происходит при первом обращении,
 * после того как dotenv уже загружен в index.ts.
 */

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val)
    throw new Error(`Обязательная переменная окружения не задана: ${name}`);
  return val;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new TypeError(
      `Переменная ${name} должна быть целым числом, получено: "${raw}"`,
    );
  }
  return n;
}

export const config = {
  /** Telegram */
  get telegram() {
    return {
      botToken: requireEnv("TELEGRAM_BOT_TOKEN"),
      channelId: requireEnv("TELEGRAM_CHANNEL_ID"),
    } as const;
  },

  /** hh.ru API (опционально) */
  get hh() {
    return {
      apiToken: process.env["HH_API_TOKEN"],
      clientId: process.env["HH_CLIENT_ID"],
      clientSecret: process.env["HH_CLIENT_SECRET"],
    } as const;
  },

  /** Параметры работы бота */
  get bot() {
    return {
      publishIntervalMinutes: intEnv("PUBLISH_INTERVAL_MINUTES", 60),
      requestDelayMs: intEnv("REQUEST_DELAY_MS", 2_000),
      maxVacanciesPerRun: intEnv("MAX_VACANCIES_PER_RUN", 5),
      storeTtlDays: intEnv("STORE_TTL_DAYS", 30),
      logLevel: optionalEnv("LOG_LEVEL", "info"),
    } as const;
  },
} as const;
