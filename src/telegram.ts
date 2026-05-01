import TelegramBot from "node-telegram-bot-api";
import { config } from "./config";
import logger from "./logger";

let bot: TelegramBot | null = null;

/** Возвращает singleton-экземпляр бота (lazy init). */
function getBot(): TelegramBot {
  if (!bot) {
    const { botToken } = config.telegram;
    // polling: false — бот только отправляет сообщения, не принимает
    bot = new TelegramBot(botToken, { polling: false });
    logger.info("Telegram-бот инициализирован");
  }
  return bot;
}

/** Отправляет HTML-сообщение в канал. */
export async function sendMessage(text: string): Promise<void> {
  const { channelId } = config.telegram;
  await getBot().sendMessage(channelId, text, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}
