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
  country: Country;
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
}
