import { BROWSER_LANG_MAP, GEOLOCATION_LANG, SUPPORTED_LANGUAGES, type Lang } from "./config";

const CACHE_KEY = "gb-translations-cache";
const LANG_KEY = "gb-lang";
const COOKIE_NAME = "gb-lang";

export function detectBrowserLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const langs = navigator.languages ?? [navigator.language];
    for (const l of langs) {
      const mapped = BROWSER_LANG_MAP[l];
      if (mapped) return mapped;
    }
  } catch {}
  return null;
}

export function detectCountryLang(countryCode?: string): Lang | null {
  if (!countryCode) return null;
  return GEOLOCATION_LANG[countryCode.toUpperCase()] ?? null;
}

export function getSavedLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(LANG_KEY) as Lang | null;
    if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch {}
  return null;
}

export function saveLang(lang: Lang) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANG_KEY, lang);
    document.cookie = `${COOKIE_NAME}=${lang}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  } catch {}
}

export function getCookieLang(): Lang | null {
  if (typeof window === "undefined") {
    try {
      const { cookies } = require("next/headers");
      const cookieStore = cookies();
      const val = cookieStore.get(COOKIE_NAME)?.value as Lang | undefined;
      if (val && SUPPORTED_LANGUAGES.some((l) => l.code === val)) return val;
    } catch {}
    return null;
  }
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match) {
      const val = match[1] as Lang;
      if (SUPPORTED_LANGUAGES.some((l) => l.code === val)) return val;
    }
  } catch {}
  return null;
}

export function detectLanguage(preferredFromProfile?: Lang): Lang {
  const profile = preferredFromProfile;
  if (profile) return profile;
  const saved = getSavedLang();
  if (saved) return saved;
  const browser = detectBrowserLang();
  if (browser) return browser;
  return "en";
}

export async function saveLangToProfile(lang: Lang) {
  try {
    const { auth } = await import("@/lib/firebase");
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferred_language: lang }),
      });
    }
  } catch {}
}

export class TranslationCache {
  private memory = new Map<string, Map<string, string>>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, Record<string, string>>;
      for (const [lang, entries] of Object.entries(parsed)) {
        this.memory.set(lang, new Map(Object.entries(entries)));
      }
    } catch {}
  }

  private saveToStorage() {
    try {
      const obj: Record<string, Record<string, string>> = {};
      for (const [lang, entries] of this.memory) {
        obj[lang] = Object.fromEntries(entries);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch {}
  }

  get(lang: string, source: string): string | undefined {
    return this.memory.get(lang)?.get(source);
  }

  set(lang: string, source: string, translation: string) {
    if (!this.memory.has(lang)) this.memory.set(lang, new Map());
    this.memory.get(lang)!.set(source, translation);
    this.saveToStorage();
  }

  has(lang: string, source: string): boolean {
    return this.memory.get(lang)?.has(source) ?? false;
  }

  clear() {
    this.memory.clear();
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
  }
}

export const translationCache = new TranslationCache();
