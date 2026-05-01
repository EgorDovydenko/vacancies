import { Vacancy, WorkFormat, JobCategory } from "./types";

const COUNTRY_FLAGS: Record<string, string> = {
  BY: "🇧🇾",
  RU: "🇷🇺",
  GE: "🇬🇪",
  AM: "🇦🇲",
  KZ: "🇰🇿",
};

const CATEGORY_EMOJI: Record<JobCategory, string> = {
  frontend: "🎨",
  backend: "⚙️",
  fullstack: "🔗",
};

const FORMAT_LABEL: Record<WorkFormat, string> = {
  remote: "🌐 Удалёнка",
  office: "🏢 Офис",
  hybrid: "🔀 Гибрид",
};

/**
 * Форматирует вакансию в красивое Telegram-сообщение (HTML-разметка)
 */
export function formatVacancy(vacancy: Vacancy): string {
  const flag = COUNTRY_FLAGS[vacancy.country] ?? "";
  const catEmoji = CATEGORY_EMOJI[vacancy.category];
  const formats = vacancy.workFormat.map((f) => FORMAT_LABEL[f]).join(" | ");
  const salary = vacancy.salary ?? "не указана";
  const stack =
    vacancy.stack.length > 0
      ? vacancy.stack.map((s) => `<code>${s}</code>`).join(" | ")
      : "не указан";
  const city = vacancy.city ? ` · ${vacancy.city}` : "";

  return [
    `${catEmoji} <b>${escapeHtml(vacancy.title)}</b>`,
    ``,
    `🏢 <b>Компания:</b> ${escapeHtml(vacancy.company)}`,
    `💰 <b>Зарплата:</b> ${escapeHtml(salary)}`,
    `🛠 <b>Стек:</b> ${stack}`,
    `📍 <b>Локация:</b> ${flag} ${vacancy.country}${city}`,
    `📋 <b>Формат:</b> ${formats}`,
    ``,
    `🔗 <a href="${vacancy.url}">Откликнуться (${vacancy.source})</a>`,
    ``,
    `#${vacancy.category} #${vacancy.country.toLowerCase()} #${vacancy.source.replaceAll(/\W/g, "")}`,
  ].join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
