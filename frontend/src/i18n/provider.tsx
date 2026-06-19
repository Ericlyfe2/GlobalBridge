"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DEFAULT_LANG, getLocalizedPath, isRtlLang, SUPPORTED_LANGUAGES, type Lang } from "./config";
import { detectLanguage, saveLang, saveLangToProfile } from "./utils";

type TranslationDict = Record<string, unknown>;

export type LocaleContextType = {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  dir: "ltr" | "rtl";
  translating: boolean;
  translations: TranslationDict;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
};

export const LocaleContext = createContext<LocaleContextType | null>(null);

async function loadLocale(lang: Lang): Promise<TranslationDict> {
  try {
    const dict = (await import(`./locales/${lang}.json`)) as TranslationDict;
    return dict;
  } catch {
    const fallback = (await import(`./locales/en.json`)) as TranslationDict;
    return fallback;
  }
}

const localeCache = new Map<Lang, TranslationDict>();
localeCache.set("en", {} as TranslationDict);

export function LocaleProvider({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? DEFAULT_LANG);
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState<TranslationDict>({});
  const loadedRef = useRef<Set<Lang>>(new Set());
  const router = useRouter();
  const pathname = usePathname();
  const initialisedRef = useRef(false);

  const loadAndCache = useCallback(async (target: Lang) => {
    if (loadedRef.current.has(target) && localeCache.has(target)) {
      setTranslations(localeCache.get(target)!);
      return;
    }
    setTranslating(true);
    try {
      const dict = await loadLocale(target);
      localeCache.set(target, dict);
      loadedRef.current.add(target);
      setTranslations(dict);
    } catch {
      const fallback = await loadLocale(DEFAULT_LANG);
      setTranslations(fallback);
    } finally {
      setTranslating(false);
    }
  }, []);

  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    const detected = detectLanguage(initialLang);
    setLangState(detected);
    loadAndCache(detected);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtlLang(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback(
    async (target: Lang) => {
      setLangState(target);
      saveLang(target);
      await loadAndCache(target);
      saveLangToProfile(target);
      const localizedPath = getLocalizedPath(pathname, target);
      if (localizedPath !== pathname) {
        router.replace(localizedPath);
      }
    },
    [loadAndCache, pathname, router]
  );

  const dir = useMemo<"ltr" | "rtl">(() => (isRtlLang(lang) ? "rtl" : "ltr"), [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      dir,
      translating,
      translations,
      availableLanguages: SUPPORTED_LANGUAGES,
    }),
    [lang, setLang, dir, translating, translations]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
