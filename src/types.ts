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
  scrape(country: Country): Promise<ParsedVacancy[]>;
  /**
   * Опциональный метод для обогащения вакансии данными со страницы самой вакансии.
   * Вызывается после scrape() для каждой новой (ещё не опубликованной) вакансии.
   * Реализуется в парсере если нужные данные (стек, формат работы и т.д.)
   * доступны только на отдельной странице вакансии, а не в листинге.
   */
  enrichVacancy?(vacancy: ParsedVacancy): Promise<Partial<ParsedVacancy>>;
}
