// Типы данных, используемые по всему проекту

export type Country = "BY" | "RU" | "GE" | "AM" | "KZ";

export type WorkFormat = "remote" | "office" | "hybrid";

export type JobCategory = "frontend" | "backend" | "fullstack";

export interface Vacancy {
  /** Уникальный идентификатор (формируется как sourceId + source) */
  id: string;
  title: string;
  company: string;
  salary: string | null;
  stack: string[];
  workFormat: WorkFormat[];
  /** null — страна не определена (нестандартная локация: Ташкент, Лимасол и т.д.) */
  country: Country | null;
  city: string | null;
  url: string;
  source: string;
  category: JobCategory;
  publishedAt: Date;
}

export interface ParsedVacancy extends Omit<Vacancy, "id"> {
  sourceId: string;
}

export interface Source {
  name: string;
  countries: Country[];
  /**
   * Парсинг с фильтрацией по конкретной стране (hh.ru, rabota.by, dev.by).
   * Либо реализуется scrape(), либо scrapeAll() — не оба сразу.
   */
  scrape?(country: Country): Promise<ParsedVacancy[]>;
  /**
   * Парсинг без привязки к стране — один запрос на весь сайт,
   * страна определяется из данных самой вакансии (habr.career и аналоги).
   */
  scrapeAll?(): Promise<ParsedVacancy[]>;
  /**
   * Опциональный метод для обогащения вакансии данными со страницы самой вакансии.
   */
  enrichVacancy?(vacancy: ParsedVacancy): Promise<Partial<ParsedVacancy>>;
}
