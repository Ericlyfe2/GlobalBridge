import "server-only";

import type { Lang } from "./config";

type TranslationDict = Record<string, unknown>;

const cache = new Map<Lang, TranslationDict>();

async function loadLocale(lang: Lang): Promise<TranslationDict> {
  if (cache.has(lang)) return cache.get(lang)!;
  try {
    const dict = (await import(`./locales/${lang}.json`)) as TranslationDict;
    cache.set(lang, dict);
    return dict;
  } catch {
    const fallback = (await import(`./locales/en.json`)) as TranslationDict;
    return fallback;
  }
}

function resolveKey(obj: TranslationDict, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return path;
    current = (current as TranslationDict)[key];
  }
  return typeof current === "string" ? current : path;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

export function getTranslations(lang: Lang) {
  return {
    t: (key: string, params?: Record<string, string | number>) => {
      const dict = cache.get(lang);
      if (!dict) return key;
      const template = resolveKey(dict, key);
      return interpolate(template, params);
    },
    lang,
  };
}

export async function getServerTranslations(lang: Lang) {
  await loadLocale(lang);
  return getTranslations(lang);
}

export { loadLocale };
