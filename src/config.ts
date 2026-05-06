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

/** Читает булеву переменную окружения. Любое значение кроме "false" считается true. */
function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw.trim().toLowerCase() !== "false";
}

export const config = {
  /** Telegram */
  get telegram() {
    return {
      botToken: requireEnv("TELEGRAM_BOT_TOKEN"),
      channelId: requireEnv("TELEGRAM_CHANNEL_ID"),
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

  /** Включённые источники вакансий */
  get sources() {
    return {
      rabotaby: boolEnv("SOURCE_RABOTABY", true),
      devby: boolEnv("SOURCE_DEVBY", true),
      habr: boolEnv("SOURCE_HABR", true),
      getmatch: boolEnv("SOURCE_GETMATCH", true),
    } as const;
  },
} as const;
