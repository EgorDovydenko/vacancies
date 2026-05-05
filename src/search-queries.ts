/**
 * Централизованный реестр поисковых запросов по категориям.
 * Используется всеми источниками вакансий.
 *
 * Стратегия: поиск по одному ключевому слову/технологии.
 * Все платформы ищут по подстроке — "react" найдёт "react разработчик",
 * "react developer", "react-developer" и т.д. без лишних запросов.
 * Категория и релевантность фильтруются через detectCategory() по заголовку.
 */

import { JobCategory } from "./types";

export const SEARCH_QUERIES: Record<JobCategory, string[]> = {
  frontend: ["frontend", "react", "vue", "angular", "svelte"],

  backend: [
    "backend",
    "node.js",
    "python",
    "golang",
    "php",
    "java",
    "kotlin",
    "ruby",
    "rust",
  ],

  fullstack: ["fullstack", "full-stack"],
};
