import "dotenv/config";
import http from "node:http";
import { CronJob } from "cron";
import { runPublishCycle, initStore } from "./publisher";
import { config } from "./config";
import logger from "./logger";

const { publishIntervalMinutes } = config.bot;

// Минимальный HTTP-сервер для Render.com (требует открытый порт)
const port = process.env["PORT"] ?? 3000;
const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
});
server.listen(port, () => {
  logger.info(`Health-check сервер запущен на порту ${port}`);
});

// Запускаем бота после инициализации БД
async function main(): Promise<void> {
  logger.info(
    `Запуск бота. Интервал публикации: каждые ${publishIntervalMinutes} мин`,
  );

  // Инициализация БД (создание таблицы, очистка устаревших)
  await initStore();

  // Запускаем немедленно при старте
  void runPublishCycle();

  // Планировщик cron: каждые N минут
  const cronExpr = `*/${publishIntervalMinutes} * * * *`;
  logger.info(`Cron: ${cronExpr}`);

  const job = new CronJob(cronExpr, () => {
    void runPublishCycle();
  });
  job.start();

  logger.info("Планировщик запущен. Бот работает...");
}

main().catch((err: unknown) => {
  logger.error("Критическая ошибка при запуске бота", err);
  process.exit(1);
});
