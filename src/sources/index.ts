import { hhSource } from "./hh";
import { rabotaBySource } from "./rabotaby";
import { devBySource } from "./devby";
import { Source } from "../types";

/**
 * Реестр всех источников вакансий.
 * Добавляй новые источники сюда — они автоматически подхватятся планировщиком.
 */
export const sources: Source[] = [
  hhSource, // hh.ru / hh.by / hh.kz / hh.am / hh.ge
  rabotaBySource, // rabota.by
  devBySource, // jobs.dev.by
];
