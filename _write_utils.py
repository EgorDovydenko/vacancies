content = r"""const STACK_KEYWORDS: string[] = [
  "react", "vue", "angular", "svelte", "next.js", "nuxt", "typescript", "javascript",
  "html", "css", "sass", "scss", "webpack", "vite", "rollup", "babel",
  "redux", "mobx", "zustand", "graphql", "apollo", "tailwind", "bootstrap",
  "styled-components", "jest", "cypress", "playwright", "storybook",
  "node.js", "express", "nestjs", "fastify", "koa",
  "python", "django", "flask", "fastapi",
  "golang", "gin", "echo", "fiber",
  "java", "spring", "php", "laravel", "symfony", "ruby", "rails", "rust",
  "c#", ".net", "postgresql", "postgres", "mysql", "mariadb", "sqlite",
  "mongodb", "redis", "elasticsearch", "clickhouse",
  "docker", "kubernetes", "k8s", "terraform", "aws", "gcp", "azure", "linux", "nginx",
  "react native", "flutter", "swift", "kotlin",
];

export function extractStack(...texts: string[]): string[] {
  const combined = texts.join(" ").toLowerCase();
  const found: string[] = [];
  for (const kw of STACK_KEYWORDS) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp("(?<![a-z0-9])" + escaped + "(?![a-z0-9])", "i");
    if (re.test(combined)) found.push(kw);
  }
  return found;
}

export function parseSalary(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, " ").trim();
  const rangeMatch = /([\d\s]{2,})\s*[-\u2013]\s*([\d\s]{2,})/i.exec(text);
  const singleMatch = /([\d]{3,}[\d\s]*)/i.exec(text);
  const currencyMatch = /(usd|eur|byn|rub|rur|kzt|amd|gel)/i.exec(text);
  const cur = (currencyMatch && currencyMatch[1]) ? currencyMatch[1].toUpperCase() : "";
  if (rangeMatch) {
    const from = (rangeMatch[1] || "").replace(/\s/g, "");
    const to = (rangeMatch[2] || "").replace(/\s/g, "");
    return (from + "-" + to + (cur ? " " + cur : "")).trim() || null;
  }
  if (singleMatch) {
    const val = (singleMatch[1] || "").replace(/\s/g, "");
    return (val + (cur ? " " + cur : "")).trim() || null;
  }
  return null;
}
"""

with open("src/utils.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("done, lines:", len(content.splitlines()))
