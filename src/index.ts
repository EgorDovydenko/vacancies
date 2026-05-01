import "dotenv/config";
import { CronJob } from "cron";
import { runPublishCycle } from "./publisher";
import { config } from "./config";
import logger from "./logger";

const { publishIntervalMinutes } = config.bot;

logger.info(
  `Запуск бота. Интервал публикации: каждые ${publishIntervalMinutes} мин`,
);

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
