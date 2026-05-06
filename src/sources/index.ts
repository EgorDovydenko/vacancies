import { rabotaBySource } from "./rabotaby";
import { devBySource } from "./devby";
import { habrSource } from "./habr";
import { getmatchSource } from "./getmatch";
import { Source } from "../types";
import { config } from "../config";

/**
 * Реестр всех источников вакансий.
 * Источник включается/отключается через переменные окружения SOURCE_RABOTABY, SOURCE_DEVBY, SOURCE_HABR, SOURCE_GETMATCH.
 */
export function getSources(): Source[] {
  const { rabotaby, devby, habr, getmatch } = config.sources;
  const sources: Source[] = [];
  if (rabotaby) sources.push(rabotaBySource);
  if (devby) sources.push(devBySource);
  if (habr) sources.push(habrSource);
  if (getmatch) sources.push(getmatchSource);
  return sources;
}
