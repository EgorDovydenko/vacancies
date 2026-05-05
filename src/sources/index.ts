import { hhSource } from "./hh";
import { rabotaBySource } from "./rabotaby";
import { devBySource } from "./devby";
import { habrSource } from "./habr";
import { Source } from "../types";
import { config } from "../config";

/**
 * Реестр всех источников вакансий.
 * Источник включается/отключается через переменные окружения SOURCE_HH, SOURCE_RABOTABY, SOURCE_DEVBY, SOURCE_HABR.
 */
export function getSources(): Source[] {
  const { hh, rabotaby, devby, habr } = config.sources;
  const sources: Source[] = [];
  if (hh) sources.push(hhSource);
  if (rabotaby) sources.push(rabotaBySource);
  if (devby) sources.push(devBySource);
  if (habr) sources.push(habrSource);
  return sources;
}
